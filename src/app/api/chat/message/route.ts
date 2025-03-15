import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { performWebSearch } from '../../utils/webSearch';

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
    
    // Add the user message to the thread
    await openai.beta.threads.messages.create(threadId, {
      role: 'user',
      content: message,
    });
    
    // Run the assistant on the thread
    // Configure tools based on user preferences
    const runOptions: any = {
      assistant_id: ASSISTANT_ID,
    };
    
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
    
    // Always include file_search if we have a vector store
    if (vectorStoreId) {
      tools.push({ type: "file_search" });
    }
    
    // Add code_interpreter for chart creation
    tools.push({ type: "code_interpreter" });
    
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
    
    // Only set tools if we have any
    if (tools.length > 0) {
      runOptions.tools = tools;
    }
    
    // Only set tool_resources if we have any
    if (Object.keys(toolResources).length > 0) {
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
        content,
        sources,
        hasChartImage,
        chartImageUrl
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