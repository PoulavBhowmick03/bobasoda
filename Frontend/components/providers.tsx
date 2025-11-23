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
  const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID || '';

  if (!privyAppId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#27262c' }}>
        <div className="text-center max-w-2xl space-y-4 text-yellow-400">
          <h1 className="text-2xl font-bold">Privy App ID required</h1>
          <p className="opacity-75">Set NEXT_PUBLIC_PRIVY_APP_ID in .env.local</p>
          <p className="text-sm opacity-60">Get your ID from https://dashboard.privy.io/</p>
        </div>
      </div>
    );
  }

  return (
    <PrivyProvider
      appId={privyAppId}
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
