'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react'

interface MiniAppUser {
  fid: number
  username?: string
  displayName?: string
  pfpUrl?: string
}

interface BaseAccountContextType {
  ready: boolean
  authenticated: boolean
  address: string | null
  user: MiniAppUser | null
  isInMiniApp: boolean
  login: () => Promise<void>
  logout: () => void
  getProvider: () => any
}

const BaseAccountContext = createContext<BaseAccountContextType | null>(null)

export function BaseAccountProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)
  const [address, setAddress] = useState<string | null>(null)
  const [user, setUser] = useState<MiniAppUser | null>(null)
  const [isInMiniApp, setIsInMiniApp] = useState(false)
  const sdkRef = useRef<any>(null)

  useEffect(() => {
    const initSDK = async () => {
      try {
        // First check if we're in a Mini App context
        const { sdk } = await import('@farcaster/miniapp-sdk')
        const inMiniApp = await sdk.isInMiniApp()
        setIsInMiniApp(inMiniApp)

        if (inMiniApp) {
          // In Mini App - get user context directly
          const context = await sdk.context
          if (context?.user) {
            setUser({
              fid: context.user.fid,
              username: context.user.username,
              displayName: context.user.displayName,
              pfpUrl: context.user.pfpUrl,
            })
            setAuthenticated(true)
          }
          // Signal app is ready
          await sdk.actions.ready()
        } else {
          // Not in Mini App - use Base Account SDK for sign-in
          try {
            const { createBaseAccountSDK } = await import('@base-org/account')
            sdkRef.current = createBaseAccountSDK({
              appName: 'BobaSoda',
              appLogoUrl: 'https://bobasodamini.vercel.app/bobasoda-logo.png',
            })

            // Check if already connected
            const provider = sdkRef.current.getProvider()
            const accounts = await provider.request({ method: 'eth_accounts' }) as string[]
            if (accounts && accounts.length > 0) {
              setAddress(accounts[0])
              setAuthenticated(true)
            }
          } catch (error) {
            console.debug('Base Account SDK not available:', error)
          }
        }
      } catch (error) {
        console.error('SDK initialization error:', error)
      }

      setReady(true)
    }

    initSDK()
  }, [])

  const login = useCallback(async () => {
    if (isInMiniApp) {
      // Already authenticated in Mini App
      return
    }

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
              chainId: '0x14a34',
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
  }, [isInMiniApp])

  const logout = useCallback(() => {
    if (isInMiniApp) return // Can't logout from Mini App context
    setAuthenticated(false)
    setAddress(null)
  }, [isInMiniApp])

  const getProvider = useCallback(() => {
    if (!sdkRef.current) return null
    return sdkRef.current.getProvider()
  }, [])

  return (
    <BaseAccountContext.Provider
      value={{
        ready,
        authenticated,
        address,
        user,
        isInMiniApp,
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
