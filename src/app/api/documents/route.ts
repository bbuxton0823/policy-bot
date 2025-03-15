import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

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

export async function GET() {
  // Read documents from file
  const documents = readDocumentsFromFile();
  return NextResponse.json({ documents });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  
  if (!id) {
    return NextResponse.json(
      { error: 'Document ID is required' },
      { status: 400 }
    );
  }
  
  // Read current documents
  const documents = readDocumentsFromFile();
  
  // Filter out the document to delete
  const updatedDocuments = documents.filter(doc => doc.id !== id);
  
  // Write updated documents back to file
  writeDocumentsToFile(updatedDocuments);
  
  return NextResponse.json({ success: true });
} 