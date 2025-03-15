'use client';

import React, { useState, useEffect } from 'react';
import { 
  Box, Table, Thead, Tbody, Tr, Th, Td, 
  Badge, IconButton, Text, Flex, Spacer, 
  useDisclosure, Modal, ModalOverlay, 
  ModalContent, ModalHeader, ModalBody, 
  ModalFooter, Button, Tooltip,
  useToast, AlertDialog, AlertDialogBody,
  AlertDialogFooter, AlertDialogHeader,
  AlertDialogContent, AlertDialogOverlay
} from '@chakra-ui/react';
import { FiTrash2, FiEye, FiRefreshCw, FiAlertTriangle, FiCopy } from 'react-icons/fi';

interface Document {
  id: string;
  name: string;
  uploadedAt: string;
  status: string;
  version?: string;
  fileType?: string;
  size?: number;
  sections?: Array<{ title: string }>;
  possibleDuplicate?: boolean;
  duplicateGroupId?: string;
}

const DocumentLibrary: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [duplicateGroups, setDuplicateGroups] = useState<Record<string, Document[]>>({});
  const [selectedDuplicateGroup, setSelectedDuplicateGroup] = useState<Document[]>([]);
  const [documentToKeep, setDocumentToKeep] = useState<Document | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { 
    isOpen: isDeleteDialogOpen, 
    onOpen: onDeleteDialogOpen, 
    onClose: onDeleteDialogClose 
  } = useDisclosure();
  const cancelRef = React.useRef<HTMLButtonElement>(null);
  const toast = useToast();

  useEffect(() => {
    fetchDocuments();
  }, []);

  useEffect(() => {
    // Group documents by duplicateGroupId
    const groups: Record<string, Document[]> = {};
    documents.forEach(doc => {
      if (doc.possibleDuplicate && doc.duplicateGroupId) {
        if (!groups[doc.duplicateGroupId]) {
          groups[doc.duplicateGroupId] = [];
        }
        groups[doc.duplicateGroupId].push(doc);
      }
    });
    setDuplicateGroups(groups);
  }, [documents]);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/documents', {
        cache: 'no-store',
        headers: {
          'pragma': 'no-cache',
          'cache-control': 'no-cache'
        }
      });
      if (response.ok) {
        const data = await response.json();
        const docsWithDuplicates = identifyPossibleDuplicates(data.documents);
        setDocuments(docsWithDuplicates);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  // Function to identify possible duplicates based on similar names
  const identifyPossibleDuplicates = (docs: Document[]): Document[] => {
    // Create a map to group documents by normalized name
    const nameGroups: Record<string, Document[]> = {};
    
    // Helper function to normalize document names for comparison
    const normalizeName = (name: string): string => {
      return name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '') // Remove non-alphanumeric characters
        .trim();
    };
    
    // Group documents by normalized name
    docs.forEach(doc => {
      const normalizedName = normalizeName(doc.name);
      if (!nameGroups[normalizedName]) {
        nameGroups[normalizedName] = [];
      }
      nameGroups[normalizedName].push(doc);
    });
    
    // Mark documents as possible duplicates if they belong to a group with more than one document
    let duplicateGroupCounter = 0;
    const enhancedDocs = [...docs];
    
    Object.entries(nameGroups).forEach(([normalizedName, group]) => {
      if (group.length > 1) {
        const groupId = `duplicate-group-${duplicateGroupCounter++}`;
        group.forEach(doc => {
          const docIndex = enhancedDocs.findIndex(d => d.id === doc.id);
          if (docIndex !== -1) {
            enhancedDocs[docIndex] = {
              ...enhancedDocs[docIndex],
              possibleDuplicate: true,
              duplicateGroupId: groupId
            };
          }
        });
      }
    });
    
    return enhancedDocs;
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

  // Get all documents that are in the same duplicate group as the current document
  const getDuplicatesForDocument = (doc: Document): Document[] => {
    if (!doc.possibleDuplicate || !doc.duplicateGroupId) return [];
    return documents.filter(
      d => d.id !== doc.id && d.duplicateGroupId === doc.duplicateGroupId
    );
  };

  // Function to handle opening the duplicate deletion dialog
  const handleOpenDuplicateDialog = (doc: Document) => {
    if (!doc.possibleDuplicate || !doc.duplicateGroupId) return;
    
    const group = documents.filter(d => d.duplicateGroupId === doc.duplicateGroupId);
    if (group.length <= 1) return;
    
    // Sort by upload date (newest first)
    const sortedGroup = [...group].sort((a, b) => 
      new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );
    
    setSelectedDuplicateGroup(sortedGroup);
    setDocumentToKeep(sortedGroup[0]); // Default to keeping the newest document
    onDeleteDialogOpen();
  };

  // Function to delete all duplicates except the one to keep
  const handleDeleteDuplicates = async () => {
    if (!documentToKeep || selectedDuplicateGroup.length <= 1) return;
    
    const docsToDelete = selectedDuplicateGroup.filter(doc => doc.id !== documentToKeep.id);
    
    try {
      let successCount = 0;
      
      for (const doc of docsToDelete) {
        const response = await fetch(`/api/documents/${doc.id}`, {
          method: 'DELETE',
        });
        
        if (response.ok) {
          successCount++;
        }
      }
      
      if (successCount > 0) {
        toast({
          title: 'Duplicates deleted',
          description: `Successfully deleted ${successCount} duplicate document${successCount > 1 ? 's' : ''}.`,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
        
        // Refresh the document list
        fetchDocuments();
      }
    } catch (error) {
      console.error('Error deleting duplicates:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete duplicate documents.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
    
    onDeleteDialogClose();
  };

  // Count the number of duplicate groups
  const duplicateGroupCount = Object.keys(duplicateGroups).length;

  return (
    <Box p={6} borderWidth="1px" borderRadius="lg" bg="white" shadow="md" _dark={{ bg: "gray.800" }}>
      <Flex mb={4} align="center">
        <Text fontSize="xl" fontWeight="bold">Policy Documents Library</Text>
        <Spacer />
        {duplicateGroupCount > 0 && (
          <Button
            leftIcon={<FiCopy />}
            colorScheme="orange"
            size="sm"
            mr={2}
            onClick={() => {
              // Find the first document in a duplicate group
              const firstDuplicateDoc = documents.find(doc => doc.possibleDuplicate);
              if (firstDuplicateDoc) {
                handleOpenDuplicateDialog(firstDuplicateDoc);
              }
            }}
          >
            Clean Duplicates ({duplicateGroupCount})
          </Button>
        )}
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
        <Box 
          maxH="400px" 
          overflowY="auto" 
          overflowX="auto" 
          borderWidth="1px" 
          borderRadius="md"
          css={{
            '&::-webkit-scrollbar': {
              width: '8px',
              height: '8px',
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
          <Table variant="simple">
            <Thead position="sticky" top={0} bg="white" zIndex={1} boxShadow="sm" _dark={{ bg: "gray.700" }}>
              <Tr>
                <Th>Document Name</Th>
                <Th>Upload Date</Th>
                <Th>Status</Th>
                <Th>Version</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {documents.map((doc) => {
                const duplicates = getDuplicatesForDocument(doc);
                return (
                  <Tr 
                    key={doc.id} 
                    _dark={{ 
                      bg: doc.possibleDuplicate ? "yellow.900" : "gray.800", 
                      _hover: { bg: "gray.700" } 
                    }}
                    bg={doc.possibleDuplicate ? "yellow.50" : undefined}
                  >
                    <Td>
                      <Flex align="center">
                        {doc.name}
                        {doc.possibleDuplicate && (
                          <Tooltip 
                            hasArrow 
                            label={`Possible duplicate${duplicates.length > 1 ? 's' : ''}: ${duplicates.map(d => d.name).join(', ')}`}
                            placement="top"
                          >
                            <Box ml={2} color="orange.500" cursor="pointer" onClick={() => handleOpenDuplicateDialog(doc)}>
                              <FiAlertTriangle />
                            </Box>
                          </Tooltip>
                        )}
                      </Flex>
                    </Td>
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
                );
              })}
            </Tbody>
          </Table>
        </Box>
      )}

      {/* Document Details Modal */}
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
                
                {selectedDoc.possibleDuplicate && (
                  <Box mt={4} p={3} bg="yellow.50" borderRadius="md" borderWidth="1px" borderColor="yellow.300">
                    <Flex align="center" mb={2}>
                      <Box color="orange.500" mr={2}>
                        <FiAlertTriangle />
                      </Box>
                      <Text fontWeight="bold" color="orange.700">Possible Duplicate Documents</Text>
                    </Flex>
                    <Box>
                      {getDuplicatesForDocument(selectedDoc).map((dup, idx) => (
                        <Text key={idx} fontSize="sm" mb={1}>
                          • {dup.name} (Uploaded: {new Date(dup.uploadedAt).toLocaleDateString()})
                        </Text>
                      ))}
                    </Box>
                    <Button 
                      mt={2} 
                      size="sm" 
                      colorScheme="orange" 
                      leftIcon={<FiCopy />}
                      onClick={() => {
                        onClose();
                        handleOpenDuplicateDialog(selectedDoc);
                      }}
                    >
                      Clean Duplicates
                    </Button>
                  </Box>
                )}
                
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

      {/* Duplicate Deletion Confirmation Dialog */}
      <AlertDialog
        isOpen={isDeleteDialogOpen}
        leastDestructiveRef={cancelRef}
        onClose={onDeleteDialogClose}
        size="lg"
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Clean Duplicate Documents
            </AlertDialogHeader>

            <AlertDialogBody>
              <Text mb={4}>
                We found {selectedDuplicateGroup.length} similar documents. Select which document to keep and delete the rest:
              </Text>
              <Box maxH="300px" overflowY="auto" borderWidth="1px" borderRadius="md" p={2}>
                {selectedDuplicateGroup.map((doc) => (
                  <Flex 
                    key={doc.id} 
                    p={2} 
                    mb={2} 
                    borderWidth="1px" 
                    borderRadius="md"
                    bg={documentToKeep?.id === doc.id ? "blue.50" : undefined}
                    _dark={{ bg: documentToKeep?.id === doc.id ? "blue.900" : "gray.700" }}
                    onClick={() => setDocumentToKeep(doc)}
                    cursor="pointer"
                  >
                    <Box flex="1">
                      <Text fontWeight="bold">{doc.name}</Text>
                      <Text fontSize="sm">Uploaded: {new Date(doc.uploadedAt).toLocaleString()}</Text>
                      <Text fontSize="sm">Type: {doc.fileType}</Text>
                      <Text fontSize="sm">Size: {doc.size ? Math.round(doc.size / 1024) : 0} KB</Text>
                    </Box>
                    <Box alignSelf="center">
                      <Button 
                        size="sm" 
                        colorScheme={documentToKeep?.id === doc.id ? "blue" : "gray"}
                        onClick={(e) => {
                          e.stopPropagation();
                          setDocumentToKeep(doc);
                        }}
                      >
                        Keep This
                      </Button>
                    </Box>
                  </Flex>
                ))}
              </Box>
              <Text mt={4} color="red.500" fontWeight="bold">
                Warning: This will permanently delete {selectedDuplicateGroup.length - 1} document(s).
              </Text>
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onDeleteDialogClose}>
                Cancel
              </Button>
              <Button 
                colorScheme="red" 
                onClick={handleDeleteDuplicates} 
                ml={3}
                isDisabled={!documentToKeep}
              >
                Delete Duplicates
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
};

export default DocumentLibrary; 