# Policy Bot

A modern, AI-powered chatbot application that allows users to upload policy documents, store them in OpenAI's vector database, and query them using natural language. Get instant, accurate answers to policy questions with source citations.

## Features

- **Intuitive Document Upload**:
  - Drag-and-drop functionality in both upload tab and chat interface
  - Support for PDF, Word, and text documents
  - Visual feedback during upload process

- **Advanced AI Capabilities**:
  - Automatic document processing and vectorization using OpenAI
  - Natural language querying of policy documents
  - Web search integration for accessing current information
  - Persistent chat memory for ongoing conversations

- **Rich Information Display**:
  - Source citations for answers with clear distinction between document and web sources
  - Document versioning and management
  - Visual indicators for active vector stores and web search status

- **User-Friendly Interface**:
  - Clean, modern UI with Chakra UI components
  - Responsive design for desktop and mobile use
  - Helpful tooltips and status indicators

## Tech Stack

- **Frontend**: Next.js, React, Chakra UI
- **Backend**: Next.js API Routes
- **Vector Database**: OpenAI Vector Store
- **AI**: OpenAI Embeddings and Assistants API
- **Document Processing**: OpenAI File Processing
- **Web Search**: OpenAI Web Search Tool

## Setup

### Prerequisites

- Node.js 18+
- OpenAI API key with access to Assistants API

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/policy-bot.git
   cd policy-bot
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file in the root directory with your OpenAI API key:
   ```
   OPENAI_API_KEY=your_openai_api_key
   ```

4. Create an OpenAI Assistant:
   ```bash
   node scripts/create-assistant.js
   ```
   This will output an Assistant ID. Add it to your `.env.local` file:
   ```
   OPENAI_ASSISTANT_ID=your_assistant_id
   ```

### Running the Application

Start the development server:
```bash
npm run dev
```

The application will be available at http://localhost:3000.

## Usage

### Uploading Documents

There are two ways to upload policy documents:

1. **Via Upload Tab**:
   - Navigate to the Upload tab
   - Drag and drop files into the upload area or click to browse
   - Click "Upload Documents" to process them

2. **Directly in Chat**:
   - Drag and drop files directly into the chat interface
   - Click the upload icon in the top right of the chat
   - Files will be processed and made available for querying immediately

### Managing Documents

- View all uploaded documents in the Documents tab
- See document details including file name, type, and upload date
- Delete documents when they're no longer needed

### Chatting with the Policy Assistant

1. Navigate to the Chat tab
2. Type your question about company policies in the input field
3. The assistant will search through your uploaded documents to find relevant information
4. Answers will include citations to specific documents and sections
5. For follow-up questions, the assistant maintains context from previous messages

### Using Web Search

1. Toggle the "Web Search" switch in the chat interface
2. When enabled, the assistant will supplement policy information with current data from the web
3. Web sources will be clearly marked with a globe icon and linked to the original source
4. Document sources will be marked with a file icon

## How It Works

1. **Document Upload**: When you upload documents, they are sent to OpenAI's Files API and then added to a vector store.
2. **Vector Storage**: OpenAI automatically processes the documents, extracts text, and creates vector embeddings for semantic search.
3. **Assistant Integration**: The application connects the vector store to an OpenAI Assistant with the file_search and web_search tools.
4. **Chat Interface**: When you ask questions, the Assistant uses the vector store to find relevant information in your documents and provides answers with citations.
5. **Web Search**: When enabled, the assistant can supplement policy information with current data from the web, citing web sources separately from document sources.
6. **Chat Memory**: The application maintains conversation history within a thread, allowing the assistant to reference previous messages and maintain context throughout the conversation.

## Development

### Project Structure

```
policy-bot/
├── src/
│   ├── app/
│   │   ├── api/                  # API routes
│   │   │   ├── chat/             # Chat API endpoints
│   │   │   └── documents/        # Document API endpoints
│   │   ├── components/           # React components
│   │   ├── page.tsx              # Main page
│   │   └── layout.tsx            # Root layout
│   └── ...
├── scripts/                      # Utility scripts
├── public/                       # Static assets
└── ...
```

### Key Components

- **DocumentUpload**: Handles file uploads with drag-and-drop functionality
- **PolicyChat**: Main chat interface with web search toggle and file upload
- **DocumentLibrary**: Displays and manages uploaded documents
- **API Routes**: Handle document processing, chat threads, and message handling

## Troubleshooting

- **Upload Issues**: Ensure your documents are in PDF, Word, or text format
- **Chat Not Working**: Check that your OpenAI API key has access to the Assistants API
- **No Responses**: Verify that your Assistant ID is correctly set in the .env.local file
- **Web Search Not Working**: Confirm that your OpenAI API key has access to the web search tool

## License

MIT 