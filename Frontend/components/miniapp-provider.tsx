'use client';

import { useEffect, ReactNode } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';

interface MiniAppProviderProps {
  children: ReactNode;
}

export default function MiniAppProvider({ children }: MiniAppProviderProps) {
  useEffect(() => {
    // Once app is ready to be displayed (per docs)
    sdk.actions.ready();
  }, []);

  return <>{children}</>;
}
