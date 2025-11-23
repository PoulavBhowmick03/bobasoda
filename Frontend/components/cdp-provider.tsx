'use client'

/**
 * Coinbase CDP Provider Wrapper
 *
 * Wraps the app with the CDP React provider so hooks/components can be used anywhere.
 */

import { ReactNode } from 'react'
import { CDPReactProvider } from '@coinbase/cdp-react'
import { CDP_PROJECT_ID, cdpConfig, cdpTheme } from '@/lib/cdp-config'

interface CDPProviderProps {
  children: ReactNode
}

export default function CDPProvider({ children }: CDPProviderProps) {
  if (!CDP_PROJECT_ID) {
    return <>{children}</>
  }

  return (
    <CDPReactProvider config={cdpConfig} theme={cdpTheme} name="Bobasoda">
      {children}
    </CDPReactProvider>
  )
}
