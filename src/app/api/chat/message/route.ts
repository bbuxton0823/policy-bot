import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Get the assistant ID from environment variables
const ASSISTANT_ID = process.env.OPENAI_ASSISTANT_ID;

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
    
    // Add web search if enabled
    if (useWebSearch) {
      tools.push({ type: "web_search" });
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
        // This is where you would handle tool calls
        // For this example, we'll just return a message asking for more information
        return NextResponse.json({
          message: {
            content: "I need more information to answer your question. Could you please provide additional details?",
            sources: []
          }
        });
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
    let sources = [];
    let content = '';
    
    if (assistantMessage.content && assistantMessage.content.length > 0) {
      const textContent = assistantMessage.content.find(item => item.type === 'text');
      
      if (textContent && 'text' in textContent) {
        content = textContent.text.value;
        
        if (textContent.text.annotations) {
          sources = textContent.text.annotations
            .filter(annotation => {
              // Include both file citations and web search citations
              return annotation.type === 'file_citation' || annotation.type === 'web_search_result';
            })
            .map(annotation => {
              if ('file_citation' in annotation) {
                const citedFile = annotation.file_citation;
                return {
                  document: citedFile.file_id, // You'd map this to a document name
                  section: `Page ${citedFile.quote || 'N/A'}`,
                  type: 'file'
                };
              } else if ('web_search_result' in annotation) {
                const webResult = annotation.web_search_result;
                return {
                  document: webResult.url || 'Web Source',
                  section: webResult.title || 'Web Result',
                  type: 'web'
                };
              }
              return null;
            })
            .filter(Boolean);
        }
      }
    }
    
    return NextResponse.json({
      message: {
        content,
        sources
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