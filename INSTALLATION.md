# Policy Bot Installation Guide

This guide will walk you through the process of setting up and running the Policy Bot application.

## Prerequisites

Before you begin, make sure you have the following:

- [Node.js](https://nodejs.org/) (v16 or higher)
- [npm](https://www.npmjs.com/) (v7 or higher)
- An [OpenAI API key](https://platform.openai.com/api-keys)
- (Optional) [Google Custom Search API](https://developers.google.com/custom-search/v1/overview) credentials for web search functionality

## Step 1: Clone the Repository

```bash
git clone https://github.com/bbuxton0823/policy-bot.git
cd policy-bot
```

## Step 2: Install Dependencies

Run the following command to install all required dependencies:

```bash
npm install
```

## Step 3: Set Up Environment Variables

You need to create a `.env.local` file with your API keys. You can do this manually or use our setup script:

### Option 1: Using the Setup Script (Recommended)

Run the setup script and follow the prompts:

```bash
npm run setup
```

The script will ask for:
- Your OpenAI API key
- Your OpenAI Assistant ID (if you already have one)
- Google API key and Custom Search Engine ID (optional, for web search)

### Option 2: Manual Setup

Create a `.env.local` file in the root directory with the following content:

```
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_ASSISTANT_ID=your_assistant_id_here (optional, can be created in step 4)
GOOGLE_API_KEY=your_google_api_key_here (optional)
GOOGLE_CSE_ID=your_google_cse_id_here (optional)
```

## Step 4: Create an OpenAI Assistant

If you don't already have an OpenAI Assistant ID, you can create one using our script:

```bash
node scripts/create-assistant.js
```

This will create a new assistant with the proper configuration and output the assistant ID. Add this ID to your `.env.local` file.

## Step 5: Start the Development Server

Run the development server:

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

## Step 6: Upload Policy Documents

1. Open the application in your browser
2. Click on the "Upload" button
3. Select your policy documents (TXT, PDF, DOCX, etc.)
4. Wait for the upload to complete

## Step 7: Start Using the Policy Bot

You can now ask questions about your policies in the chat interface. The bot will search through your uploaded documents and provide relevant answers.

## Production Deployment

To deploy the application to production:

1. Build the application:
   ```bash
   npm run build
   ```

2. Start the production server:
   ```bash
   npm start
   ```

## Troubleshooting

### Common Issues

1. **API Key Issues**: Ensure your OpenAI API key is valid and has sufficient credits.

2. **Assistant Creation Fails**: Check your internet connection and OpenAI API key permissions.

3. **File Upload Problems**: Make sure your files are in a supported format and not too large.

4. **Web Search Not Working**: Verify your Google API key and Custom Search Engine ID are correctly set in the `.env.local` file.

### Getting Help

If you encounter any issues not covered here, please open an issue on the GitHub repository or contact the maintainer.

## Additional Resources

- [OpenAI API Documentation](https://platform.openai.com/docs/api-reference)
- [Next.js Documentation](https://nextjs.org/docs)
- [Google Custom Search API Documentation](https://developers.google.com/custom-search/v1/overview) 