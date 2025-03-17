import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Get the assistant ID from environment variables
const ASSISTANT_ID = process.env.OPENAI_ASSISTANT_ID;

export async function GET() {
  try {
    if (!ASSISTANT_ID) {
      console.error('Assistant ID is not configured');
      return NextResponse.json(
        { error: 'Assistant ID is not configured' },
        { status: 500 }
      );
    }

    console.log(`Getting assistant ${ASSISTANT_ID} to retrieve vector store ID...`);
    
    // Retrieve the assistant to get its current vector store ID
    const assistant = await openai.beta.assistants.retrieve(ASSISTANT_ID);
    
    // Log the assistant's tools configuration
    console.log('Assistant tools:', JSON.stringify(assistant.tools));
    console.log('Assistant tool resources:', JSON.stringify(assistant.tool_resources));
    
    // Check if file_search tool is enabled
    const hasFileSearchTool = assistant.tools.some(tool => tool.type === 'file_search');
    
    if (!hasFileSearchTool) {
      console.warn('Assistant does not have file_search tool enabled. Attempting to update...');
      
      // Get the current tools
      const currentTools = assistant.tools || [];
      
      // Add file_search if it's not already there
      if (!currentTools.some(tool => tool.type === 'file_search')) {
        try {
          // Update the assistant to add the file_search tool
          const updatedAssistant = await openai.beta.assistants.update(ASSISTANT_ID, {
            tools: [...currentTools, { type: 'file_search' }]
          });
          
          console.log('Updated assistant with file_search tool:', JSON.stringify(updatedAssistant.tools));
        } catch (updateError) {
          console.error('Error updating assistant:', updateError);
        }
      }
    }
    
    // Extract the vector store ID from the assistant's tool resources
    let vectorStoreId = null;
    
    if (
      assistant.tool_resources?.file_search?.vector_store_ids &&
      assistant.tool_resources.file_search.vector_store_ids.length > 0
    ) {
      vectorStoreId = assistant.tool_resources.file_search.vector_store_ids[0];
      console.log(`Found vector store ID: ${vectorStoreId}`);
    } else {
      console.log('No vector store ID found in assistant configuration');
      
      // Check if we need to update the assistant with the vector store ID
      // This would happen if documents were uploaded but the assistant wasn't updated
      try {
        // Look for the most recent vector store ID in the database or file system
        // For this example, we'll check a simple file, but in a real app this would be in a database
        const documentsDir = path.join(process.cwd(), 'documents');
        
        if (fs.existsSync(documentsDir)) {
          const files = fs.readdirSync(documentsDir);
          const vectorStoreFiles = files.filter(file => file.startsWith('vector_store_'));
          
          if (vectorStoreFiles.length > 0) {
            // Sort by creation time, newest first
            vectorStoreFiles.sort((a, b) => {
              const statA = fs.statSync(path.join(documentsDir, a));
              const statB = fs.statSync(path.join(documentsDir, b));
              return statB.mtime.getTime() - statA.mtime.getTime();
            });
            
            // Extract the vector store ID from the filename
            const latestVectorStoreFile = vectorStoreFiles[0];
            const extractedId = latestVectorStoreFile.replace('vector_store_', '').replace('.json', '');
            
            if (extractedId) {
              console.log(`Found vector store ID from file system: ${extractedId}`);
              vectorStoreId = extractedId;
              
              // Update the assistant with this vector store ID
              try {
                await openai.beta.assistants.update(ASSISTANT_ID, {
                  tool_resources: {
                    file_search: {
                      vector_store_ids: [extractedId]
                    }
                  }
                });
                
                console.log(`Updated assistant with vector store ID: ${extractedId}`);
              } catch (updateError) {
                console.error('Error updating assistant with vector store ID:', updateError);
              }
            }
          }
        }
      } catch (fsError) {
        console.error('Error checking for vector store files:', fsError);
      }
    }
    
    return NextResponse.json({ vectorStoreId });
  } catch (error) {
    console.error('Error retrieving vector store ID:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve vector store ID' },
      { status: 500 }
    );
  }
} 