# Policy Bot

A modern, AI-powered chatbot application designed specifically for organizations to manage, search, and interact with their policy documents using natural language. Policy Bot transforms how employees and stakeholders access and understand organizational policies by providing instant, accurate answers with source citations, eliminating the need to manually search through lengthy documents.

## Introduction

Policy Bot serves as your organization's policy knowledge base and assistant, making policy information accessible through natural conversation. Whether you're looking for specific policy details, need clarification on procedures, or want to understand how policies apply to particular situations, Policy Bot provides accurate, sourced answers in seconds.

Policy Bot is built on OpenAI's advanced language models and vector database technology, enabling it to understand complex policy questions and retrieve relevant information from your organization's document repository. The system maintains context throughout conversations, allowing for natural follow-up questions and detailed explorations of policy topics.

The application allows you to:

- **Upload and manage your organization's policy documents** in various formats (PDF, Word, TXT)
- **Query policies using natural language**, just as you would ask a colleague
- **Receive answers with specific citations** to source documents and sections
- **Generate visual representations of policy data** with charts and graphs
- **Copy charts and visualizations** to clipboard for use in other applications
- **Supplement policy information** with current web data when needed
- **Save and manage conversation threads** for future reference
- **Access policy information** from any device with a web browser
- **Toggle between light and dark modes** for comfortable viewing in any environment

Policy Bot is designed with both ease of use and powerful functionality in mind. The intuitive interface requires minimal training for users, while the sophisticated AI backend ensures accurate and relevant responses to policy inquiries.

**We strongly recommend reading this entire README file** to fully understand the capabilities and setup requirements of Policy Bot. This documentation provides comprehensive information on installation, configuration, usage, and troubleshooting to ensure you get the most out of the application.

## Features

- **Intuitive Document Upload**:
  - Drag-and-drop functionality in both upload tab and chat interface
  - Support for PDF, Word, and text documents
  - Visual feedback during upload process
  - Automatic document processing and vectorization

- **Advanced AI Capabilities**:
  - Natural language querying of policy documents
  - Context-aware conversations with follow-up question support
  - Web search integration for accessing current information
  - Persistent chat memory for ongoing conversations
  - Chart and visualization generation from policy data

- **Rich Information Display**:
  - Source citations for answers with clear distinction between document and web sources
  - Interactive charts and visualizations with copy-to-clipboard functionality
  - Document versioning and management
  - Visual indicators for active vector stores and web search status

- **User-Friendly Interface**:
  - Clean, modern UI with Chakra UI components
  - Responsive design for desktop and mobile use
  - Helpful tooltips and status indicators
  - Dark mode support for reduced eye strain
  - Thread saving and management for continued conversations

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

5. (Optional) Set up Google Custom Search API for web search functionality:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project
   - Enable the "Custom Search API"
   - Create API credentials and get your API key
   - Go to [Google Programmable Search Engine](https://programmablesearchengine.google.com/about/)
   - Create a new search engine
   - Get your Search Engine ID (cx)
   - Add these to your `.env.local` file:
   ```
   GOOGLE_API_KEY=your_google_api_key
   GOOGLE_CSE_ID=your_google_custom_search_engine_id
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
   - Navigate to the Upload tab in the main navigation
   - Drag and drop files into the upload area or click to browse your file system
   - Select one or multiple files (PDF, DOCX, TXT formats supported)
   - Click "Upload Documents" to process them
   - Wait for the confirmation message indicating successful processing
   - Documents will be automatically vectorized and made available for querying

2. **Directly in Chat**:
   - Drag and drop files directly into the chat interface
   - Alternatively, click the upload icon (📎) in the chat input area
   - Select files from your file system
   - Files will be processed automatically with progress indicators
   - A confirmation message will appear in the chat when processing is complete
   - You can immediately begin asking questions about the uploaded documents

**Note**: The system automatically extracts text from documents, creates vector embeddings, and stores them for efficient retrieval. This process may take a few moments depending on document size and complexity.

### Managing Documents

The Documents Library tab provides comprehensive document management capabilities:

- **View all uploaded documents** with details including:
  - File name and type
  - Upload date and time
  - File size
  - Processing status
  - Number of text chunks created

- **Document Actions**:
  - Delete documents when they're no longer needed
  - View document details including extracted text
  - Check document processing status
  - See which vector store contains each document

- **Filtering and Sorting**:
  - Filter documents by type (PDF, Word, Text)
  - Sort by upload date, name, or size
  - Search for specific documents by name

### Chatting with the Policy Assistant

The Chat tab is the primary interface for interacting with your policy documents:

1. **Starting a Conversation**:
   - Navigate to the Chat tab
   - Type your question about company policies in the input field
   - Press Enter or click the Send button
   - The assistant will search through your uploaded documents to find relevant information
   - Responses typically arrive within seconds, depending on query complexity

2. **Understanding Responses**:
   - Answers include citations to specific documents and sections
   - Document sources are marked with a file icon (📄)
   - Web sources (if web search is enabled) are marked with a globe icon (🌐)
   - Charts and visualizations appear inline when relevant
   - Sources are listed at the bottom of each response for reference

3. **Follow-up Questions**:
   - The assistant maintains context from previous messages
   - You can ask follow-up questions without repeating all the details
   - Example: After asking about vacation policy, simply ask "How does that apply to new employees?"
   - The conversation maintains context until you start a new thread

4. **Thread Management**:
   - Save conversations by clicking the Save icon in the thread menu
   - Name your threads for easy reference
   - Access saved threads from the dropdown menu
   - Start new threads when changing topics
   - Copy entire conversations to clipboard for sharing or record-keeping

5. **Special Features**:
   - **Copy functionality**: Copy individual messages, entire conversations, or sources with dedicated copy buttons
   - **Chart interaction**: Copy charts to clipboard with the copy button in the chart header
   - **Source exploration**: Click on web sources to open the original webpage

### Using Web Search

The web search feature allows the assistant to supplement policy information with current data from the internet:

1. **Enabling Web Search**:
   - Toggle the "Web Search" switch in the top right of the chat interface
   - A blue indicator will show when web search is active
   - Web search can be toggled on/off at any point in a conversation

2. **How Web Search Works**:
   - When enabled, the assistant will supplement policy information with current data from the web
   - The system prioritizes web information for current events or topics not covered in your documents
   - Web sources will be clearly marked with a globe icon (🌐) and linked to the original source
   - Document sources will be marked with a file icon (📄)

3. **Web Search Indicators**:
   - Blue globe icon on messages indicates web search was used
   - Links to web sources are provided for verification
   - The system indicates when web search was attempted but no relevant results were found

4. **Best Practices**:
   - Enable web search for questions about current events or industry trends
   - Keep web search disabled when asking about confidential internal policies
   - Use web search to compare your policies with industry standards or regulations

### Working with Charts and Visualizations

Policy Bot can generate and display charts to help visualize policy data:

1. **Requesting Charts**:
   - Ask questions that involve comparative data or statistics
   - Example: "Show me a comparison of HUD policies before and after Scott Turner's proposed changes"
   - The system will automatically generate appropriate visualizations

2. **Chart Types Available**:
   - Bar charts for comparisons
   - Line charts for trends over time
   - Pie charts for proportional data
   - Tables for structured information

3. **Interacting with Charts**:
   - **Copying charts**: Click the copy icon in the chart header to copy the chart as an image
   - **Viewing details**: Hover over chart elements to see detailed information
   - **Using in other applications**: Paste copied charts into documents, presentations, or emails

4. **Chart Data Sources**:
   - Charts can be generated from data in your policy documents
   - When web search is enabled, charts may incorporate current data from the web
   - The system will indicate the source of data used in visualizations

### Advanced Usage Tips

1. **Optimizing Document Uploads**:
   - Use searchable PDFs rather than scanned images for better text extraction
   - Break very large documents (100+ pages) into smaller logical sections
   - Ensure documents have clear titles and section headers for better citation

2. **Crafting Effective Queries**:
   - Be specific in your questions for more precise answers
   - Include key terms that would appear in the relevant policy
   - For complex topics, start with broader questions and then narrow down

3. **Using Context Effectively**:
   - Reference previous parts of the conversation when needed
   - Example: "In the vacation policy you mentioned earlier, what are the exceptions?"
   - The system will maintain context for related follow-up questions

4. **Combining Web Search and Documents**:
   - Toggle web search on when asking about how your policies compare to industry standards
   - Use web search to find recent regulatory changes that might affect your policies
   - Disable web search when discussing confidential internal matters

## How It Works

Policy Bot leverages advanced AI technologies to create a seamless experience for accessing and understanding policy information. Here's a detailed breakdown of how the system functions:

### 1. Document Processing and Storage

When you upload policy documents to the system, several processes occur:

- **File Upload**: Documents are securely transmitted to the server using encrypted connections.
- **Document Conversion**: The system processes various file formats (PDF, DOCX, TXT) and extracts the text content.
- **Chunking**: Large documents are automatically divided into smaller, semantically meaningful chunks for more effective processing.
- **Vector Embedding**: Each document chunk is transformed into a high-dimensional vector representation using OpenAI's embedding models. These vectors capture the semantic meaning of the text.
- **Vector Storage**: The vectors are stored in a vector database, creating a searchable knowledge base of your policy documents.
- **Metadata Tracking**: The system maintains metadata about each document, including filename, upload date, and document type.
- **Persistence**: Document information is stored in a JSON file (`documents.json`), ensuring your uploaded documents remain available across application restarts.

### 2. Chat Interface and Query Processing

The chat interface is the primary way users interact with policy information:

- **Thread Management**: Each conversation exists within a thread that maintains context and history.
- **Query Analysis**: When a user submits a question, the AI assistant analyzes it to understand the intent and required information.
- **Vector Search**: The system converts the query into a vector and performs a similarity search against the document vectors to find the most relevant information.
- **Context Assembly**: Relevant document chunks are assembled into a context window that the AI can reference.
- **Response Generation**: The AI generates a natural language response based on the relevant policy information.
- **Source Citation**: Each response includes citations to the specific documents and sections where the information was found.
- **Thread Persistence**: Conversations can be saved, named, and retrieved later, allowing users to continue previous discussions.

### 3. Web Search Integration

When enabled, the web search feature enhances responses with current information:

- **Toggle Control**: Users can enable or disable web search with a simple toggle in the interface.
- **Query Reformulation**: The system reformulates the user's question into an effective web search query.
- **API Integration**: The application uses Google's Custom Search API to retrieve relevant web results.
- **Result Processing**: Web search results are processed and filtered for relevance.
- **Information Integration**: The AI seamlessly integrates web information with policy document information in its responses.
- **Source Distinction**: Web sources are clearly distinguished from document sources in the response.

### 4. Visual Content Generation

For data visualization needs, the system can generate charts and graphs:

- **Data Interpretation**: The AI can interpret numerical data mentioned in queries or found in documents.
- **Chart Generation**: Using OpenAI's code interpreter tool, the system can generate visual representations of data.
- **Image Serving**: Generated charts are served through a dedicated image API endpoint.
- **Inline Display**: Charts appear directly in the chat interface for immediate reference.

### 5. User Interface Features

The application includes several UI features for enhanced usability:

- **Tabbed Interface**: Separate tabs for Chat, Document Library, and Upload provide organized access to functionality.
- **Dark Mode**: A system-wide dark mode option reduces eye strain in low-light environments.
- **Responsive Design**: The interface adapts to different screen sizes for desktop and mobile use.
- **Drag-and-Drop**: Intuitive drag-and-drop functionality for document uploads in both the upload tab and chat interface.
- **Visual Indicators**: Clear visual feedback for processes like document uploading, web search status, and message sending.
- **Thread Management**: Tools for saving, loading, and creating new conversation threads.

### 6. Security and Privacy

The application implements several security measures:

- **API Key Protection**: OpenAI and Google API keys are stored securely in environment variables.
- **Document Isolation**: Each organization's documents are isolated in their own vector stores.
- **Local Processing**: Document processing occurs on your server, not shared with third parties.
- **Access Control**: The application can be deployed behind authentication systems for controlled access.

### 7. Technical Architecture

The application uses a modern technical stack:

- **Next.js Framework**: Provides server-side rendering and API routes in a single application.
- **React Components**: Modular UI components for maintainability and reusability.
- **Chakra UI**: A component library that provides accessible, responsive UI elements.
- **OpenAI Integration**: Direct integration with OpenAI's Assistants API, Files API, and Embeddings API.
- **RESTful API Design**: Clean API endpoints for chat, documents, and image serving.
- **Stateless Design**: The application maintains state in the client and in persistent storage, allowing for horizontal scaling.

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
- **Web Search Not Working**: 
  - Confirm that you've set up Google Custom Search API correctly
  - Check that both GOOGLE_API_KEY and GOOGLE_CSE_ID are in your .env.local file
  - Verify that your Google API key has the Custom Search API enabled
  - Make sure your search engine is configured to search the entire web
  - If you don't set up Google API, the app will use simulated web search responses

## License

MIT 