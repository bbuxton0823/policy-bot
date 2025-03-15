#!/usr/bin/env node

const { OpenAI } = require('openai');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

async function testFileUpload() {
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.error('Error: OPENAI_API_KEY is not set in .env.local');
      process.exit(1);
    }

    if (!process.env.OPENAI_ASSISTANT_ID) {
      console.error('Error: OPENAI_ASSISTANT_ID is not set in .env.local');
      process.exit(1);
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Create a test file
    const testFilePath = path.join(__dirname, 'test-policy.txt');
    fs.writeFileSync(testFilePath, 'This is a test policy document. Remote work is allowed 3 days per week.');
    console.log(`Created test file at: ${testFilePath}`);

    // Upload the file to OpenAI
    console.log('Uploading file to OpenAI...');
    const uploadedFile = await openai.files.create({
      file: fs.createReadStream(testFilePath),
      purpose: 'assistants',
    });
    console.log(`File uploaded to OpenAI with ID: ${uploadedFile.id}`);

    // Get the current assistant to check its configuration
    console.log(`Getting assistant ${process.env.OPENAI_ASSISTANT_ID}...`);
    const assistant = await openai.beta.assistants.retrieve(
      process.env.OPENAI_ASSISTANT_ID
    );
    console.log('Current assistant configuration:', JSON.stringify(assistant, null, 2));

    // Update the assistant to include the file
    console.log(`Updating assistant ${process.env.OPENAI_ASSISTANT_ID} with file...`);
    const updatedAssistant = await openai.beta.assistants.update(
      process.env.OPENAI_ASSISTANT_ID,
      {
        file_ids: [uploadedFile.id],
        tools: [{ type: "file_search" }]
      }
    );
    console.log('Assistant updated with file');
    console.log('Updated assistant configuration:', JSON.stringify(updatedAssistant, null, 2));

    // Clean up the test file
    fs.unlinkSync(testFilePath);
    console.log('Test file deleted');

    console.log('Test completed successfully');
  } catch (error) {
    console.error('Error during test:', error);
    process.exit(1);
  }
}

testFileUpload(); 