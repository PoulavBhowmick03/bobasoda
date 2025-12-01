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
      // Set ready early to prevent blank screen
      setReady(true)

      try {
        const { sdk } = await import('@farcaster/miniapp-sdk')
        const inMiniApp = await sdk.isInMiniApp()
        setIsInMiniApp(inMiniApp)

        if (inMiniApp) {
          // In Mini App - get user context
          try {
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
          } catch (e) {
            console.log('Could not get Mini App context:', e)
          }
        } else {
          // Not in Mini App - try Base Account SDK
          try {
            const { createBaseAccountSDK } = await import('@base-org/account')
            sdkRef.current = createBaseAccountSDK({
              appName: 'BobaSoda',
              appLogoUrl: 'https://bobasodamini.vercel.app/bobasoda-logo.png',
            })

            const provider = sdkRef.current.getProvider()
            const accounts = await provider.request({ method: 'eth_accounts' }) as string[]
            if (accounts && accounts.length > 0) {
              setAddress(accounts[0])
              setAuthenticated(true)
            }
          } catch (e) {
            console.log('Base Account SDK not available:', e)
          }
        }
      } catch (e) {
        console.log('SDK init error:', e)
      }
    }

    initSDK()
  }, [])

  const login = useCallback(async () => {
    if (isInMiniApp) return

    if (!sdkRef.current) {
      throw new Error('SDK not initialized')
    }

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
  }, [isInMiniApp])

  const logout = useCallback(() => {
    if (isInMiniApp) return
    setAuthenticated(false)
    setAddress(null)
  }, [isInMiniApp])

  const getProvider = useCallback(() => {
    return sdkRef.current?.getProvider() || null
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
