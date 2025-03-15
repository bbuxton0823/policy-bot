// Test script for chat API

import fetch from 'node-fetch';

async function testChatAPI() {
  try {
    console.log('Testing chat API...');
    
    // Create a thread
    console.log('\n1. Creating a thread...');
    const threadResponse = await fetch('http://localhost:3009/api/chat/thread', {
      method: 'POST',
    });
    
    if (!threadResponse.ok) {
      throw new Error(`Failed to create thread: ${threadResponse.status} ${threadResponse.statusText}`);
    }
    
    const threadData = await threadResponse.json();
    console.log('Thread created:', threadData);
    
    const threadId = threadData.threadId;
    
    // Test cases
    const testCases = [
      {
        name: "Regular question (should not create chart)",
        message: "Who is the HUD secretary?",
        expectChart: false
      },
      {
        name: "HUD chart request (should create chart)",
        message: "Show me a chart of HUD policies",
        expectChart: true
      }
    ];
    
    // Run test cases
    for (const test of testCases) {
      console.log(`\n2. Testing: ${test.name}`);
      console.log(`Sending message: "${test.message}"`);
      
      const messageResponse = await fetch('http://localhost:3009/api/chat/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          threadId,
          message: test.message,
          useWebSearch: false
        }),
      });
      
      if (!messageResponse.ok) {
        throw new Error(`Failed to send message: ${messageResponse.status} ${messageResponse.statusText}`);
      }
      
      const messageData = await messageResponse.json();
      console.log('Response received');
      
      // Check if chart data is present
      const hasChartData = messageData.message.customChartData && 
                          messageData.message.customChartData.length > 0;
      
      console.log(`Has chart data: ${hasChartData}`);
      console.log(`Expected chart data: ${test.expectChart}`);
      console.log(`Test ${hasChartData === test.expectChart ? 'PASSED' : 'FAILED'}`);
      
      // Wait a bit between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\nTest completed');
  } catch (error) {
    console.error('Error during test:', error);
    process.exit(1);
  }
}

testChatAPI(); 