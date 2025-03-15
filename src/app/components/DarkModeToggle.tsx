'use client';

import React from 'react';
import { IconButton, useColorMode, useColorModeValue, Tooltip } from '@chakra-ui/react';
import { MoonIcon, SunIcon } from '@chakra-ui/icons';

const DarkModeToggle: React.FC = () => {
  const { colorMode, toggleColorMode } = useColorMode();
  const SwitchIcon = useColorModeValue(MoonIcon, SunIcon);
  const buttonText = useColorModeValue('Switch to Dark Mode', 'Switch to Light Mode');

  return (
    <Tooltip label={buttonText} hasArrow placement="bottom">
      <IconButton
        aria-label={buttonText}
        icon={<SwitchIcon />}
        onClick={toggleColorMode}
        variant="ghost"
        color={useColorModeValue('sanMateo.blue', 'sanMateo.gold')}
        _hover={{ bg: useColorModeValue('sanMateo.blue', 'sanMateo.gold'), color: useColorModeValue('white', 'black') }}
        size="md"
        borderRadius="full"
      />
    </Tooltip>
  );
};

export default DarkModeToggle; 