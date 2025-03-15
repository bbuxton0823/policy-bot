#!/usr/bin/env node

const { OpenAI } = require('openai');
require('dotenv').config({ path: '.env.local' });

async function testCredentials() {
  console.log('Testing OpenAI credentials...');
  
  // Check if environment variables are set
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ Error: OPENAI_API_KEY is not set in .env.local');
    process.exit(1);
  }

  if (!process.env.OPENAI_ASSISTANT_ID) {
    console.error('❌ Error: OPENAI_ASSISTANT_ID is not set in .env.local');
    process.exit(1);
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  try {
    // Test API key by making a simple models list request
    console.log('1. Testing API key...');
    const models = await openai.models.list();
    console.log('✅ API key is valid. Found', models.data.length, 'models.');
    
    // Test Assistant ID by retrieving the assistant
    console.log('\n2. Testing Assistant ID...');
    const assistantId = process.env.OPENAI_ASSISTANT_ID.replace(/%$/, ''); // Remove trailing % if present
    const assistant = await openai.beta.assistants.retrieve(assistantId);
    console.log('✅ Assistant ID is valid.');
    console.log('   Name:', assistant.name);
    console.log('   Model:', assistant.model);
    console.log('   Tools:', assistant.tools.map(tool => tool.type).join(', '));
    
    console.log('\n✅ All credentials are valid and working correctly!');
  } catch (error) {
    console.error('❌ Error testing credentials:', error.message);
    
    if (error.message.includes('No such assistant')) {
      console.error('\nThe Assistant ID appears to be invalid. Please check the ID or create a new assistant:');
      console.error('node scripts/create-assistant.js');
    } else if (error.message.includes('Incorrect API key')) {
      console.error('\nThe API key appears to be invalid. Please check your OpenAI API key.');
    }
    
    process.exit(1);
  }
}

testCredentials(); 