import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

// File path for storing document metadata
const DOCUMENTS_FILE_PATH = path.join(process.cwd(), 'documents.json');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    console.log(`Attempting to delete document with ID: ${id}`);
    
    if (!id) {
      console.error('Document ID is missing');
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }
    
    // Read current documents
    const documents = readDocumentsFromFile();
    console.log(`Found ${documents.length} documents in storage`);
    
    // Find the document to delete
    const documentToDelete = documents.find(doc => doc.id === id);
    
    if (!documentToDelete) {
      console.error(`Document with ID ${id} not found`);
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }
    
    console.log(`Found document to delete: ${documentToDelete.name}`);
    
    // Try to delete the file from OpenAI if we have an OpenAI file ID
    if (documentToDelete.openaiFileId) {
      try {
        console.log(`Attempting to delete OpenAI file: ${documentToDelete.openaiFileId}`);
        await openai.files.del(documentToDelete.openaiFileId);
        console.log(`Successfully deleted OpenAI file: ${documentToDelete.openaiFileId}`);
      } catch (openaiError) {
        console.error(`Error deleting OpenAI file: ${documentToDelete.openaiFileId}`, openaiError);
        // Continue with local deletion even if OpenAI deletion fails
      }
    }
    
    // Filter out the document to delete
    const updatedDocuments = documents.filter(doc => doc.id !== id);
    
    // Write updated documents back to file
    writeDocumentsToFile(updatedDocuments);
    console.log(`Successfully deleted document ${id} from local storage`);
    
    return NextResponse.json({ 
      success: true,
      message: `Document ${documentToDelete.name} deleted successfully`
    });
  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json(
      { error: 'Failed to delete document', details: (error as Error).message },
      { status: 500 }
    );
  }
} 