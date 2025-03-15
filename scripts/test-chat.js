#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });

async function testChat() {
  try {
    // Dynamically import fetch
    const { default: fetch } = await import('node-fetch');
    
    console.log('Testing chat API...');
    
    // Create a thread
    console.log('Creating a thread...');
    const threadResponse = await fetch('http://localhost:3000/api/chat/thread', {
      method: 'POST',
    });
    
    const threadData = await threadResponse.json();
    console.log('Thread created:', threadData);
    
    const threadId = threadData.threadId;
    
    // Send a message to the thread
    console.log('Sending a message to the thread...');
    const messageResponse = await fetch('http://localhost:3000/api/chat/message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        threadId,
        message: 'What is the remote work policy?',
      }),
    });
    
    const messageData = await messageResponse.json();
    console.log('Message response:', JSON.stringify(messageData, null, 2));
    
    console.log('Test completed');
  } catch (error) {
    console.error('Error during test:', error);
    process.exit(1);
  }
}

testChat(); 