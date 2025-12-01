'use client';

import { useEffect, ReactNode } from 'react';

interface MiniAppProviderProps {
  children: ReactNode;
}

export default function MiniAppProvider({ children }: MiniAppProviderProps) {
  useEffect(() => {
    const initMiniApp = async () => {
      try {
        const { sdk } = await import('@farcaster/miniapp-sdk');
        // Signal that the app is ready to be displayed
        await sdk.actions.ready();
        console.log('MiniApp SDK ready called successfully');
      } catch (error) {
        console.log('MiniApp SDK error:', error);
      }
    };

    // Call ready immediately
    initMiniApp();
  }, []);

  return <>{children}</>;
}
