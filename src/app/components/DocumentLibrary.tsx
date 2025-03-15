'use client';

import React, { useState, useEffect } from 'react';
import { 
  Box, Table, Thead, Tbody, Tr, Th, Td, 
  Badge, IconButton, Text, Flex, Spacer, 
  useDisclosure, Modal, ModalOverlay, 
  ModalContent, ModalHeader, ModalBody, 
  ModalFooter, Button
} from '@chakra-ui/react';
import { FiTrash2, FiEye, FiRefreshCw } from 'react-icons/fi';

interface Document {
  id: string;
  name: string;
  uploadedAt: string;
  status: string;
  version?: string;
  fileType?: string;
  size?: number;
  sections?: Array<{ title: string }>;
}

const DocumentLibrary: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/documents');
      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this document?')) {
      try {
        const response = await fetch(`/api/documents/${id}`, {
          method: 'DELETE',
        });
        
        if (response.ok) {
          setDocuments(documents.filter(doc => doc.id !== id));
        }
      } catch (error) {
        console.error('Error deleting document:', error);
      }
    }
  };

  const handleViewDetails = (doc: Document) => {
    setSelectedDoc(doc);
    onOpen();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge colorScheme="green">Active</Badge>;
      case 'archived':
        return <Badge colorScheme="yellow">Archived</Badge>;
      case 'processing':
        return <Badge colorScheme="blue">Processing</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };

  return (
    <Box p={6} borderWidth="1px" borderRadius="lg" bg="white" shadow="md">
      <Flex mb={4} align="center">
        <Text fontSize="xl" fontWeight="bold">Policy Documents</Text>
        <Spacer />
        <IconButton
          icon={<FiRefreshCw />}
          aria-label="Refresh documents"
          size="sm"
          onClick={fetchDocuments}
          isLoading={loading}
        />
      </Flex>

      {documents.length === 0 ? (
        <Box textAlign="center" py={10} color="gray.500">
          <Text>No documents uploaded yet</Text>
        </Box>
      ) : (
        <Table variant="simple">
          <Thead>
            <Tr>
              <Th>Document Name</Th>
              <Th>Upload Date</Th>
              <Th>Status</Th>
              <Th>Version</Th>
              <Th>Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {documents.map((doc) => (
              <Tr key={doc.id}>
                <Td>{doc.name}</Td>
                <Td>{new Date(doc.uploadedAt).toLocaleDateString()}</Td>
                <Td>{getStatusBadge(doc.status)}</Td>
                <Td>{doc.version || '1.0'}</Td>
                <Td>
                  <IconButton
                    icon={<FiEye />}
                    aria-label="View document details"
                    size="sm"
                    mr={2}
                    onClick={() => handleViewDetails(doc)}
                  />
                  <IconButton
                    icon={<FiTrash2 />}
                    aria-label="Delete document"
                    size="sm"
                    colorScheme="red"
                    onClick={() => handleDelete(doc.id)}
                  />
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}

      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Document Details</ModalHeader>
          <ModalBody>
            {selectedDoc && (
              <Box>
                <Text><strong>Name:</strong> {selectedDoc.name}</Text>
                <Text><strong>Uploaded:</strong> {new Date(selectedDoc.uploadedAt).toLocaleString()}</Text>
                <Text><strong>Status:</strong> {selectedDoc.status}</Text>
                <Text><strong>Version:</strong> {selectedDoc.version || '1.0'}</Text>
                <Text><strong>File Type:</strong> {selectedDoc.fileType}</Text>
                <Text><strong>Size:</strong> {selectedDoc.size ? Math.round(selectedDoc.size / 1024) : 0} KB</Text>
                {selectedDoc.sections && (
                  <Box mt={4}>
                    <Text fontWeight="bold">Document Sections:</Text>
                    <Box maxH="200px" overflowY="auto" mt={2} p={2} borderWidth="1px" borderRadius="md">
                      {selectedDoc.sections.map((section, idx) => (
                        <Text key={idx} fontSize="sm" mb={1}>• {section.title}</Text>
                      ))}
                    </Box>
                  </Box>
                )}
              </Box>
            )}
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={onClose}>
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default DocumentLibrary; 