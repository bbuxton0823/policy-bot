'use client';

import React, { useState, useCallback } from 'react';
import { Button, Box, Text, VStack, Progress, Flex, useToast } from '@chakra-ui/react';
import { FiUpload, FiFile, FiCheckCircle } from 'react-icons/fi';

interface DocumentUploadProps {
  onUploadComplete: (documents: any[], vectorStoreId?: string) => void;
}

const DocumentUpload: React.FC<DocumentUploadProps> = ({ onUploadComplete }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const toast = useToast();
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
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
    if (!isDragging) {
      setIsDragging(true);
    }
  }, [isDragging]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files).filter(file => {
        const fileType = file.type;
        return fileType === 'application/pdf' || 
               fileType === 'application/msword' || 
               fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
               fileType === 'text/plain';
      });
      
      if (droppedFiles.length > 0) {
        setFiles(droppedFiles);
      } else {
        toast({
          title: 'Invalid file type',
          description: 'Please upload PDF, Word, or text documents only',
          status: 'warning',
          duration: 3000,
          isClosable: true,
        });
      }
    }
  }, [toast]);
  
  const handleUpload = async () => {
    if (files.length === 0) return;
    
    setUploading(true);
    setProgress(0);
    
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
        toast({
          title: 'Documents uploaded successfully',
          description: `${result.documents.length} document(s) processed and added to the vector store`,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
        onUploadComplete(result.documents, result.vectorStoreId);
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Error uploading documents:', error);
      toast({
        title: 'Upload failed',
        description: 'There was an error processing your documents',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setUploading(false);
      setFiles([]);
    }
  };
  
  return (
    <Box p={6} borderWidth="1px" borderRadius="lg" bg="white" shadow="md">
      <VStack spacing={4} align="stretch">
        <Text fontSize="xl" fontWeight="bold">Upload Policy Documents</Text>
        
        <Box
          borderWidth="2px"
          borderRadius="md"
          borderStyle="dashed"
          p={10}
          borderColor={isDragging ? "blue.400" : "gray.300"}
          bg={isDragging ? "blue.50" : "gray.50"}
          textAlign="center"
          cursor="pointer"
          _hover={{ bg: isDragging ? "blue.50" : "gray.100" }}
          onClick={() => document.getElementById('file-input')?.click()}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          transition="all 0.2s"
        >
          <input
            id="file-input"
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.txt"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          <FiUpload size="48px" color={isDragging ? "#4299E1" : "#A0AEC0"} style={{ margin: '0 auto 16px' }} />
          <Text fontWeight={isDragging ? "medium" : "normal"}>
            {isDragging ? "Drop files here" : "Drag and drop files here or click to browse"}
          </Text>
          <Text fontSize="sm" color="gray.500">Supports PDF, Word, and text documents</Text>
        </Box>
        
        {files.length > 0 && (
          <Box>
            <Text mb={2}>Selected files ({files.length}):</Text>
            <VStack align="stretch" maxH="200px" overflowY="auto">
              {files.map((file, index) => (
                <Flex key={index} align="center">
                  <FiFile />
                  <Text ml={2}>{file.name}</Text>
                </Flex>
              ))}
            </VStack>
          </Box>
        )}
        
        {uploading && <Progress value={progress} size="sm" colorScheme="blue" />}
        
        <Button 
          leftIcon={uploading ? undefined : <FiUpload />}
          colorScheme="blue"
          isLoading={uploading}
          loadingText="Processing documents..."
          onClick={handleUpload}
          isDisabled={files.length === 0}
        >
          {uploading ? 'Processing...' : 'Upload Documents'}
        </Button>
      </VStack>
    </Box>
  );
};

export default DocumentUpload; 