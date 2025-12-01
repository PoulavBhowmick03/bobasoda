'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react'

interface BaseAccountContextType {
  ready: boolean
  authenticated: boolean
  address: string | null
  login: () => Promise<void>
  logout: () => void
  getProvider: () => any
}

const BaseAccountContext = createContext<BaseAccountContextType | null>(null)

export function BaseAccountProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)
  const [address, setAddress] = useState<string | null>(null)
  const sdkRef = useRef<any>(null)

  useEffect(() => {
    // Only initialize on client side
    const initSDK = async () => {
      try {
        const { createBaseAccountSDK } = await import('@base-org/account')
        sdkRef.current = createBaseAccountSDK({
          appName: 'BobaSoda',
          appLogoUrl: 'https://bobasoda.app/bobasoda-logo.png',
        })

        // Check if already connected from previous session
        try {
          const provider = sdkRef.current.getProvider()
          const accounts = await provider.request({ method: 'eth_accounts' }) as string[]
          if (accounts && accounts.length > 0) {
            setAddress(accounts[0])
            setAuthenticated(true)
          }
        } catch (error) {
          console.debug('No existing connection:', error)
        }
      } catch (error) {
        console.error('Failed to initialize Base Account SDK:', error)
      }
      setReady(true)
    }

    initSDK()
  }, [])

  const login = useCallback(async () => {
    if (!sdkRef.current) {
      throw new Error('SDK not initialized')
    }

    try {
      const provider = sdkRef.current.getProvider()
      const nonce = crypto.randomUUID().replace(/-/g, '')

      const result = await provider.request({
        method: 'wallet_connect',
        params: [{
          version: '1',
          capabilities: {
            signInWithEthereum: {
              nonce,
              chainId: '0x14a34', // Base Sepolia (84532 in hex)
            },
          },
        }],
      }) as { accounts?: Array<{ address?: string } | string> }

      if (result?.accounts && result.accounts.length > 0) {
        const account = result.accounts[0]
        const userAddress = typeof account === 'string' ? account : account.address
        if (userAddress) {
          setAddress(userAddress)
          setAuthenticated(true)
        }
      }
    } catch (error) {
      console.error('Login failed:', error)
      throw error
    }
  }, [])

  const logout = useCallback(() => {
    setAuthenticated(false)
    setAddress(null)
    // Clear any stored session
    if (typeof window !== 'undefined') {
      localStorage.removeItem('base_account_session')
    }
  }, [])

  const getProvider = useCallback(() => {
    if (!sdkRef.current) {
      return null
    }
    return sdkRef.current.getProvider()
  }, [])

  return (
    <BaseAccountContext.Provider
      value={{
        ready,
        authenticated,
        address,
        login,
        logout,
        getProvider,
      }}
    >
      {children}
    </BaseAccountContext.Provider>
  )
}

export function useBaseAccount() {
  const context = useContext(BaseAccountContext)
  if (!context) {
    throw new Error('useBaseAccount must be used within a BaseAccountProvider')
  }
  return context
}

export function useBaseWallet() {
  const { authenticated, address, getProvider } = useBaseAccount()

  return {
    authenticated,
    address,
    getProvider,
    walletClientType: 'base-account' as const,
  }
}
