import type { PrivyClientConfig } from '@privy-io/react-auth';

export const baseSepolia = {
  id: 84532,
  name: 'Base Sepolia',
  network: 'base-sepolia',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://sepolia.base.org'],
    },
    public: {
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
};

export const privyConfig: PrivyClientConfig = {
  embeddedWallets: {
    ethereum: {
      createOnLogin: 'all-users',
    },
  },
  loginMethods: ['email', 'wallet'],
  defaultChain: baseSepolia,
  supportedChains: [baseSepolia],
  appearance: {
    theme: 'dark',
    accentColor: '#F59E0B', // Yellow-400 to match app theme
    logo: undefined,
    walletList: ['metamask', 'coinbase_wallet'],
  },
};
