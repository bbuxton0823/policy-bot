import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';
import { writeFile } from 'fs/promises';
import path from 'path';
import os from 'os';
import fs from 'fs';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Get the assistant ID from environment variables
const ASSISTANT_ID = process.env.OPENAI_ASSISTANT_ID;

// File path for storing document metadata
const DOCUMENTS_FILE_PATH = path.join(process.cwd(), 'documents.json');

// Function to read documents from file
function readDocumentsFromFile(): any[] {
  try {
    if (fs.existsSync(DOCUMENTS_FILE_PATH)) {
      const data = fs.readFileSync(DOCUMENTS_FILE_PATH, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error reading documents file:', error);
  }
  return [];
}

// Function to write documents to file
function writeDocumentsToFile(documents: any[]): void {
  try {
    fs.writeFileSync(DOCUMENTS_FILE_PATH, JSON.stringify(documents, null, 2), 'utf8');
  } catch (error) {
    console.error('Error writing documents file:', error);
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log('Document upload request received');
    
    if (!ASSISTANT_ID) {
      console.error('Assistant ID is not configured');
      return NextResponse.json(
        { error: 'Assistant ID is not configured' },
        { status: 500 }
      );
    }
    
    const formData = await req.formData();
    const files = formData.getAll('documents');
    
    console.log(`Received ${files.length} files`);
    
    if (!files || files.length === 0) {
      console.error('No files uploaded');
      return NextResponse.json(
        { error: 'No files uploaded' },
        { status: 400 }
      );
    }
    
    // Log file information
    files.forEach((file, index) => {
      if (file instanceof File) {
        console.log(`File ${index + 1}: ${file.name}, Type: ${file.type}, Size: ${file.size} bytes`);
      } else {
        console.log(`File ${index + 1}: Not a valid File object`);
      }
    });
    
    const processedDocs = [];
    const uploadedFileIds = [];
    
    try {
      // Process each file individually
      for (const file of files) {
        if (!(file instanceof File)) {
          console.error('Invalid file object');
          continue;
        }
        
        try {
          // Save file temporarily
          console.log(`Processing file: ${file.name}`);
          const bytes = await file.arrayBuffer();
          const buffer = Buffer.from(bytes);
          const tempFilePath = path.join(os.tmpdir(), file.name);
          await writeFile(tempFilePath, buffer);
          console.log(`File saved temporarily at: ${tempFilePath}`);
          
          // Upload file to OpenAI using the file path
          console.log('Uploading file to OpenAI');
          const uploadedFile = await openai.files.create({
            file: fs.createReadStream(tempFilePath),
            purpose: 'assistants',
          });
          console.log(`File uploaded to OpenAI with ID: ${uploadedFile.id}`);
          
          // Store the file ID for later
          uploadedFileIds.push(uploadedFile.id);
          
          // Store document metadata
          const documentId = uuidv4();
          const now = new Date().toISOString();
          const fileType = path.extname(file.name).toLowerCase();
          
          const docMetadata = {
            id: documentId,
            name: file.name,
            uploadedAt: now,
            status: 'active',
            fileType,
            size: file.size,
            version: formData.get('version')?.toString() || '1.0',
            openaiFileId: uploadedFile.id,
          };
          
          // Add document to our processed docs list
          processedDocs.push(docMetadata);
          console.log(`Document metadata created for: ${file.name}`);
        } catch (fileError: any) {
          console.error(`Error processing file ${file.name}:`, fileError.message);
        }
      }
      
      // Create a vector store with the uploaded files
      console.log('Creating vector store with uploaded files...');
      const vectorStoreName = `Policy Documents ${new Date().toISOString()}`;
      const vectorStore = await openai.vectorStores.create({
        name: vectorStoreName,
        file_ids: uploadedFileIds,
      });
      console.log(`Vector store created with ID: ${vectorStore.id}`);
      
      // Get the current assistant configuration
      console.log(`Getting assistant ${ASSISTANT_ID}...`);
      const assistant = await openai.beta.assistants.retrieve(ASSISTANT_ID);
      
      // Update the assistant with the new vector store
      console.log(`Updating assistant ${ASSISTANT_ID} with vector store...`);
      
      // Update the assistant with the vector store ID in the correct structure
      const updatedAssistant = await openai.beta.assistants.update(ASSISTANT_ID, {
        tools: [{ type: "file_search" }],
        tool_resources: {
          file_search: {
            vector_store_ids: [vectorStore.id]
          }
        }
      });
      console.log('Assistant updated with vector store');
      
      // Save the processed documents to our file storage
      const existingDocuments = readDocumentsFromFile();
      const updatedDocuments = [...existingDocuments, ...processedDocs];
      writeDocumentsToFile(updatedDocuments);
      
      console.log('Document upload completed successfully');
      return NextResponse.json({ 
        success: true, 
        documents: processedDocs,
        vectorStoreId: vectorStore.id
      });
    } catch (processingError: any) {
      console.error('Error processing documents:', processingError.message);
      throw processingError;
    }
  } catch (error: any) {
    console.error('Error processing documents:', error.message);
    return NextResponse.json(
      { error: 'Failed to process documents', details: error.message },
      { status: 500 }
    );
  }
} 