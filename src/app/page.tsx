'use client';

import React, { useState } from 'react';
import { Container, Box, Tabs, TabList, TabPanels, Tab, TabPanel, useToast, useColorModeValue } from '@chakra-ui/react';
import DocumentUpload from './components/DocumentUpload';
import DocumentLibrary from './components/DocumentLibrary';
import PolicyChat from './components/PolicyChat';
import Header from './components/Header';

export default function Home() {
  const toast = useToast();
  const [activeVectorStoreId, setActiveVectorStoreId] = useState<string | null>(null);
  
  // Use color mode values for dynamic styling
  const bgColor = useColorModeValue('gray.50', 'gray.800');
  
  const handleUploadComplete = (documents: any[], vectorStoreId?: string) => {
    if (vectorStoreId) {
      setActiveVectorStoreId(vectorStoreId);
      toast({
        title: 'Vector store created',
        description: `New vector store (${vectorStoreId}) is now active for chat`,
        status: 'info',
        duration: 5000,
        isClosable: true,
      });
    }
  };
  
  return (
    <Box bg={bgColor} minH="100vh" py={10}>
      <Container maxW="container.xl">
        <Header 
          title="County of San Mateo Policy Assistant" 
          subtitle="Upload, manage, and query your organization's policy documents"
        />
        
        <Tabs variant="enclosed" colorScheme="blue" borderColor="sanMateo.blue">
          <TabList>
            <Tab _selected={{ color: 'white', bg: 'sanMateo.blue' }}>Chat</Tab>
            <Tab _selected={{ color: 'white', bg: 'sanMateo.blue' }}>Documents Library</Tab>
            <Tab _selected={{ color: 'white', bg: 'sanMateo.blue' }}>Upload</Tab>
          </TabList>
          
          <TabPanels>
            <TabPanel>
              <PolicyChat vectorStoreId={activeVectorStoreId} />
            </TabPanel>
            
            <TabPanel>
              <DocumentLibrary />
            </TabPanel>
            
            <TabPanel>
              <DocumentUpload onUploadComplete={handleUploadComplete} />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Container>
    </Box>
  );
} 