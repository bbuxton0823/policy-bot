'use client';

import { ChakraProvider, ColorModeScript } from '@chakra-ui/react';
import { theme } from './theme';
import { CacheProvider } from '@chakra-ui/next-js';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ColorModeScript initialColorMode={theme.config.initialColorMode} />
      <CacheProvider>
        <ChakraProvider theme={theme}>
          {children}
        </ChakraProvider>
      </CacheProvider>
    </>
  );
} 