import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const fileId = params.id;
    
    if (!fileId) {
      console.error('No file ID provided');
      return NextResponse.json(
        { error: 'File ID is required' },
        { status: 400 }
      );
    }
    
    console.log(`Retrieving file with ID: ${fileId}`);
    
    // Get the file content from OpenAI
    const response = await openai.files.content(fileId);
    
    // Check if response is valid
    if (!response) {
      console.error(`Empty response from OpenAI for file ID: ${fileId}`);
      return NextResponse.json(
        { error: 'Empty response from OpenAI' },
        { status: 500 }
      );
    }
    
    try {
      // Get the buffer directly
      const buffer = Buffer.from(await response.arrayBuffer());
      
      console.log(`Successfully retrieved image for file ID: ${fileId}, size: ${buffer.length} bytes`);
      
      // Return the image with appropriate content type
      return new Response(buffer, {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=86400',
        },
      });
    } catch (bufferError) {
      console.error(`Error processing image buffer: ${bufferError instanceof Error ? bufferError.message : 'Unknown error'}`);
      return NextResponse.json(
        { error: 'Failed to process image data', details: bufferError instanceof Error ? bufferError.message : 'Unknown error' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error retrieving image:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve image', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 