'use client';

import { useEffect, ReactNode } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';

interface MiniAppProviderProps {
  children: ReactNode;
}

export default function MiniAppProvider({ children }: MiniAppProviderProps) {
  useEffect(() => {
    const initMiniApp = async () => {
      try {
        // Signal that the app is ready to be displayed
        await sdk.actions.ready();
      } catch (error) {
        // Not running in a miniapp context, ignore
        console.debug('MiniApp SDK not available:', error);
      }
    };

    initMiniApp();
  }, []);

  return <>{children}</>;
}
