#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const envFilePath = path.join(process.cwd(), '.env.local');
const envExamplePath = path.join(process.cwd(), '.env.example');

// Check if .env.local already exists
const envFileExists = fs.existsSync(envFilePath);

console.log('🤖 Policy Bot Environment Setup');
console.log('===============================');
console.log('This script will help you set up your environment variables for Policy Bot.');
console.log('You\'ll need your OpenAI API key and optionally Google Custom Search API credentials.');
console.log('\n');

if (envFileExists) {
  console.log('⚠️  An .env.local file already exists.');
  rl.question('Do you want to overwrite it? (y/n): ', (answer) => {
    if (answer.toLowerCase() === 'y') {
      collectVariables();
    } else {
      console.log('Setup cancelled. Your existing .env.local file was not modified.');
      rl.close();
    }
  });
} else {
  collectVariables();
}

function collectVariables() {
  const envVars = {};
  
  rl.question('Enter your OpenAI API key: ', (openaiKey) => {
    envVars.OPENAI_API_KEY = openaiKey;
    
    rl.question('Enter your OpenAI Assistant ID (leave blank if you don\'t have one yet): ', (assistantId) => {
      if (assistantId) {
        envVars.OPENAI_ASSISTANT_ID = assistantId;
      }
      
      rl.question('Do you want to set up web search with Google Custom Search API? (y/n): ', (setupWebSearch) => {
        if (setupWebSearch.toLowerCase() === 'y') {
          rl.question('Enter your Google API key: ', (googleKey) => {
            envVars.GOOGLE_API_KEY = googleKey;
            
            rl.question('Enter your Google Custom Search Engine ID: ', (cseId) => {
              envVars.GOOGLE_CSE_ID = cseId;
              writeEnvFile(envVars);
            });
          });
        } else {
          writeEnvFile(envVars);
        }
      });
    });
  });
}

function writeEnvFile(envVars) {
  let envContent = '';
  
  // Add each variable to the content
  for (const [key, value] of Object.entries(envVars)) {
    if (value) {
      envContent += `${key}=${value}\n`;
    }
  }
  
  // Write the file
  fs.writeFileSync(envFilePath, envContent);
  
  console.log('\n✅ Environment variables saved to .env.local');
  
  if (!envVars.OPENAI_ASSISTANT_ID) {
    console.log('\n⚠️  You didn\'t provide an OpenAI Assistant ID.');
    console.log('You\'ll need to create an assistant and add its ID to your .env.local file.');
    console.log('You can use the create-assistant.js script to create one.');
  }
  
  if (!envVars.GOOGLE_API_KEY || !envVars.GOOGLE_CSE_ID) {
    console.log('\n⚠️  Web search is not fully configured.');
    console.log('The application will use simulated web search responses.');
    console.log('To enable real web search, add GOOGLE_API_KEY and GOOGLE_CSE_ID to your .env.local file.');
  }
  
  console.log('\n🚀 Setup complete! You can now run the application with:');
  console.log('npm run dev');
  
  rl.close();
} 