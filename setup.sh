#!/bin/bash

echo "Installing dependencies..."
npm install

echo "Installing dev dependencies..."
npm install --save-dev @types/node @types/react @types/react-dom @types/uuid

echo "Setup complete! Now you need to:"
echo "1. Create a .env.local file with your OpenAI API key"
echo "2. Run 'node scripts/create-assistant.js' to create your OpenAI Assistant"
echo "3. Start the development server with 'npm run dev'" 