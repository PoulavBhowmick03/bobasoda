'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { defineChain } from 'viem';
import { WagmiProvider, createConfig, http } from 'wagmi';
import MiniAppProvider from './miniapp-provider';
import { BaseAccountProvider } from '@/lib/base-account';

const queryClient = new QueryClient();

// Define Base Sepolia as a proper viem chain
export const baseSepoliaChain = defineChain({
  id: 84532,
  name: 'Base Sepolia',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://sepolia.base.org'],
    },
  },
  blockExplorers: {
    default: {
      name: 'BaseScan',
      url: 'https://sepolia.basescan.org',
    },
  },
  testnet: true,
});

export const wagmiConfig = createConfig({
  chains: [baseSepoliaChain],
  transports: {
    [baseSepoliaChain.id]: http('https://sepolia.base.org'),
  },
});

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <BaseAccountProvider>
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>
          <MiniAppProvider>
            {children}
          </MiniAppProvider>
        </WagmiProvider>
      </QueryClientProvider>
    </BaseAccountProvider>
  );
}
