import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { performWebSearch } from '../../utils/webSearch';
import { PolicyData } from '@/app/hooks/usePolicyChartData';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Get the assistant ID from environment variables
const ASSISTANT_ID = process.env.OPENAI_ASSISTANT_ID;

// In-memory cache for file ID to document name mapping
// In a real app, this would be stored in a database
const fileIdToDocumentMap = new Map<string, string>();

// Function to get file metadata and update the map
async function getFileMetadata(fileId: string): Promise<string> {
  // Check if we already have this file in our map
  if (fileIdToDocumentMap.has(fileId)) {
    return fileIdToDocumentMap.get(fileId) || fileId;
  }
  
  try {
    // Get file metadata from OpenAI
    const file = await openai.files.retrieve(fileId);
    const fileName = file.filename || fileId;
    
    // Store in our map for future use
    fileIdToDocumentMap.set(fileId, fileName);
    return fileName;
  } catch (error) {
    console.error(`Error retrieving file metadata for ${fileId}:`, error);
    return fileId; // Fallback to the file ID if we can't get the name
  }
}

// Function to create a brief description of the document section
function createBriefDescription(quote: string): string {
  if (!quote) return 'N/A';
  
  // Limit to 140 characters and add ellipsis if needed
  const maxLength = 140;
  if (quote.length <= maxLength) return quote;
  
  return quote.substring(0, maxLength - 3) + '...';
}

export async function POST(req: NextRequest) {
  try {
    const { threadId, message, vectorStoreId, useWebSearch } = await req.json();
    
    if (!threadId || !message) {
      return NextResponse.json(
        { error: 'Thread ID and message are required' },
        { status: 400 }
      );
    }
    
    if (!ASSISTANT_ID) {
      return NextResponse.json(
        { error: 'Assistant ID is not configured' },
        { status: 500 }
      );
    }
    
    // Check if the message contains custom chart data
    const messageContent = typeof message === 'string' ? message : message.content;
    const customChartData = typeof message === 'string' ? undefined : message.customChartData;
    
    // Add the user message to the thread
    await openai.beta.threads.messages.create(threadId, {
      role: 'user',
      content: messageContent,
    });
    
    // Run the assistant on the thread
    // Configure tools based on user preferences
    const runOptions: any = {
      assistant_id: ASSISTANT_ID,
    };
    
    // Add system instructions based on whether web search is enabled
    if (useWebSearch) {
      runOptions.instructions = `IMPORTANT: Web search is enabled for this query. You MUST prioritize information from the web over any documents that might be in the knowledge base. If the question can be answered using internet information, use ONLY that information and do NOT reference any uploaded documents. Only fall back to document search if the web search returns no relevant results or if the question specifically asks about internal documents.`;
    }
    
    // Configure tool resources
    const toolResources: any = {};
    
    // Add vector store if provided
    if (vectorStoreId) {
      toolResources.file_search = {
        vector_store_ids: [vectorStoreId]
      };
    }
    
    // Configure tools array
    const tools = [];
    
    // For web search, we need to use a function tool instead of 'web_search'
    if (useWebSearch) {
      // Add a custom function for web search
      tools.push({
        type: "function",
        function: {
          name: "search_web",
          description: "Search the web for current information",
          parameters: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "The search query"
              }
            },
            required: ["query"]
          }
        }
      });
    }
    
    // Only include file_search if we have a vector store AND web search is not enabled
    if (vectorStoreId && !useWebSearch) {
      tools.push({ type: "file_search" });
    }
    
    // Add code_interpreter for chart creation
    tools.push({ type: "code_interpreter" });
    
    // Only set tools if we have any
    if (tools.length > 0) {
      runOptions.tools = tools;
    }
    
    // Only set tool_resources if we have any AND web search is not enabled
    if (Object.keys(toolResources).length > 0 && !useWebSearch) {
      runOptions.tool_resources = toolResources;
    }
    
    const run = await openai.beta.threads.runs.create(threadId, runOptions);
    
    // Poll for the run to complete
    let runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
    
    while (runStatus.status !== 'completed' && runStatus.status !== 'failed') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
      
      // Handle case where more information is needed
      if (runStatus.status === 'requires_action') {
        if (runStatus.required_action?.type === 'submit_tool_outputs') {
          const toolCalls = runStatus.required_action.submit_tool_outputs.tool_calls;
          const toolOutputs = [];
          
          for (const toolCall of toolCalls) {
            if (toolCall.function.name === 'search_web') {
              try {
                // Parse the query
                const args = JSON.parse(toolCall.function.arguments);
                const query = args.query;
                
                // Use our web search utility to get real search results
                const searchResults = await performWebSearch(query);
                
                toolOutputs.push({
                  tool_call_id: toolCall.id,
                  output: searchResults
                });
              } catch (error) {
                console.error('Error processing web search:', error);
                toolOutputs.push({
                  tool_call_id: toolCall.id,
                  output: "Error performing web search. Please try again."
                });
              }
            }
          }
          
          // Submit the tool outputs back to the assistant
          if (toolOutputs.length > 0) {
            await openai.beta.threads.runs.submitToolOutputs(
              threadId,
              runStatus.id,
              { tool_outputs: toolOutputs }
            );
          }
        }
      }
    }
    
    if (runStatus.status === 'failed') {
      throw new Error('Assistant run failed');
    }
    
    // Get the latest messages
    const messages = await openai.beta.threads.messages.list(threadId);
    
    // Find the most recent assistant message
    const assistantMessages = messages.data.filter(msg => msg.role === 'assistant');
    const assistantMessage = assistantMessages.length > 0 ? assistantMessages[0] : null;
    
    if (!assistantMessage) {
      throw new Error('No assistant response found');
    }
    
    // Extract sources from annotations if they exist
    let sources: Array<{document: string, section: string, type?: string, description?: string} | null> = [];
    let content = '';
    let hasChartImage = false;
    let chartImageUrl = '';
    let webSearchUsed = false;
    let webSearchResults = false;
    
    if (assistantMessage.content && assistantMessage.content.length > 0) {
      // Check for image content (charts from code interpreter)
      const imageContent = assistantMessage.content.find(item => item.type === 'image_file');
      if (imageContent && 'image_file' in imageContent) {
        hasChartImage = true;
        chartImageUrl = imageContent.image_file.file_id;
      }
      
      const textContent = assistantMessage.content.find(item => item.type === 'text');
      
      if (textContent && 'text' in textContent) {
        content = textContent.text.value;
        
        // Check if web search was used by looking for specific patterns in the content
        if (useWebSearch) {
          webSearchUsed = true;
          
          // Check if there are web search results by looking for URLs in the content
          const urlRegex = /https?:\/\/[^\s)]+/g;
          webSearchResults = urlRegex.test(content);
          
          // Also check for web search indicators in the content
          if (!webSearchResults) {
            const webSearchIndicators = [
              "Web search results for",
              "Web Search Results for",
              "🌐 **Web Search Results",
              "retrieved from the web",
              "Source:",
              "search results",
              "county of santa clara",
              "county website",
              "official website"
            ];
            
            webSearchResults = webSearchIndicators.some(indicator => 
              content.toLowerCase().includes(indicator.toLowerCase())
            );
          }

          // Check for specific patterns that indicate a successful search
          if (!webSearchResults) {
            // Check if the content contains any factual information that would come from a search
            // This helps when the response doesn't explicitly mention web search but contains information
            const factualIndicators = [
              "secretary",
              "director",
              "department",
              "current",
              "is",
              "was appointed",
              "serves as",
              "position",
              "official"
            ];
            
            // If the content contains factual statements that would come from a search
            // and doesn't contain phrases indicating no results were found
            const hasFactualContent = factualIndicators.some(indicator => 
              content.toLowerCase().includes(indicator.toLowerCase())
            );
            
            const noResultsIndicators = [
              "no relevant results",
              "couldn't find",
              "could not find",
              "no results",
              "no information found"
            ];
            
            const hasNoResultsIndicator = noResultsIndicators.some(indicator => 
              content.toLowerCase().includes(indicator.toLowerCase())
            );
            
            // If we have factual content and no indicators of failed search
            if (hasFactualContent && !hasNoResultsIndicator) {
              webSearchResults = true;
            }
          }
          
          // Extract URLs from content to potentially add as sources
          if (webSearchResults) {
            // Simple regex to find URLs in the content
            const urlRegex = /https?:\/\/[^\s)]+/g;
            let match;
            const extractedUrls: string[] = [];
            
            // Extract all URLs from the content
            while ((match = urlRegex.exec(content)) !== null) {
              extractedUrls.push(match[0]);
            }
            
            if (extractedUrls.length > 0) {
              // Add unique URLs as sources if they don't already exist
              const existingSourceUrls = new Set(sources.map(s => s?.document).filter(Boolean));
              
              extractedUrls.forEach(url => {
                // Clean up URL if it has markdown formatting or trailing punctuation
                let cleanUrl = url;
                
                // Remove trailing punctuation that might be part of the text
                cleanUrl = cleanUrl.replace(/[.,;:!?]$/, '');
                
                // If URL is part of a markdown link, extract just the URL
                if (cleanUrl.endsWith(')') && !cleanUrl.includes('(')) {
                  cleanUrl = cleanUrl.slice(0, -1);
                }
                
                if (!existingSourceUrls.has(cleanUrl)) {
                  let domain = '';
                  try {
                    const urlObj = new URL(cleanUrl);
                    domain = urlObj.hostname.replace('www.', '');
                    
                    // Extract a title from the URL for better display
                    const pathParts = urlObj.pathname.split('/').filter(Boolean);
                    const lastPathPart = pathParts.length > 0 ? 
                      pathParts[pathParts.length - 1].replace(/-/g, ' ').replace(/\.(html|php|asp)$/, '') : 
                      domain;
                    
                    const sectionTitle = lastPathPart ? 
                      `Information from ${domain} - ${lastPathPart}` : 
                      `Information from ${domain}`;
                    
                    sources.push({
                      type: 'web',
                      document: cleanUrl,
                      section: sectionTitle,
                      description: `Web search result from ${domain}`
                    });
                    
                    existingSourceUrls.add(cleanUrl);
                  } catch (e) {
                    console.error('Invalid URL:', cleanUrl);
                  }
                }
              });
            }
            
            // If we still don't have any sources but we know there are web results,
            // add a generic web source
            if (sources.length === 0) {
              sources.push({
                type: 'web',
                document: 'https://www.google.com',
                section: 'Web Search Results',
                description: 'Information retrieved from web search'
              });
            }
          }
        }
        
        if (textContent.text.annotations) {
          // Process annotations and get file names
          const annotationsWithPromises = textContent.text.annotations
            .map(async annotation => {
              if (annotation.type === 'file_citation' && 'file_citation' in annotation) {
                const citedFile = annotation.file_citation;
                const fileId = citedFile.file_id;
                const quote = (citedFile as any).quote || 'N/A';
                
                // Get the document name for this file ID
                const documentName = await getFileMetadata(fileId);
                const briefDescription = createBriefDescription(quote);
                
                return {
                  document: documentName, // Use the actual document name
                  section: quote,
                  description: briefDescription,
                  type: 'file'
                };
              } else if (useWebSearch && annotation.type === 'file_path' && 'file_path' in annotation) {
                // This could be a web search result
                webSearchResults = true;
                return {
                  document: annotation.file_path.file_id,
                  section: 'Web Search Result',
                  description: 'Information retrieved from the web',
                  type: 'web'
                };
              }
              return null;
            })
            .filter(item => item !== null);
          
          // Wait for all the file metadata lookups to complete
          sources = await Promise.all(annotationsWithPromises);
        }
      }
    }
    
    return NextResponse.json({
      message: {
        role: 'assistant',
        content: content,
        sources,
        hasChartImage,
        chartImageUrl,
        webSearchUsed,
        webSearchResults,
        customChartData
      }
    });
    
  } catch (error) {
    console.error('Error processing message:', error);
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    );
  }
} 