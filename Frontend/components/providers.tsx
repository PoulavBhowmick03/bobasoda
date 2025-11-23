'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { defineChain } from 'viem';
import CDPProvider from './cdp-provider';
import { CDP_PROJECT_ID } from '@/lib/cdp-config';

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

export default function Providers({ children }: { children: ReactNode }) {
  if (!CDP_PROJECT_ID) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#27262c' }}>
        <div className="text-center max-w-2xl space-y-4 text-yellow-400">
          <h1 className="text-2xl font-bold">CDP project ID required</h1>
          <p className="opacity-75">Set NEXT_PUBLIC_CDP_PROJECT_ID in .env.local</p>
          <p className="text-sm opacity-60">Get your ID from https://portal.cdp.coinbase.com/</p>
        </div>
      </div>
    );
  }

  return (
    <CDPProvider>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </CDPProvider>
  );
}
