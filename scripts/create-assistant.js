#!/usr/bin/env node

const { OpenAI } = require('openai');
require('dotenv').config({ path: '.env.local' });

async function createAssistant() {
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.error('Error: OPENAI_API_KEY is not set in .env.local');
      process.exit(1);
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    console.log('Creating Policy Assistant...');

    const assistant = await openai.beta.assistants.create({
      name: "Policy Assistant",
      instructions: `You are a helpful policy assistant. Your job is to answer questions about company policies by searching through the uploaded policy documents.

When answering:
1. Always cite the specific policy document and section you're referencing
2. If you don't find a clear answer in the policies, say so and ask for more information
3. Be concise but thorough
4. Format your responses in a clear, readable way
5. If a policy has been updated, note both the current policy and previous versions
6. If multiple policies are relevant, mention all of them
7. Use code interpreter for data analysis and visualization when appropriate`,
      model: "gpt-4-turbo-preview",
      tools: [
        {
          type: "code_interpreter"
        },
        {
          type: "file_search"
        }
      ]
    });

    console.log(`Assistant created with ID: ${assistant.id}`);
    console.log('');
    console.log('Add this ID to your .env.local file:');
    console.log(`OPENAI_ASSISTANT_ID=${assistant.id}`);
    
  } catch (error) {
    console.error('Error creating assistant:', error);
    process.exit(1);
  }
}

createAssistant(); 