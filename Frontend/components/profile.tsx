"use client"

import { useState } from "react"
import { Copy, Check } from "lucide-react"

interface ProfileProps {
  onConnectWallet?: () => void
  onDisconnectWallet?: () => void
  onSend?: () => void
  isConnected?: boolean
  walletAddress?: string
  balance?: string
  isLoadingBalance?: boolean
}

export default function Profile({
  onConnectWallet,
  onDisconnectWallet,
  onSend,
  isConnected = false,
  walletAddress = "",
  balance = "0.00",
  isLoadingBalance = false
}: ProfileProps = {}) {
  const [totalEarned] = useState("0.00")
  const [copied, setCopied] = useState(false)

  const formatWalletAddress = (address: string) => {
    if (!address) return ""
    return `${address.slice(0, 4)}...${address.slice(-2)}`
  }

  const handleCopyAddress = async () => {
    if (walletAddress) {
      await navigator.clipboard.writeText(walletAddress)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleConnect = () => {
    if (onConnectWallet) {
      onConnectWallet()
    }
  }

  const handleDisconnect = () => {
    if (onDisconnectWallet) {
      onDisconnectWallet()
    }
  }

  const handleSend = () => {
    if (onSend) {
      onSend()
    }
  }

  return (
    <div
      className="h-full w-full flex flex-col p-8"
      style={{ backgroundColor: '#27262c' }}
    >
      {/* Header Spacer */}
      <div
        className="mb-8"
        style={{
          height: 'calc(1rem + env(safe-area-inset-top, 0px))',
        }}
      />

      {/* Title */}
      <h1 className="text-4xl sm:text-5xl font-bold text-yellow-400 mb-12">
        Profile
      </h1>

      {!isConnected ? (
        /* Connect Wallet Button - Onboarding State */
        <div className="flex-1 flex flex-col items-center justify-center mb-24">
          <p className="text-yellow-400 opacity-75 text-lg mb-8 text-center">
            Connect your wallet to get started
          </p>
          <button
            onClick={handleConnect}
            className="bg-yellow-400 text-black px-12 py-5 rounded-2xl font-bold text-2xl hover:bg-yellow-500 transition shadow-lg"
          >
            Connect Wallet
          </button>
        </div>
      ) : (
        <>
          {/* Wallet Address Section */}
          <div className="mb-6">
            <p className="text-yellow-400 opacity-75 text-sm mb-3">
              WALLET ADDRESS
            </p>
            <div className="flex items-center gap-3">
              <p className="text-yellow-400 text-xl sm:text-2xl font-bold">
                {formatWalletAddress(walletAddress)}
              </p>
              <button
                onClick={handleCopyAddress}
                className="p-2 hover:bg-yellow-400/10 rounded-lg transition"
                title="Copy address"
              >
                {copied ? (
                  <Check className="w-5 h-5 text-green-400" />
                ) : (
                  <Copy className="w-5 h-5 text-yellow-400" />
                )}
              </button>
            </div>
          </div>

          {/* Wallet Balance Section */}
          <div className="mb-6">
            <p className="text-yellow-400 opacity-75 text-sm mb-3">
              BALANCE
            </p>
            <p className="text-yellow-400 text-3xl sm:text-4xl font-bold mb-2">
              {isLoadingBalance ? "..." : balance} ETH
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 mb-8">
            <button
              onClick={handleSend}
              className="flex-1 bg-yellow-400 text-black px-6 py-3 rounded-xl font-bold text-lg hover:bg-yellow-500 transition"
            >
              Send
            </button>
            <button
              onClick={handleDisconnect}
              className="flex-1 bg-transparent border-2 border-yellow-400 text-yellow-400 px-6 py-3 rounded-xl font-bold text-lg hover:bg-yellow-400 hover:text-black transition"
            >
              Disconnect
            </button>
          </div>

          {/* Total Earned Component */}
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <p className="text-black opacity-60 text-sm mb-2">
              TOTAL $ EARNED
            </p>
            <p className="text-black text-3xl sm:text-4xl font-bold">
              ${totalEarned}
            </p>
          </div>
        </>
      )}

      {/* Bottom Navigation Spacer */}
      <div
        className="mt-auto"
        style={{
          height: 'calc(5.5rem + env(safe-area-inset-bottom, 0px))',
        }}
      />
    </div>
  )
}
