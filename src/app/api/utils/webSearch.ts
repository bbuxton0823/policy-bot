import { NextResponse } from 'next/server';

/**
 * Performs a web search using Google's Custom Search API
 * @param query The search query
 * @returns Formatted search results
 */
export async function performWebSearch(query: string): Promise<string> {
  try {
    const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
    const GOOGLE_CSE_ID = process.env.GOOGLE_CSE_ID;
    
    if (!GOOGLE_API_KEY || !GOOGLE_CSE_ID) {
      console.warn('Google Search API credentials not configured');
      return `🌐 **Web Search Results for: "${query}"**

*Note: Web search is not fully configured. Please add GOOGLE_API_KEY and GOOGLE_CSE_ID to your environment variables.*
      
1. [Example Result 1](https://example.com) - This would show real search results if Google API was configured.
2. [Example Result 2](https://example.com) - Configure your Google Custom Search API for actual web results.
3. [Example Result 3](https://developers.google.com/custom-search/v1/overview) - Visit this link to get started with Google Custom Search API.`;
    }
    
    // Encode the query for URL
    const encodedQuery = encodeURIComponent(query);
    
    // Make the API request to Google
    const response = await fetch(
      `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CSE_ID}&q=${encodedQuery}&num=5`
    );
    
    if (!response.ok) {
      throw new Error(`Google API responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Format the results in a markdown-friendly way
    let formattedResults = `🌐 **Web Search Results for: "${query}"**\n\n`;
    
    if (data.items && data.items.length > 0) {
      data.items.forEach((item: any, index: number) => {
        // Extract domain name for better source attribution
        let domain = '';
        try {
          const url = new URL(item.link);
          domain = url.hostname.replace('www.', '');
        } catch (e) {
          domain = 'unknown source';
        }
        
        // Format the result with clear title, link, and source attribution
        formattedResults += `${index + 1}. **[${item.title}](${item.link})** - *Source: ${domain}*\n`;
        if (item.snippet) {
          formattedResults += `   ${item.snippet}\n`;
        }
        // Add the URL explicitly to make it more visible
        formattedResults += `   URL: ${item.link}\n`;
        formattedResults += '\n';
      });
      
      // Add a note about web search results
      formattedResults += `\n*The information above was retrieved from the web and may not reflect your organization's specific policies.*`;
    } else {
      formattedResults += "🔍 No relevant results found for this query on the web.";
    }
    
    return formattedResults;
  } catch (error) {
    console.error('Error performing web search:', error);
    return `🌐 **Web Search Error**\n\nError performing web search: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again later.`;
  }
} 