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
import { FiSend, FiUpload, FiFile, FiGlobe, FiInfo, FiSave, FiList, FiTrash2, FiRefreshCw, FiSearch, FiExternalLink } from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';

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
    
    // Add user message to the chat
    setMessages(prev => [...prev, { 
      role: 'user', 
      content: userMessage,
      // Add an indicator if web search is enabled
      ...(useWebSearch ? { webSearchEnabled: true } : {})
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
            chartImageUrl: data.message.chartImageUrl
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
          {activeVectorStoreId && (
            <Tooltip label="This chat is using a vector store to search through your documents">
              <Badge colorScheme="green" display="flex" alignItems="center">
                <Box mr={1}>Vector Store Active</Box>
                <FiInfo size="12px" />
              </Badge>
            </Tooltip>
          )}
          <FormControl display="flex" alignItems="center" width="auto">
            <FormLabel htmlFor="web-search" mb="0" fontSize="sm" fontWeight="medium" color="gray.700" _dark={{ color: "white" }}>
              Web Search
            </FormLabel>
            <Tooltip label={useWebSearch ? "Web search is enabled - I'll search the internet for current information" : "Enable to search the web for current information"}>
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
                    <FiSearch size="10px" color="white" />
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
            maxWidth="80%"
            p={3}
            borderRadius="lg"
            bg={msg.role === 'user' ? 'blue.500' : 'gray.100'}
            color={msg.role === 'user' ? 'white' : 'black'}
            position="relative"
          >
            {/* Add web search indicator for user messages */}
            {msg.role === 'user' && msg.webSearchEnabled && (
              <Box 
                position="absolute" 
                top="-8px" 
                right="-8px" 
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
            
            <ReactMarkdown>{msg.content}</ReactMarkdown>
            
            {/* Display chart image if available */}
            {msg.hasChartImage && msg.chartImageUrl && (
              <Box mt={3} borderWidth="1px" borderRadius="md" overflow="hidden">
                <Text fontSize="xs" fontWeight="bold" p={2} bg="blue.50" _dark={{ bg: "blue.900" }}>
                  Generated Chart
                </Text>
                <Image 
                  src={`/api/images/${msg.chartImageUrl}`} 
                  alt="Generated Chart" 
                  maxH="300px" 
                  mx="auto" 
                  p={2}
                />
              </Box>
            )}
            
            {msg.sources && msg.sources.length > 0 && (
              <Box mt={2} pt={2} borderTopWidth="1px" borderTopColor="gray.200">
                <Text fontSize="xs" fontWeight="bold" mb={1}>Sources:</Text>
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
                          <Text as="a" href={source.document} target="_blank" color="blue.500" textDecoration="underline" fontWeight="medium">
                            {source.section} <FiExternalLink size="10px" style={{ display: 'inline', marginLeft: '2px' }} />
                          </Text>
                          <Text color="blue.600" fontSize="10px" fontWeight="medium" mb="2px" _dark={{ color: "blue.200" }}>
                            Web Source
                          </Text>
                          {source.description && (
                            <Text color="gray.500" fontSize="10px" mt="2px" _dark={{ color: "gray.300" }}>
                              {source.description}
                            </Text>
                          )}
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
          isLoading={loading}
          disabled={!input.trim() || !threadId}
          leftIcon={<FiSend />}
        >
          Send
        </Button>
      </HStack>
    </Box>
  );
};

export default PolicyChat; 