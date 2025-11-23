'use client'

/**
 * CDP Profile Component
 *
 * Displays user profile information when using Coinbase embedded wallets.
 * Shows wallet address, email, balance, and provides sign out functionality.
 */

import { useCurrentUser, useEvmAddress, useIsInitialized, useSignOut } from '@coinbase/cdp-hooks'
import { useEffect, useState } from 'react'
import { createPublicClient, formatEther, http } from 'viem'
import { baseSepoliaChain } from './providers'
import CDPAuthButton from './cdp-auth-button'

export default function CDPProfile() {
  const { isInitialized } = useIsInitialized()
  const { currentUser } = useCurrentUser()
  const { evmAddress } = useEvmAddress()
  const { signOut } = useSignOut()
  const [balance, setBalance] = useState<string | null>(null)

  // Fetch balance when address is available
  useEffect(() => {
    if (!evmAddress) return

    const fetchBalance = async () => {
      try {
        const publicClient = createPublicClient({
          chain: baseSepoliaChain,
          transport: http('https://sepolia.base.org'),
        })

        const bal = await publicClient.getBalance({
          address: evmAddress as `0x${string}`,
        })

        setBalance(formatEther(bal))
      } catch (error) {
        console.error('Failed to fetch balance:', error)
      }
    }

    fetchBalance()
    // Refresh balance every 10 seconds
    const interval = setInterval(fetchBalance, 10000)

    return () => clearInterval(interval)
  }, [evmAddress])

  // Show loading state
  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-yellow-400 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-black font-bold">Loading wallet...</p>
        </div>
      </div>
    )
  }

  // Show authentication if not logged in
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-yellow-400 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold text-black mb-2">Welcome to BobaSoda</h1>
            <p className="text-black opacity-75">Sign in to start playing</p>
          </div>
          <CDPAuthButton />
        </div>
      </div>
    )
  }

  const userEmail = currentUser.authenticationMethods.email?.email
  const userPhone = currentUser.authenticationMethods.sms?.phoneNumber

  // Show profile
  return (
    <div className="min-h-screen bg-yellow-400 p-4 sm:p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-black mb-2">Your Profile</h1>
          <p className="text-black opacity-75">Manage your wallet and settings</p>
        </div>

        {/* Wallet Info Card */}
        <div className="bg-black rounded-2xl p-6 space-y-4">
          <div>
            <p className="text-yellow-400 text-sm opacity-75 mb-1">Wallet Address</p>
            <p className="text-yellow-400 font-mono text-sm break-all">
              {evmAddress || 'Loading...'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-yellow-400 text-sm opacity-75 mb-1">Network</p>
              <p className="text-yellow-400 font-bold">Base Sepolia</p>
            </div>
            <div>
              <p className="text-yellow-400 text-sm opacity-75 mb-1">Balance</p>
              <p className="text-yellow-400 font-bold">
                {balance ? `${parseFloat(balance).toFixed(4)} ETH` : 'Loading...'}
              </p>
            </div>
          </div>
        </div>

        {/* Account Info Card */}
        <div className="bg-black rounded-2xl p-6 space-y-4">
          <div>
            <p className="text-yellow-400 text-sm opacity-75 mb-1">Email</p>
            <p className="text-yellow-400 font-semibold">
              {userEmail || userPhone || 'Not available'}
            </p>
          </div>

          <div>
            <p className="text-yellow-400 text-sm opacity-75 mb-1">User ID</p>
            <p className="text-yellow-400 font-mono text-xs break-all">
              {currentUser.userId || 'Not available'}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <a
            href={`https://sepolia.basescan.org/address/${evmAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full bg-black text-yellow-400 font-bold py-4 px-6 rounded-xl hover:bg-gray-800 transition text-center"
          >
            View on BaseScan →
          </a>

          <button
            onClick={() => {
              if (confirm('Are you sure you want to sign out?')) {
                signOut()
              }
            }}
            className="w-full bg-red-600 text-white font-bold py-4 px-6 rounded-xl hover:bg-red-700 transition"
          >
            Sign Out
          </button>
        </div>

        {/* Info Cards */}
        <div className="space-y-3 pt-6 border-t-2 border-black border-opacity-20">
          <div className="bg-black bg-opacity-20 rounded-xl p-4">
            <p className="text-black text-sm">
              <span className="font-bold">💡 Tip:</span> You can export your private key anytime from the Coinbase portal
            </p>
          </div>

          <div className="bg-black bg-opacity-20 rounded-xl p-4">
            <p className="text-black text-sm">
              <span className="font-bold">🔐 Security:</span> Your wallet is secured with device-specific cryptographic keys
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
