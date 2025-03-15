import { NextRequest, NextResponse } from 'next/server';
import { performWebSearch } from '../webSearch';

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();
    
    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }
    
    const searchResults = await performWebSearch(query);
    
    return NextResponse.json({
      success: true,
      results: searchResults
    });
  } catch (error) {
    console.error('Error testing web search:', error);
    return NextResponse.json(
      { error: 'Failed to perform web search', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 