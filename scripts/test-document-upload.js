#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
require('dotenv').config({ path: '.env.local' });

async function testDocumentUpload() {
  try {
    // Dynamically import fetch
    const { default: fetch } = await import('node-fetch');
    
    console.log('Testing document upload API...');
    
    // Create a test file
    const testFilePath = path.join(__dirname, 'test-policy.txt');
    fs.writeFileSync(testFilePath, 'This is a test policy document. Remote work is allowed 3 days per week.');
    console.log(`Created test file at: ${testFilePath}`);
    
    // Create form data with the test file
    const formData = new FormData();
    formData.append('documents', fs.createReadStream(testFilePath));
    formData.append('version', '1.0');
    
    // Upload the file to the API
    console.log('Uploading file to API...');
    const response = await fetch('http://localhost:3000/api/documents/upload', {
      method: 'POST',
      body: formData,
    });
    
    // Parse the response
    const result = await response.json();
    console.log('API response:', JSON.stringify(result, null, 2));
    
    // Clean up the test file
    fs.unlinkSync(testFilePath);
    console.log('Test file deleted');
    
    console.log('Test completed');
  } catch (error) {
    console.error('Error during test:', error);
    process.exit(1);
  }
}

testDocumentUpload(); 