'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { WagmiProvider } from '@privy-io/wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { privyConfig } from '@/lib/privy-config';
import { http } from 'wagmi';
import { createConfig } from '@privy-io/wagmi';
import { ReactNode } from 'react';
import { defineChain } from 'viem';

const queryClient = new QueryClient();

// Define BSC Testnet as a proper viem chain
export const bscTestnetChain = defineChain({
  id: 97,
  name: 'BNB Chain Testnet',
  nativeCurrency: {
    name: 'BNB',
    symbol: 'tBNB',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://data-seed-prebsc-1-s1.binance.org:8545'],
    },
  },
  blockExplorers: {
    default: {
      name: 'BscScan',
      url: 'https://testnet.bscscan.com',
    },
  },
  testnet: true,
});

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
  chains: [baseSepoliaChain, bscTestnetChain],
  transports: {
    [baseSepoliaChain.id]: http('https://sepolia.base.org'),
    [bscTestnetChain.id]: http('https://data-seed-prebsc-1-s1.binance.org:8545'),
  },
});

export default function Providers({ children }: { children: ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID || '';

  // If no app ID is set, show error message
  if (!appId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#27262c' }}>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-yellow-400 mb-4">Configuration Required</h1>
          <p className="text-yellow-400 opacity-75 mb-2">Please set your Privy App ID in the .env.local file</p>
          <p className="text-yellow-400 opacity-75 text-sm">Get your App ID from https://dashboard.privy.io/</p>
        </div>
      </div>
    );
  }

  return (
    <PrivyProvider
      appId={appId}
      config={privyConfig}
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>
          {children}
        </WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}
