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
  
  console.log('Creating brief description from quote:', quote.substring(0, 100) + '...');
  
  // Try to find a meaningful sentence or paragraph
  const sentences = quote.split(/[.!?]/).filter(s => s.trim().length > 0);
  
  if (sentences.length > 0) {
    // Use the first sentence if it's not too long
    const firstSentence = sentences[0].trim();
    if (firstSentence.length <= 140) {
      console.log('Using first sentence as description:', firstSentence);
      return firstSentence;
    }
  }
  
  // Limit to 140 characters and add ellipsis if needed
  const maxLength = 140;
  if (quote.length <= maxLength) {
    console.log('Using entire quote as description (within length limit)');
    return quote;
  }
  
  const truncated = quote.substring(0, maxLength - 3) + '...';
  console.log('Using truncated quote as description:', truncated);
  return truncated;
}

// Function to extract citation details from text
function extractCitationDetails(text: string): { 
  page?: string; 
  paragraph?: string; 
  citation?: string;
  chapter?: string;
  heading?: string;
  federalRegister?: string;
  regulation?: string;
  section?: string;
} {
  const details: { 
    page?: string; 
    paragraph?: string; 
    citation?: string;
    chapter?: string;
    heading?: string;
    federalRegister?: string;
    regulation?: string;
    section?: string;
  } = {};
  
  console.log('Extracting citation details from:', text.substring(0, 200) + '...');
  
  // Extract page numbers (various formats)
  const pageRegex = /(?:page|pg\.?|p\.?)\s*(\d+(?:-\d+)?)/i;
  const pageMatch = text.match(pageRegex);
  if (pageMatch) {
    details.page = pageMatch[1];
    console.log('Found page:', details.page);
  }
  
  // Extract paragraph numbers
  const paragraphRegex = /(?:paragraph|para\.?|¶)\s*(\d+(?:\.\d+)*)/i;
  const paragraphMatch = text.match(paragraphRegex);
  if (paragraphMatch) {
    details.paragraph = paragraphMatch[1];
    console.log('Found paragraph:', details.paragraph);
  }
  
  // Extract citation numbers (various formats)
  const citationRegex = /(?:citation|cite|ref\.?|§)\s*([A-Za-z0-9.-]+(?:\([^)]+\))?)/i;
  const citationMatch = text.match(citationRegex);
  if (citationMatch) {
    details.citation = citationMatch[1];
    console.log('Found citation:', details.citation);
  }
  
  // Extract chapter references
  const chapterRegex = /(?:Chapter|Ch\.?)\s*(\d+(?:[.-]\d+)*)/i;
  const chapterMatch = text.match(chapterRegex);
  if (chapterMatch) {
    details.chapter = chapterMatch[1];
    console.log('Found chapter:', details.chapter);
  }
  
  // Extract section references (like "Section 8-1" or just "8-1")
  const sectionRegex = /(?:(?:Section|Sec\.?)\s*)?(\d+[-\.]\d+(?:[-\.][A-Za-z0-9]+)*)/i;
  const sectionMatch = text.match(sectionRegex);
  if (sectionMatch) {
    details.section = sectionMatch[1];
    console.log('Found section:', details.section);
    
    // If we found a section but no citation, use the section as the citation
    if (!details.citation) {
      details.citation = details.section;
    }
  }
  
  // Extract section headings (Roman numerals or numbered sections)
  const headingRegex = /(?:^|\n)(?:([IVX]+\.)|(\d+\.\d+)|([A-Z][A-Za-z\s]+:))\s*([^\n.]+)/m;
  const headingMatch = text.match(headingRegex);
  if (headingMatch) {
    const prefix = headingMatch[1] || headingMatch[2] || headingMatch[3] || '';
    const title = headingMatch[4] || '';
    details.heading = `${prefix} ${title}`.trim();
    console.log('Found heading:', details.heading);
  } else {
    // Try to find any capitalized heading-like text
    const altHeadingRegex = /([A-Z][A-Z\s]{3,}[A-Z])/;
    const altHeadingMatch = text.match(altHeadingRegex);
    if (altHeadingMatch) {
      details.heading = altHeadingMatch[1];
      console.log('Found alt heading:', details.heading);
    }
  }
  
  // Extract regulation references (like 982.552(c)(2)(v))
  const regRegex = /(\d+\.\d+(?:\([a-z]\)(?:\(\d+\))*(?:\([a-z]+\))*)*)/i;
  const regMatch = text.match(regRegex);
  if (regMatch) {
    details.regulation = regMatch[1];
    console.log('Found regulation:', details.regulation);
  }
  
  // Extract Federal Register citations
  const frRegex = /(\d+)\s*Federal\s*Register\s*\/\s*Vol\.\s*(\d+),?\s*No\.\s*(\d+)\s*\/\s*([^\/]+)\/\s*([^\/]+)/i;
  const frMatch = text.match(frRegex);
  if (frMatch) {
    details.federalRegister = `${frMatch[1]} Federal Register / Vol. ${frMatch[2]}, No. ${frMatch[3]} / ${frMatch[4]} / ${frMatch[5]}`;
    console.log('Found Federal Register:', details.federalRegister);
  }
  
  return details;
}

// Function to extract section title from text
function extractSectionTitle(text: string): string | null {
  console.log('Extracting section title from:', text.substring(0, 200) + '...');
  
  // Look for common section patterns
  const sectionPatterns = [
    // Pattern: "Section X: Title" or "Section X - Title"
    /Section\s+([0-9.]+(?:\.[0-9]+)*)\s*[:-]\s*([^\n.]+)/i,
    
    // Pattern: "X. Title" (where X is a number or letter)
    /^([0-9A-Z]+)\.\s+([^\n.]+)/m,
    
    // Pattern: "Chapter X: Title"
    /Chapter\s+([0-9.]+(?:\.[0-9]+)*)\s*[:-]\s*([^\n.]+)/i,
    
    // Pattern: "Title X - Section Name"
    /Title\s+([0-9.]+(?:\.[0-9]+)*)\s*[:-]\s*([^\n.]+)/i,
    
    // Pattern: Heading with all caps
    /^([A-Z][A-Z\s]+[A-Z])[:\.\-\s]/m,
    
    // Pattern: "X-Y. Title" (section number with dash)
    /(\d+-\d+(?:\.\d+)*)\s*[\.:-]\s*([^\n.]+)/i,
    
    // Pattern: ALL CAPS HEADING
    /([A-Z][A-Z\s]{3,}[A-Z])/
  ];
  
  for (const pattern of sectionPatterns) {
    const match = text.match(pattern);
    if (match) {
      // If the pattern has two capture groups, it's a section number + title
      if (match[2]) {
        const result = `${match[1]}: ${match[2]}`.trim();
        console.log('Found section title with pattern:', pattern, 'Result:', result);
        return result;
      } else if (match[1]) {
        // Just return the matched heading
        console.log('Found section title with pattern:', pattern, 'Result:', match[1]);
        return match[1].trim();
      }
    }
  }
  
  // If no patterns match, try to find the first sentence or meaningful text
  const firstSentenceMatch = text.match(/^([^.!?]+[.!?])/);
  if (firstSentenceMatch) {
    const firstSentence = firstSentenceMatch[1].trim();
    if (firstSentence.length < 100) { // Only use if it's reasonably short
      console.log('Using first sentence as section title:', firstSentence);
      return firstSentence;
    }
  }
  
  console.log('No section title found');
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const { threadId, message, vectorStoreId, useWebSearch, customChartData } = await req.json();
    
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
    } else if (vectorStoreId) {
      // Add specific instructions for document search with detailed citation requirements
      runOptions.instructions = `IMPORTANT: YOU MUST USE THE FILE_SEARCH TOOL FOR THIS QUERY. DO NOT ANSWER FROM YOUR TRAINING DATA.

Please search through the uploaded documents to answer this query. Use the file_search tool to find relevant information in the documents. 

When citing sources from documents, you MUST include as much of the following citation information as possible:

1. For Administrative Plans, SOPs, and policy documents:
   - Chapter numbers (e.g., "Chapter 8")
   - Section headings (e.g., "V. Owner and Family Responsibility")
   - Section references (e.g., "8-1")
   - Page numbers (e.g., "Page 3")
   - Paragraph numbers if available

2. For Federal Register citations:
   - Complete citation (e.g., "65770 Federal Register / Vol. 89, No. 156 / Tuesday, August 13, 2024 / Rules and Regulations")

3. For regulations and code references:
   - Regulation numbers with all subsections (e.g., "982.552(c)(2)(v)" or "982.553(e)")

4. For all documents:
   - Include the document title
   - Include the exact quote that contains the information
   - If the document has a table of contents or index, reference the appropriate section

Format your citations clearly and consistently. This detailed citation information is CRITICAL for users to locate the exact information in the original documents. Always err on the side of providing more citation details rather than fewer.

IMPORTANT: You MUST use file_search tool for EVERY query about documents. Even if you think you know the answer, you should still search the documents to provide accurate citations. If you don't use the file_search tool, your response will be incomplete.

If you cannot find relevant information in the documents, please inform the user that the information could not be found in the uploaded documents.`;

      console.log('Added detailed file search instructions to the run');
    }
    
    // Configure tool resources
    const toolResources: any = {};
    
    // Add vector store if provided
    if (vectorStoreId) {
      console.log(`Using vector store ID: ${vectorStoreId}`);
      toolResources.file_search = {
        vector_store_ids: [vectorStoreId]
      };
    } else {
      console.log('No vector store ID provided');
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
      console.log('Added file_search tool');
    }
    
    // Add code_interpreter for chart creation
    tools.push({ type: "code_interpreter" });
    
    // Only set tools if we have any
    if (tools.length > 0) {
      runOptions.tools = tools;
      console.log('Configured tools:', JSON.stringify(tools));
    }
    
    // Only set tool_resources if we have any AND web search is not enabled
    if (Object.keys(toolResources).length > 0 && !useWebSearch) {
      runOptions.tool_resources = toolResources;
      console.log('Set tool_resources:', JSON.stringify(toolResources));
    } else {
      console.log('No tool_resources set. vectorStoreId:', vectorStoreId, 'useWebSearch:', useWebSearch);
    }
    
    // If we have a vector store ID and web search is not enabled, force a file search first
    if (vectorStoreId && !useWebSearch) {
      try {
        console.log('Forcing a file search before answering...');
        
        // Create a message that explicitly asks for a file search
        await openai.beta.threads.messages.create(threadId, {
          role: 'user',
          content: 'Please search the uploaded documents for information related to my question. Use the file_search tool to find relevant information.',
        });
        
        // Run a quick search to prime the assistant
        const searchRun = await openai.beta.threads.runs.create(threadId, {
          assistant_id: ASSISTANT_ID,
          instructions: "Run a file search for relevant documents before answering the user's question. Use the file_search tool to find information.",
          tools: [{ type: "file_search" }],
          // Use type assertion to avoid TypeScript errors
        } as any);
        
        console.log('Created search run with ID:', searchRun.id);
        
        // Wait for the search run to complete
        let searchRunStatus = await openai.beta.threads.runs.retrieve(threadId, searchRun.id);
        
        while (searchRunStatus.status !== 'completed' && searchRunStatus.status !== 'failed') {
          await new Promise(resolve => setTimeout(resolve, 1000));
          searchRunStatus = await openai.beta.threads.runs.retrieve(threadId, searchRun.id);
          console.log('Search run status:', searchRunStatus.status);
        }
        
        console.log('Search run completed with status:', searchRunStatus.status);
        
        // Delete the search message so it doesn't appear in the chat
        const messages = await openai.beta.threads.messages.list(threadId);
        const searchMessage = messages.data.find(msg => 
          msg.role === 'user' && 
          msg.content[0].type === 'text' && 
          (msg.content[0] as any).text.value.includes('Please search the uploaded documents')
        );
        
        if (searchMessage) {
          await openai.beta.threads.messages.del(threadId, searchMessage.id);
          console.log('Deleted search message');
        }
        
        // Also delete any assistant response to the search message
        const assistantSearchResponse = messages.data.find(msg => 
          msg.role === 'assistant' && 
          msg.created_at > (searchMessage?.created_at || 0)
        );
        
        if (assistantSearchResponse) {
          await openai.beta.threads.messages.del(threadId, assistantSearchResponse.id);
          console.log('Deleted assistant search response');
        }
      } catch (searchError) {
        console.error('Error forcing file search:', searchError);
      }
    }
    
    try {
      const run = await openai.beta.threads.runs.create(threadId, runOptions);
      console.log('Created run with ID:', run.id);
      
      // Check if the run has the file_search tool configured
      if (vectorStoreId && !useWebSearch) {
        const runDetails = await openai.beta.threads.runs.retrieve(threadId, run.id);
        console.log('Run tools:', JSON.stringify(runDetails.tools));
        
        // Use type assertion to access tool_resources
        const runDetailsAny = runDetails as any;
        console.log('Run tool resources:', JSON.stringify(runDetailsAny.tool_resources));
        
        // Check if file_search is in the tools
        const hasFileSearchTool = runDetails.tools.some((tool: any) => tool.type === 'file_search');
        
        if (!hasFileSearchTool) {
          console.warn('Run does not have file_search tool configured!');
        }
        
        // Check if vector store ID is in the tool resources
        if (!runDetailsAny.tool_resources?.file_search?.vector_store_ids?.includes(vectorStoreId)) {
          console.warn(`Run does not have the correct vector store ID (${vectorStoreId}) configured!`);
        }
      }
      
      // Poll for the run to complete
      let runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
      
      // Track if file_search was used
      let fileSearchUsed = false;
      
      while (runStatus.status !== 'completed' && runStatus.status !== 'failed') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
        
        // Check for file_search tool usage in the run steps
        if (!fileSearchUsed && vectorStoreId && !useWebSearch) {
          try {
            const runSteps = await openai.beta.threads.runs.steps.list(threadId, run.id);
            
            // Check if any step used the file_search tool
            for (const step of runSteps.data) {
              if (step.step_details && 'tool_calls' in step.step_details) {
                const toolCalls = step.step_details.tool_calls;
                for (const toolCall of toolCalls) {
                  if (toolCall.type === 'file_search') {
                    fileSearchUsed = true;
                    console.log('File search tool was used in the run!');
                    break;
                  }
                }
              }
              
              if (fileSearchUsed) break;
            }
          } catch (stepsError) {
            console.error('Error checking run steps:', stepsError);
          }
        }
        
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
        console.error('Assistant run failed with error:', runStatus.last_error);
        throw new Error(`Assistant run failed: ${runStatus.last_error?.message || 'Unknown error'}`);
      }
      
      // Get the assistant's messages
      const messages = await openai.beta.threads.messages.list(threadId);
      
      // Find the most recent assistant message
      const assistantMessage = messages.data.find(msg => msg.role === 'assistant');
      
      if (!assistantMessage) {
        console.error('No assistant message found in thread');
        throw new Error('No assistant response found');
      }
      
      console.log('Assistant message received:', JSON.stringify(assistantMessage, null, 2));
      
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
            console.log('Found annotations in response:', JSON.stringify(textContent.text.annotations));
            
            const annotationsWithPromises = textContent.text.annotations
              .map(async annotation => {
                if (annotation.type === 'file_citation' && 'file_citation' in annotation) {
                  const citedFile = annotation.file_citation;
                  const fileId = citedFile.file_id;
                  const quote = (citedFile as any).quote || 'N/A';
                  
                  console.log('Processing file citation:', fileId);
                  console.log('Citation quote:', quote);
                  
                  // Get the document name for this file ID
                  const documentName = await getFileMetadata(fileId);
                  const briefDescription = createBriefDescription(quote);
                  
                  // Extract citation details from the quote
                  const citationDetails = extractCitationDetails(quote);
                  
                  // Try to extract a section title
                  let extractedSectionTitle = extractSectionTitle(quote);
                  
                  // Special handling for specific document formats
                  if (documentName.includes('2024-17957') || documentName.match(/\d{4}-\d{5}\.pdf/)) {
                    console.log('Detected Federal Register document format');
                    
                    // Try to extract Federal Register citation details
                    const frNumberMatch = documentName.match(/(\d{4}-\d{5})/);
                    if (frNumberMatch) {
                      // This is likely a Federal Register document
                      const frNumber = frNumberMatch[1];
                      
                      // Look for page numbers in the quote
                      const pageMatch = quote.match(/(\d{5})\s*Federal\s*Register/i) || 
                                        quote.match(/page\s*(\d+)/i) ||
                                        quote.match(/^(\d{5})/m);
                      
                      const page = pageMatch ? pageMatch[1] : '';
                      
                      // Try to extract a section title from the quote
                      const sectionMatch = quote.match(/([A-Z][A-Z\s]+[A-Z])/);
                      const section = sectionMatch ? sectionMatch[1] : '';
                      
                      // Create citation details
                      citationDetails.citation = frNumber;
                      if (page) citationDetails.page = page;
                      
                      // Create a section title
                      let frSectionTitle = '';
                      if (section) {
                        frSectionTitle = section;
                      } else if (page) {
                        frSectionTitle = `Federal Register ${frNumber}, Page ${page}`;
                      } else {
                        frSectionTitle = `Federal Register ${frNumber}`;
                      }
                      
                      console.log('Created Federal Register section title:', frSectionTitle);
                      extractedSectionTitle = frSectionTitle;
                    }
                  }
                  
                  // If we don't have a section title or citation details, try to extract them from the content
                  if (!extractedSectionTitle && !citationDetails.chapter && !citationDetails.section && !citationDetails.heading) {
                    // Look for references to this document in the content
                    const docNameEscaped = documentName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const docRefRegex = new RegExp(`(${docNameEscaped}[^.!?]*(?:[.!?][^.!?]*){0,2})`, 'i');
                    const docRefMatch = content.match(docRefRegex);
                    
                    if (docRefMatch) {
                      console.log('Found document reference in content:', docRefMatch[1]);
                      // Extract citation details from the reference
                      const contentCitationDetails = extractCitationDetails(docRefMatch[1]);
                      
                      // Merge the citation details
                      if (contentCitationDetails.page && !citationDetails.page) {
                        citationDetails.page = contentCitationDetails.page;
                      }
                      if (contentCitationDetails.paragraph && !citationDetails.paragraph) {
                        citationDetails.paragraph = contentCitationDetails.paragraph;
                      }
                      if (contentCitationDetails.citation && !citationDetails.citation) {
                        citationDetails.citation = contentCitationDetails.citation;
                      }
                      if (contentCitationDetails.chapter && !citationDetails.chapter) {
                        citationDetails.chapter = contentCitationDetails.chapter;
                      }
                      if (contentCitationDetails.heading && !citationDetails.heading) {
                        citationDetails.heading = contentCitationDetails.heading;
                      }
                      if (contentCitationDetails.federalRegister && !citationDetails.federalRegister) {
                        citationDetails.federalRegister = contentCitationDetails.federalRegister;
                      }
                      if (contentCitationDetails.regulation && !citationDetails.regulation) {
                        citationDetails.regulation = contentCitationDetails.regulation;
                      }
                      if (contentCitationDetails.section && !citationDetails.section) {
                        citationDetails.section = contentCitationDetails.section;
                      }
                      
                      // Try to extract a section title from the reference
                      if (!extractedSectionTitle) {
                        const contentSectionTitle = extractSectionTitle(docRefMatch[1]);
                        if (contentSectionTitle) {
                          console.log('Found section title in content reference:', contentSectionTitle);
                          // Use this as our section title
                          extractedSectionTitle = contentSectionTitle;
                        }
                      }
                    }
                  }
                  
                  // Create a meaningful section title if we don't have one
                  let finalSectionTitle = extractedSectionTitle || '';
                  if (!finalSectionTitle) {
                    // Special handling for Federal Register documents
                    if (documentName.includes('2024-17957') || documentName.match(/\d{4}-\d{5}\.pdf/)) {
                      const frNumberMatch = documentName.match(/(\d{4}-\d{5})/);
                      if (frNumberMatch) {
                        const frNumber = frNumberMatch[1];
                        finalSectionTitle = `Federal Register ${frNumber}`;
                        
                        if (citationDetails.page) {
                          finalSectionTitle += `, Page ${citationDetails.page}`;
                        }
                        
                        console.log('Using Federal Register document number as section title:', finalSectionTitle);
                      }
                    } else {
                      // Build a section title from the citation details
                      const parts = [];
                      
                      if (citationDetails.chapter) {
                        parts.push(`Chapter ${citationDetails.chapter}`);
                      }
                      
                      if (citationDetails.section) {
                        parts.push(`Section ${citationDetails.section}`);
                      }
                      
                      if (citationDetails.heading) {
                        parts.push(citationDetails.heading);
                      }
                      
                      if (citationDetails.page) {
                        parts.push(`Page ${citationDetails.page}`);
                      }
                      
                      if (parts.length > 0) {
                        finalSectionTitle = parts.join(', ');
                        console.log('Created section title from citation details:', finalSectionTitle);
                      } else {
                        // Use the first line of the quote as the section title
                        const firstLine = quote.split('\n')[0].trim();
                        if (firstLine && firstLine.length < 100) {
                          finalSectionTitle = firstLine;
                          console.log('Using first line as section title:', finalSectionTitle);
                        } else {
                          finalSectionTitle = 'Document excerpt';
                        }
                      }
                    }
                  }
                  
                  // If we still don't have a meaningful section title, use the document name
                  if (!finalSectionTitle || finalSectionTitle === 'N/A' || finalSectionTitle === 'Document excerpt') {
                    // For Federal Register documents, create a title from the document name
                    if (documentName.includes('2024-17957') || documentName.match(/\d{4}-\d{5}\.pdf/)) {
                      const frNumberMatch = documentName.match(/(\d{4}-\d{5})/);
                      if (frNumberMatch) {
                        const frNumber = frNumberMatch[1];
                        finalSectionTitle = `Federal Register ${frNumber}`;
                        
                        // Try to extract a section from the quote
                        const sectionMatch = quote.match(/([A-Z][A-Z\s]{3,}[A-Z])/);
                        if (sectionMatch) {
                          finalSectionTitle += `, ${sectionMatch[1]}`;
                        } else if (citationDetails.page) {
                          finalSectionTitle += `, Page ${citationDetails.page}`;
                        }
                        
                        console.log('Created Federal Register title as fallback:', finalSectionTitle);
                      }
                    }
                  }
                  
                  console.log('Created source from file citation:', {
                    document: documentName,
                    section: finalSectionTitle,
                    description: briefDescription,
                    ...citationDetails
                  });
                  
                  // Create a better description if needed
                  let finalDescription = briefDescription;
                  if (finalDescription === 'N/A' || !finalDescription) {
                    // Try to create a description from the quote
                    if (quote && quote.length > 0) {
                      // Use the first 140 characters of the quote
                      finalDescription = quote.substring(0, 140);
                      if (quote.length > 140) {
                        finalDescription += '...';
                      }
                      console.log('Created description from quote:', finalDescription);
                    } else {
                      // Use the section title as the description
                      finalDescription = finalSectionTitle;
                      console.log('Using section title as description:', finalDescription);
                    }
                  }
                  
                  return {
                    document: documentName, // Use the actual document name
                    section: finalSectionTitle,
                    description: finalDescription,
                    type: 'file',
                    ...citationDetails // Add page, paragraph, and citation if found
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
            sources = await Promise.all(annotationsWithPromises) as Array<{document: string, section: string, type?: string, description?: string} | null>;
            console.log('Final sources array:', JSON.stringify(sources));
          } else {
            console.log('No annotations found in the response');
          }
        }
      }
      
      // Check if file_search was used in the final run
      if (vectorStoreId && !useWebSearch && !fileSearchUsed) {
        try {
          const runSteps = await openai.beta.threads.runs.steps.list(threadId, run.id);
          
          // Check if any step used the file_search tool
          for (const step of runSteps.data) {
            if (step.step_details && 'tool_calls' in step.step_details) {
              const toolCalls = step.step_details.tool_calls;
              for (const toolCall of toolCalls) {
                if (toolCall.type === 'file_search') {
                  fileSearchUsed = true;
                  console.log('File search tool was used in the run!');
                  break;
                }
              }
            }
            
            if (fileSearchUsed) break;
          }
          
          if (!fileSearchUsed) {
            console.warn('WARNING: File search tool was NOT used in the run! This may explain why no sources are showing up.');
          }
        } catch (stepsError) {
          console.error('Error checking run steps:', stepsError);
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
          customChartData: customChartData || undefined
        }
      });
      
    } catch (error) {
      console.error('Error processing message:', error);
      return NextResponse.json(
        { error: 'Failed to process message' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error processing message:', error);
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    );
  }
} 