'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Box, 
  VStack, 
  HStack, 
  Input, 
  Button, 
  Text, 
  Flex, 
  Spinner, 
  Badge, 
  useToast,
  Switch,
  FormControl,
  FormLabel,
  Tooltip,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  Image
} from '@chakra-ui/react';
import { FiSend, FiUpload, FiFile, FiGlobe, FiInfo, FiSave, FiList, FiTrash2, FiRefreshCw, FiSearch, FiExternalLink, FiCopy, FiCheck } from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import PolicyComparisonChart from './PolicyComparisonChart';
import { usePolicyChartData, createPolicyDataFromText, PolicyData } from '../hooks/usePolicyChartData';

interface Source {
  document: string;
  section: string;
  description?: string;
  type?: 'file' | 'web';
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
  webSearchEnabled?: boolean;
  hasChartImage?: boolean;
  chartImageUrl?: string;
  webSearchUsed?: boolean;
  webSearchResults?: boolean;
  customChartData?: PolicyData[];
}

interface PolicyChatProps {
  vectorStoreId: string | null;
}

const THREAD_STORAGE_KEY = 'policy_chat_threads';

interface SavedThread {
  id: string;
  name: string;
  lastMessage: string;
  timestamp: number;
  messages: Message[];
}

const PolicyChat: React.FC<PolicyChatProps> = ({ vectorStoreId }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [activeVectorStoreId, setActiveVectorStoreId] = useState<string | null>(null);
  const [useWebSearch, setUseWebSearch] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [savedThreads, setSavedThreads] = useState<SavedThread[]>([]);
  const [threadName, setThreadName] = useState<string>('');
  const [copiedMessageIndex, setCopiedMessageIndex] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedSourcesIndex, setCopiedSourcesIndex] = useState<number | null>(null);
  const [webSearchInProgress, setWebSearchInProgress] = useState(false);
  const [copiedChartIndex, setCopiedChartIndex] = useState<number | null>(null);
  const { policyData, updatePolicyData } = usePolicyChartData();
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const toast = useToast();
  
  // Load saved threads from localStorage
  useEffect(() => {
    const loadSavedThreads = () => {
      const savedThreadsJson = localStorage.getItem(THREAD_STORAGE_KEY);
      if (savedThreadsJson) {
        try {
          const threads = JSON.parse(savedThreadsJson);
          setSavedThreads(threads);
        } catch (error) {
          console.error('Error parsing saved threads:', error);
        }
      }
    };
    
    loadSavedThreads();
  }, []);
  
  // Create a thread when the component mounts
  useEffect(() => {
    const createThread = async () => {
      try {
        const response = await fetch('/api/chat/thread', {
          method: 'POST',
        });
        
        if (response.ok) {
          const data = await response.json();
          setThreadId(data.threadId);
          setThreadName(`Chat ${new Date().toLocaleString()}`);
          
          // Add a welcome message
          setMessages([
            {
              role: 'assistant',
              content: 'Hello! I\'m your Policy Assistant. Ask me anything about company policies, or upload a document to chat about it.',
            },
          ]);
        } else {
          throw new Error('Failed to create thread');
        }
      } catch (error) {
        console.error('Error creating thread:', error);
        toast({
          title: 'Error',
          description: 'Failed to initialize chat. Please try again.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    };
    
    createThread();
  }, [toast]);
  
  // Update activeVectorStoreId when vectorStoreId prop changes
  useEffect(() => {
    if (vectorStoreId) {
      setActiveVectorStoreId(vectorStoreId);
    }
  }, [vectorStoreId]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const handleSendMessage = async () => {
    if (!input.trim() || !threadId) return;
    
    const userMessage = input.trim();
    setInput('');
    
    // Check if the message contains policy comparison request
    const isPolicyComparison = userMessage.toLowerCase().includes('comparison') && 
                              (userMessage.toLowerCase().includes('policy') || 
                               userMessage.toLowerCase().includes('policies')) &&
                              (userMessage.toLowerCase().includes('hud') || 
                               userMessage.toLowerCase().includes('scott turner'));
    
    // If it's a policy comparison request, add custom chart data
    let customChartData: PolicyData[] | undefined = undefined;
    if (isPolicyComparison) {
      // Use the default data from our hook
      customChartData = policyData;
      
      // Or try to parse from the message
      if (userMessage.includes('-') && 
          (userMessage.includes('implemented') || userMessage.includes('reduced') || userMessage.includes('eliminated'))) {
        const parsedData = createPolicyDataFromText(userMessage);
        if (parsedData.length > 0) {
          customChartData = parsedData;
          updatePolicyData(parsedData);
        }
      }
    }
    
    // Add user message to the chat
    setMessages(prev => [...prev, { 
      role: 'user', 
      content: userMessage,
      // Add an indicator if web search is enabled
      ...(useWebSearch ? { webSearchEnabled: true } : {}),
      customChartData
    }]);
    
    setLoading(true);
    
    try {
      const response = await fetch('/api/chat/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          threadId,
          message: userMessage,
          vectorStoreId: activeVectorStoreId,
          useWebSearch: useWebSearch
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Add assistant response to the chat
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: data.message.content,
            sources: data.message.sources,
            hasChartImage: data.message.hasChartImage,
            chartImageUrl: data.message.chartImageUrl,
            webSearchUsed: data.message.webSearchUsed,
            webSearchResults: data.message.webSearchResults,
            customChartData: data.message.customChartData
          },
        ]);
      } else {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      
      // Remove the user message if there was an error
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };
  
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  }, []);
  
  const handleFileUpload = async (fileList: FileList) => {
    const files = Array.from(fileList).filter(file => {
      const fileType = file.type;
      return fileType === 'application/pdf' || 
             fileType === 'application/msword' || 
             fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
             fileType === 'text/plain';
    });
    
    if (files.length === 0) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload PDF, Word, or text documents only',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    setUploadingFile(true);
    
    // Add a message to show we're uploading
    setMessages(prev => [
      ...prev, 
      { 
        role: 'assistant', 
        content: `Uploading ${files.length} document(s)...` 
      }
    ]);
    
    const formData = new FormData();
    files.forEach(file => {
      formData.append('documents', file);
    });
    
    try {
      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (response.ok) {
        const result = await response.json();
        
        // Update the vector store ID
        if (result.vectorStoreId) {
          setActiveVectorStoreId(result.vectorStoreId);
        }
        
        // Update the last message to show success
        setMessages(prev => [
          ...prev.slice(0, -1),
          { 
            role: 'assistant', 
            content: `Successfully uploaded ${result.documents.length} document(s). You can now ask questions about them!` 
          }
        ]);
        
        toast({
          title: 'Documents uploaded successfully',
          description: `${result.documents.length} document(s) processed and added to the vector store`,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Error uploading documents:', error);
      
      // Update the last message to show failure
      setMessages(prev => [
        ...prev.slice(0, -1),
        { 
          role: 'assistant', 
          content: 'Failed to upload documents. Please try again or use the Upload tab.' 
        }
      ]);
      
      toast({
        title: 'Upload failed',
        description: 'There was an error processing your documents',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setUploadingFile(false);
    }
  };
  
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileUpload(e.target.files);
    }
  };
  
  const saveCurrentThread = () => {
    if (!threadId || messages.length <= 1) {
      toast({
        title: 'Cannot save thread',
        description: 'There are no messages to save in this thread.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    const lastUserMessage = [...messages].reverse().find(msg => msg.role === 'user')?.content || '';
    
    const newThread: SavedThread = {
      id: threadId,
      name: threadName,
      lastMessage: lastUserMessage,
      timestamp: Date.now(),
      messages: messages,
    };
    
    const updatedThreads = [...savedThreads.filter(t => t.id !== threadId), newThread];
    setSavedThreads(updatedThreads);
    localStorage.setItem(THREAD_STORAGE_KEY, JSON.stringify(updatedThreads));
    
    toast({
      title: 'Thread saved',
      description: `Thread "${threadName}" has been saved.`,
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };
  
  const loadThread = (thread: SavedThread) => {
    setThreadId(thread.id);
    setMessages(thread.messages);
    setThreadName(thread.name);
    
    toast({
      title: 'Thread loaded',
      description: `Thread "${thread.name}" has been loaded.`,
      status: 'success',
      duration: 3000,
      isClosable: true,
    });
  };
  
  const deleteThread = (threadId: string, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
    }
    
    const updatedThreads = savedThreads.filter(t => t.id !== threadId);
    setSavedThreads(updatedThreads);
    localStorage.setItem(THREAD_STORAGE_KEY, JSON.stringify(updatedThreads));
    
    toast({
      title: 'Thread deleted',
      status: 'info',
      duration: 3000,
      isClosable: true,
    });
  };
  
  const startNewThread = async () => {
    try {
      const response = await fetch('/api/chat/thread', {
        method: 'POST',
      });
      
      if (response.ok) {
        const data = await response.json();
        setThreadId(data.threadId);
        setThreadName(`Chat ${new Date().toLocaleString()}`);
        setMessages([
          {
            role: 'assistant',
            content: 'Hello! I\'m your Policy Assistant. Ask me anything about company policies, or upload a document to chat about it.',
          },
        ]);
        
        toast({
          title: 'New thread created',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } else {
        throw new Error('Failed to create thread');
      }
    } catch (error) {
      console.error('Error creating thread:', error);
      toast({
        title: 'Error',
        description: 'Failed to create new thread. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };
  
  // Function to copy message content to clipboard
  const copyToClipboard = (content: string, index: number) => {
    navigator.clipboard.writeText(content).then(
      () => {
        // Show copied indicator
        setCopiedMessageIndex(index);
        
        // Reset after 2 seconds
        setTimeout(() => {
          setCopiedMessageIndex(null);
        }, 2000);
        
        toast({
          title: "Copied to clipboard",
          status: "success",
          duration: 2000,
          isClosable: true,
          position: "top"
        });
      },
      (err) => {
        console.error('Could not copy text: ', err);
        toast({
          title: "Failed to copy",
          description: "Please try again",
          status: "error",
          duration: 2000,
          isClosable: true,
          position: "top"
        });
      }
    );
  };
  
  // Function to copy the entire conversation
  const copyAllMessages = () => {
    if (messages.length === 0) return;
    
    // Format the conversation
    const formattedConversation = messages.map(msg => {
      const role = msg.role === 'user' ? 'You' : 'Assistant';
      return `${role}: ${msg.content}`;
    }).join('\n\n');
    
    navigator.clipboard.writeText(formattedConversation).then(
      () => {
        // Show copied indicator
        setCopiedAll(true);
        
        // Reset after 2 seconds
        setTimeout(() => {
          setCopiedAll(false);
        }, 2000);
        
        toast({
          title: "Entire conversation copied to clipboard",
          status: "success",
          duration: 2000,
          isClosable: true,
          position: "top"
        });
      },
      (err) => {
        console.error('Could not copy text: ', err);
        toast({
          title: "Failed to copy conversation",
          description: "Please try again",
          status: "error",
          duration: 2000,
          isClosable: true,
          position: "top"
        });
      }
    );
  };
  
  // Function to copy sources to clipboard
  const copySourcesToClipboard = (sources: Source[], index: number) => {
    if (!sources || sources.length === 0) return;
    
    // Format the sources
    const formattedSources = sources.map(source => {
      if (source.type === 'web') {
        return `Web Source: ${source.section}\nURL: ${source.document}\n`;
      } else {
        return `Document: ${source.document}\nSection: ${source.section}\n`;
      }
    }).join('\n');
    
    navigator.clipboard.writeText(formattedSources).then(
      () => {
        // Show copied indicator
        setCopiedSourcesIndex(index);
        
        // Reset after 2 seconds
        setTimeout(() => {
          setCopiedSourcesIndex(null);
        }, 2000);
        
        toast({
          title: "Sources copied to clipboard",
          status: "success",
          duration: 2000,
          isClosable: true,
          position: "top"
        });
      },
      (err) => {
        console.error('Could not copy sources: ', err);
        toast({
          title: "Failed to copy sources",
          description: "Please try again",
          status: "error",
          duration: 2000,
          isClosable: true,
          position: "top"
        });
      }
    );
  };
  
  // Add a function to copy chart image to clipboard
  const copyChartImageToClipboard = async (imageUrl: string, index: number) => {
    try {
      // Fetch the image
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      
      // Create a ClipboardItem and write to clipboard
      try {
        const item = new ClipboardItem({ [blob.type]: blob });
        await navigator.clipboard.write([item]);
        
        // Show copied indicator
        setCopiedChartIndex(index);
        
        // Reset after 2 seconds
        setTimeout(() => {
          setCopiedChartIndex(null);
        }, 2000);
        
        toast({
          title: "Chart copied to clipboard",
          status: "success",
          duration: 2000,
          isClosable: true,
          position: "top"
        });
      } catch (clipboardError) {
        console.error('Clipboard API error:', clipboardError);
        // Fallback for browsers that don't support clipboard.write with images
        downloadChartImage(blob, 'chart-image.png');
      }
    } catch (error) {
      console.error('Error copying chart image:', error);
      toast({
        title: "Failed to copy chart",
        description: "Please try again or use screenshot instead",
        status: "error",
        duration: 2000,
        isClosable: true,
        position: "top"
      });
    }
  };
  
  // Fallback method to download the chart as an image
  const downloadChartImage = (blob: Blob, filename: string) => {
    try {
      // Create a temporary link to download the image
      const link = document.createElement('a');
      link.download = filename;
      link.href = URL.createObjectURL(blob);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: 'Chart downloaded',
        description: 'Your browser doesn\'t support direct copying of images. The chart has been downloaded instead.',
        status: 'info',
        duration: 4000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error downloading chart:', error);
      toast({
        title: 'Failed to download chart',
        description: 'Please try again or use screenshot instead',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };
  
  return (
    <Box 
      p={6} 
      borderWidth="1px" 
      borderRadius="lg" 
      bg="white" 
      shadow="md" 
      height="70vh" 
      display="flex" 
      flexDirection="column"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      position="relative"
    >
      {isDragging && (
        <Box 
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          bg="blue.50"
          opacity={0.9}
          borderRadius="lg"
          display="flex"
          alignItems="center"
          justifyContent="center"
          flexDirection="column"
          zIndex={10}
          borderWidth="2px"
          borderStyle="dashed"
          borderColor="blue.400"
        >
          <FiUpload size="48px" color="#4299E1" />
          <Text mt={4} fontWeight="medium">Drop your policy documents here</Text>
          <Text fontSize="sm" color="gray.600">Supports PDF, Word, and text documents</Text>
        </Box>
      )}
      
      <Flex justify="space-between" align="center" mb={4}>
        <HStack>
          <Text fontSize="xl" fontWeight="bold" color="gray.800" _dark={{ color: "white" }}>{threadName}</Text>
          <Menu>
            <MenuButton
              as={IconButton}
              aria-label="Thread options"
              icon={<FiList />}
              variant="ghost"
              size="sm"
            />
            <MenuList>
              <MenuItem icon={<FiSave />} onClick={saveCurrentThread}>
                Save Current Thread
              </MenuItem>
              <MenuItem icon={<FiRefreshCw />} onClick={startNewThread}>
                Start New Thread
              </MenuItem>
              <MenuItem icon={copiedAll ? <FiCheck /> : <FiCopy />} onClick={copyAllMessages}>
                Copy All Messages
              </MenuItem>
              {savedThreads.length > 0 && <MenuDivider />}
              {savedThreads.map(thread => (
                <MenuItem 
                  key={thread.id} 
                  onClick={() => loadThread(thread)}
                  position="relative"
                  pr="40px"
                >
                  <Box>
                    <Text fontWeight="medium">{thread.name}</Text>
                    <Text fontSize="xs" color="gray.500" _dark={{ color: "gray.300" }} noOfLines={1}>
                      {thread.lastMessage || 'No messages'}
                    </Text>
                    <Text fontSize="xs" color="gray.400" _dark={{ color: "gray.300" }}>
                      {new Date(thread.timestamp).toLocaleString()}
                    </Text>
                  </Box>
                  <IconButton
                    aria-label="Delete thread"
                    icon={<FiTrash2 />}
                    size="xs"
                    position="absolute"
                    right="8px"
                    top="50%"
                    transform="translateY(-50%)"
                    onClick={(e) => deleteThread(thread.id, e)}
                  />
                </MenuItem>
              ))}
            </MenuList>
          </Menu>
        </HStack>
        <HStack spacing={4}>
          {activeVectorStoreId && !useWebSearch && (
            <Tooltip label="This chat is using a vector store to search through your documents">
              <Badge colorScheme="green" display="flex" alignItems="center">
                <Box mr={1}>Vector Store Active</Box>
                <FiInfo size="12px" />
              </Badge>
            </Tooltip>
          )}
          {useWebSearch && (
            <Tooltip label="Web search is enabled - responses will prioritize internet information">
              <Badge colorScheme="blue" display="flex" alignItems="center">
                <Box mr={1}>Web Search Active</Box>
                <FiGlobe size="12px" />
              </Badge>
            </Tooltip>
          )}
          <FormControl display="flex" alignItems="center" width="auto">
            <FormLabel htmlFor="web-search" mb="0" fontSize="sm" fontWeight="medium" color="gray.700" _dark={{ color: "white" }}>
              Web Search
            </FormLabel>
            <Tooltip label={useWebSearch ? 
              "Web search is enabled - I'll search the internet for current information and prioritize it over document information" : 
              "Enable to search the web for current information instead of only using uploaded documents"}>
              <Box position="relative">
                <Switch 
                  id="web-search" 
                  colorScheme="blue"
                  isChecked={useWebSearch}
                  onChange={(e) => setUseWebSearch(e.target.checked)}
                  sx={{
                    ".chakra-switch__track": {
                      _dark: {
                        bg: "gray.600"
                      }
                    },
                    ".chakra-switch__thumb": {
                      _dark: {
                        bg: "white"
                      }
                    }
                  }}
                />
                {useWebSearch && (
                  <Box 
                    position="absolute" 
                    top="-8px" 
                    right="-8px" 
                    bg="blue.500" 
                    borderRadius="full" 
                    w="16px" 
                    h="16px" 
                    display="flex" 
                    alignItems="center" 
                    justifyContent="center"
                    boxShadow="0 0 0 2px white"
                    _dark={{
                      boxShadow: "0 0 0 2px var(--chakra-colors-gray-700)"
                    }}
                  >
                    <FiGlobe size="10px" color="white" />
                  </Box>
                )}
              </Box>
            </Tooltip>
          </FormControl>
          <Tooltip label="Upload policy documents">
            <IconButton
              aria-label="Upload documents"
              icon={<FiUpload />}
              size="sm"
              onClick={() => document.getElementById('chat-file-input')?.click()}
              isLoading={uploadingFile}
            />
          </Tooltip>
          <input
            id="chat-file-input"
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.txt"
            onChange={handleFileInputChange}
            style={{ display: 'none' }}
          />
        </HStack>
      </Flex>
      
      <VStack 
        flex="1" 
        overflowY="auto" 
        spacing={4} 
        align="stretch" 
        mb={4}
        css={{
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            width: '10px',
            background: '#f1f1f1',
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb': {
            background: '#CBD5E0',
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: '#A0AEC0',
          },
        }}
      >
        {messages.map((msg, index) => (
          <Box 
            key={index} 
            alignSelf={msg.role === 'user' ? 'flex-end' : 'flex-start'}
            maxWidth="85%"
            p={3}
            borderRadius="lg"
            bg={msg.role === 'user' ? 'blue.500' : 'gray.100'}
            color={msg.role === 'user' ? 'white' : 'black'}
            position="relative"
            mx={2}
          >
            {/* Add web search indicator for user messages */}
            {msg.role === 'user' && msg.webSearchEnabled && (
              <Box 
                position="absolute" 
                top="-8px" 
                right="-10px" 
                bg="blue.200" 
                borderRadius="full" 
                w="20px" 
                h="20px" 
                display="flex" 
                alignItems="center" 
                justifyContent="center"
                boxShadow="0 0 0 2px white"
                _dark={{
                  bg: "blue.400",
                  boxShadow: "0 0 0 2px var(--chakra-colors-gray-800)",
                  svg: { color: "white" }
                }}
              >
                <FiGlobe size="12px" color="#1A365D" />
              </Box>
            )}
            
            {/* Add web search indicator for assistant messages */}
            {msg.role === 'assistant' && msg.webSearchUsed && (
              <Tooltip 
                label={msg.webSearchResults 
                  ? "Web search was used - Information includes results from the web" 
                  : "Web search was attempted but no relevant results were found"
                }
                placement="top"
                hasArrow
              >
                <Box 
                  position="absolute" 
                  top="-8px" 
                  left="-10px" 
                  bg={msg.webSearchResults ? "blue.400" : "yellow.400"} 
                  borderRadius="full" 
                  w="24px" 
                  h="24px" 
                  display="flex" 
                  alignItems="center" 
                  justifyContent="center"
                  boxShadow="0 0 0 2px white"
                  _dark={{
                    bg: msg.webSearchResults ? "blue.500" : "yellow.500",
                    boxShadow: "0 0 0 2px var(--chakra-colors-gray-800)",
                  }}
                >
                  {msg.webSearchResults ? (
                    <FiGlobe size="14px" color="white" />
                  ) : (
                    <FiSearch size="14px" color="white" />
                  )}
                </Box>
              </Tooltip>
            )}
            
            {/* Add copy button for assistant messages - only for non-welcome messages */}
            {msg.role === 'assistant' && index > 0 && (
              <Tooltip label="Copy to clipboard">
                <IconButton
                  aria-label="Copy to clipboard"
                  icon={copiedMessageIndex === index ? <FiCheck /> : <FiCopy />}
                  size="xs"
                  position="absolute"
                  top="8px"
                  right="8px"
                  colorScheme={copiedMessageIndex === index ? "green" : "gray"}
                  variant="ghost"
                  opacity="0.7"
                  _hover={{ opacity: 1, bg: "rgba(0, 0, 0, 0.1)" }}
                  onClick={() => copyToClipboard(msg.content, index)}
                />
              </Tooltip>
            )}
            
            {/* Add copy button for user messages - only for non-welcome messages */}
            {msg.role === 'user' && (
              <Tooltip label="Copy to clipboard">
                <IconButton
                  aria-label="Copy to clipboard"
                  icon={copiedMessageIndex === index ? <FiCheck /> : <FiCopy />}
                  size="xs"
                  position="absolute"
                  top="8px"
                  left="8px"
                  colorScheme={copiedMessageIndex === index ? "green" : "gray"}
                  variant="ghost"
                  color="white"
                  opacity="0.7"
                  _hover={{ opacity: 1, bg: "rgba(255, 255, 255, 0.2)" }}
                  onClick={() => copyToClipboard(msg.content, index)}
                />
              </Tooltip>
            )}
            
            {/* Render message content with ReactMarkdown */}
            <Box className="message-content">
              <ReactMarkdown>{msg.content}</ReactMarkdown>
            </Box>
            
            {/* Display web search indicator if applicable */}
            {msg.role === 'assistant' && msg.webSearchUsed && (
              <Box mt={2} mb={1}>
                <Badge colorScheme="blue" display="flex" alignItems="center" size="sm">
                  <FiGlobe size="10px" style={{ marginRight: '4px' }} />
                  <Text fontSize="xs">Web Search</Text>
                </Badge>
              </Box>
            )}
            
            {/* Display chart image if available */}
            {msg.hasChartImage && msg.chartImageUrl && (
              <Box mt={3} borderWidth="1px" borderRadius="md" overflow="hidden">
                <Flex 
                  justifyContent="space-between" 
                  alignItems="center" 
                  bg="blue.50" 
                  _dark={{ bg: "blue.900" }}
                  p={2}
                >
                  <Text fontSize="xs" fontWeight="bold">
                    Generated Chart
                  </Text>
                  <Tooltip label={copiedChartIndex === index ? "Copied!" : "Copy chart to clipboard"}>
                    <IconButton
                      aria-label="Copy chart"
                      icon={copiedChartIndex === index ? <FiCheck /> : <FiCopy />}
                      size="xs"
                      colorScheme={copiedChartIndex === index ? "green" : "blue"}
                      variant="ghost"
                      onClick={() => copyChartImageToClipboard(`/api/images/${msg.chartImageUrl}`, index)}
                    />
                  </Tooltip>
                </Flex>
                <Image 
                  src={`/api/images/${msg.chartImageUrl}`} 
                  alt="Generated Chart" 
                  maxH="300px" 
                  mx="auto" 
                  p={2}
                />
              </Box>
            )}
            
            {/* Display custom chart if available */}
            {msg.customChartData && msg.customChartData.length > 0 && (
              <Box mt={3}>
                <PolicyComparisonChart 
                  title="Comparison of HUD Policies: Current vs Under Scott Turner"
                  data={msg.customChartData}
                />
              </Box>
            )}
            
            {msg.sources && msg.sources.length > 0 && (
              <Box mt={2} pt={2} borderTopWidth="1px" borderTopColor="gray.200">
                <Flex justifyContent="space-between" alignItems="center" mb={1}>
                  <Text fontSize="xs" fontWeight="bold">Sources:</Text>
                  <Tooltip label="Copy sources">
                    <IconButton
                      aria-label="Copy sources"
                      icon={copiedSourcesIndex === index ? <FiCheck /> : <FiCopy />}
                      size="xs"
                      colorScheme={copiedSourcesIndex === index ? "green" : "gray"}
                      variant="ghost"
                      onClick={() => copySourcesToClipboard(msg.sources || [], index)}
                    />
                  </Tooltip>
                </Flex>
                {msg.sources.map((source, idx) => (
                  <Flex key={idx} fontSize="xs" alignItems="flex-start" mb={2}>
                    {source.type === 'web' ? (
                      <>
                        <Box 
                          bg="blue.100" 
                          p={1} 
                          borderRadius="full" 
                          mr={2}
                          _dark={{ bg: "blue.700" }}
                        >
                          <FiGlobe size="10px" color="#4299E1" style={{ marginRight: '0px' }} />
                        </Box>
                        <Box>
                          <Text as="a" href={source.document} target="_blank" rel="noopener noreferrer" color="blue.500" textDecoration="underline" fontWeight="medium" display="flex" alignItems="center">
                            {source.section} <FiExternalLink size="10px" style={{ marginLeft: '4px' }} />
                          </Text>
                          <Text color="blue.600" fontSize="10px" fontWeight="medium" mb="2px" _dark={{ color: "blue.200" }}>
                            🌐 Web Source: {new URL(source.document).hostname.replace('www.', '')}
                          </Text>
                          {source.description && (
                            <Text color="gray.500" fontSize="10px" mt="2px" _dark={{ color: "gray.300" }}>
                              {source.description}
                            </Text>
                          )}
                          <Text color="blue.400" fontSize="10px" mt="2px" _dark={{ color: "blue.300" }}>
                            Click the link above to view the full source
                          </Text>
                        </Box>
                      </>
                    ) : (
                      <>
                        <Box 
                          bg="green.100" 
                          p={1} 
                          borderRadius="full" 
                          mr={2}
                          _dark={{ bg: "green.700" }}
                        >
                          <FiFile size="10px" color="#48BB78" style={{ marginRight: '0px' }} />
                        </Box>
                        <Box>
                          <Text fontWeight="medium">
                            {source.document}
                          </Text>
                          <Text color="green.600" fontSize="10px" fontWeight="medium" mb="2px" _dark={{ color: "green.200" }}>
                            Document Source
                          </Text>
                          {source.description && (
                            <Text color="gray.500" fontSize="10px" mt="2px" noOfLines={2} _dark={{ color: "gray.300" }}>
                              {source.description}
                            </Text>
                          )}
                        </Box>
                      </>
                    )}
                  </Flex>
                ))}
              </Box>
            )}
          </Box>
        ))}
        
        {/* Web search loading indicator */}
        {webSearchInProgress && (
          <Box 
            alignSelf="flex-start"
            maxWidth="85%"
            p={4}
            borderRadius="lg"
            bg="gray.100"
            color="black"
            position="relative"
            mx={2}
            display="flex"
            alignItems="center"
          >
            <Box 
              position="absolute" 
              top="-8px" 
              left="-10px" 
              bg="blue.400" 
              borderRadius="full" 
              w="24px" 
              h="24px" 
              display="flex" 
              alignItems="center" 
              justifyContent="center"
              boxShadow="0 0 0 2px white"
              _dark={{
                bg: "blue.500",
                boxShadow: "0 0 0 2px var(--chakra-colors-gray-800)",
              }}
              animation="pulse 1.5s infinite"
            >
              <FiGlobe size="14px" color="white" />
            </Box>
            <Spinner size="sm" color="blue.500" mr={3} />
            <Text>Searching the web for information...</Text>
          </Box>
        )}
        
        <div ref={messagesEndRef} />
      </VStack>
      
      <HStack>
        <Input
          placeholder="Ask about company policies..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          disabled={loading}
          size="md"
          flex="1"
          mr={2}
          color="black"
          bg="white"
          _dark={{
            color: "white",
            bg: "gray.700",
            borderColor: "gray.600",
            _placeholder: { color: "gray.300" }
          }}
        />
        <Button
          colorScheme="blue"
          onClick={handleSendMessage}
          isLoading={loading && !webSearchInProgress}
          disabled={!input.trim() || !threadId || loading}
          leftIcon={<FiSend />}
        >
          Send
        </Button>
        
        {/* Web search indicator on button */}
        {webSearchInProgress && (
          <Button
            colorScheme="blue"
            position="relative"
            ml={2}
            leftIcon={<FiGlobe />}
            isDisabled={false}
          >
            <Box position="absolute" top="-8px" right="-8px" bg="blue.500" borderRadius="full" w="20px" h="20px" 
              display="flex" alignItems="center" justifyContent="center" 
              boxShadow="0 0 0 2px white" 
              _dark={{ boxShadow: "0 0 0 2px var(--chakra-colors-gray-700)" }}
              animation="pulse 1.5s infinite"
            >
              <Spinner size="xs" color="white" />
            </Box>
            Searching Web...
          </Button>
        )}
      </HStack>
      
      <style jsx global>{`
        @keyframes pulse {
          0% { transform: scale(0.95); opacity: 0.8; }
          50% { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(0.95); opacity: 0.8; }
        }
        
        .message-content {
          width: 100%;
          overflow-wrap: break-word;
        }
        
        .message-content p {
          margin-bottom: 0.5rem;
        }
        
        .message-content p:last-child {
          margin-bottom: 0;
        }
        
        .message-content ul, .message-content ol {
          margin-left: 1.5rem;
          margin-bottom: 0.5rem;
        }
        
        .message-content code {
          background-color: rgba(0, 0, 0, 0.1);
          padding: 0.1rem 0.2rem;
          border-radius: 3px;
          font-family: monospace;
        }
        
        .message-content pre {
          background-color: rgba(0, 0, 0, 0.1);
          padding: 0.5rem;
          border-radius: 5px;
          overflow-x: auto;
          margin-bottom: 0.5rem;
        }
      `}</style>
    </Box>
  );
};

export default PolicyChat; 