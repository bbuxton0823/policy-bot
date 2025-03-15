import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }
    
    // In a real application, you would:
    // 1. Retrieve the document metadata from your database
    // 2. Delete the file from OpenAI
    // 3. Remove the file from the vector store if needed
    
    // This is a simplified example - in a real app you'd need to handle this properly
    // Assuming we have the OpenAI file ID and vector store ID stored in our database
    const mockDocumentMetadata = {
      openaiFileId: 'file-abc123',
      vectorStoreId: 'vs-xyz789'
    };
    
    // Delete the file from OpenAI
    await openai.files.del(mockDocumentMetadata.openaiFileId);
    
    // Note: OpenAI doesn't currently provide a direct API to remove a single file from a vector store
    // You would typically create a new vector store without this file if needed
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    );
  }
} 