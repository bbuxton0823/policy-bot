'use client';

import React from 'react';
import { Flex, Heading, Text, Box, useColorModeValue } from '@chakra-ui/react';
import DarkModeToggle from './DarkModeToggle';

interface HeaderProps {
  title?: string;
  subtitle?: string;
}

const Header: React.FC<HeaderProps> = ({ 
  title = "Policy Assistant", 
  subtitle = "Upload, manage, and query your organization's policy documents" 
}) => {
  const textColor = useColorModeValue('gray.600', 'gray.300');
  
  return (
    <Flex direction="row" align="center" justify="space-between" mb={8} width="100%">
      <Flex direction="row" align="center">
        <Box
          bg="sanMateo.blue"
          color="sanMateo.gold"
          p={3}
          borderRadius="md"
          fontWeight="bold"
          fontSize="lg"
          mr={4}
          textAlign="center"
          width="60px"
          height="60px"
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          SMC
        </Box>
        <Flex direction="column">
          <Heading as="h1" size="xl" mb={2}>{title}</Heading>
          <Text color={textColor} textAlign="left">{subtitle}</Text>
        </Flex>
      </Flex>
      <DarkModeToggle />
    </Flex>
  );
};

export default Header; 