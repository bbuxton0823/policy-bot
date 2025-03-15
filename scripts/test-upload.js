#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testUpload() {
  try {
    console.log('Testing document upload API...');
    
    // Check if test files exist
    const samplePolicyPath = path.join(__dirname, '..', 'sample-policy.txt');
    const dataSecurityPolicyPath = path.join(__dirname, '..', 'data-security-policy.txt');
    
    if (!fs.existsSync(samplePolicyPath)) {
      console.error('❌ Error: sample-policy.txt not found');
      process.exit(1);
    }
    
    if (!fs.existsSync(dataSecurityPolicyPath)) {
      console.error('❌ Error: data-security-policy.txt not found');
      process.exit(1);
    }
    
    console.log('✅ Test files found');
    
    // Create form data with the sample policy file
    const formData = new FormData();
    formData.append('documents', fs.createReadStream(samplePolicyPath));
    
    console.log('Uploading sample-policy.txt...');
    
    // Send the upload request
    const response = await fetch('http://localhost:3000/api/documents/upload', {
      method: 'POST',
      body: formData,
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Upload successful!');
      console.log('Response:', JSON.stringify(result, null, 2));
    } else {
      console.error('❌ Upload failed!');
      console.error('Error:', result.error);
      console.error('Details:', result.details || 'No details provided');
    }
  } catch (error) {
    console.error('❌ Error testing upload:', error.message);
    process.exit(1);
  }
}

testUpload(); 