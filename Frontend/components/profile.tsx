"use client"

import { useState, useMemo } from "react"
import { Copy, Check, Gift } from "lucide-react"
import { useCDPTransaction } from '@/hooks/useCDPTransaction'
import { useUserBets } from '@/hooks/useUserBets'
import { PREDICTION_ADDRESS } from '@/lib/prediction-contract'

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
  const [copied, setCopied] = useState(false)
  const { claimRewards, isPending: isClaimPending } = useCDPTransaction()
  const { bets, isLoading: isBetsLoading } = useUserBets()

  // Calculate total earned from claimed winning bets
  const totalEarned = useMemo(() => {
    const total = bets
      .filter(bet => bet.claimed && bet.hasWon === true && bet.reward)
      .reduce((sum, bet) => sum + parseFloat(bet.reward || '0'), 0)
    return total.toFixed(4)
  }, [bets])

  // Claim state
  const [roundInput, setRoundInput] = useState('')
  const [claimMessage, setClaimMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [showClaimSection, setShowClaimSection] = useState(false)

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

  const handleClaim = async () => {
    setClaimMessage(null)

    if (!roundInput.trim()) {
      setClaimMessage({ type: 'error', text: 'Please enter at least one round number' })
      return
    }

    try {
      // Parse input - support comma-separated values
      const roundNumbers = roundInput
        .split(',')
        .map(r => r.trim())
        .filter(r => r.length > 0)
        .map(r => parseInt(r, 10))

      // Validate all are numbers
      if (roundNumbers.some(isNaN)) {
        setClaimMessage({ type: 'error', text: 'Invalid round number(s). Please enter valid numbers.' })
        return
      }

      console.log('Claiming rewards for rounds:', roundNumbers)

      const result = await claimRewards(PREDICTION_ADDRESS, roundNumbers)

      if (result.success) {
        setClaimMessage({
          type: 'success',
          text: `Successfully claimed rewards for round(s): ${roundNumbers.join(', ')}! Check your wallet.`
        })
        setRoundInput('')
      } else {
        setClaimMessage({
          type: 'error',
          text: result.error || 'Failed to claim rewards. Make sure you won these rounds and haven\'t claimed already.'
        })
      }
    } catch (err: any) {
      console.error('Claim error:', err)
      setClaimMessage({
        type: 'error',
        text: err?.message || 'An error occurred while claiming rewards'
      })
    }
  }

  return (
    <div
      className="h-full w-full flex flex-col p-8 overflow-y-auto"
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

          {/* Claim Rewards Button */}
          <button
            onClick={() => setShowClaimSection(!showClaimSection)}
            className="w-full mb-6 bg-gradient-to-r from-yellow-400/20 to-yellow-500/20 border-2 border-yellow-400 text-yellow-400 px-6 py-4 rounded-xl font-bold text-lg hover:bg-yellow-400/30 transition flex items-center justify-center gap-2"
          >
            <Gift className="w-6 h-6" />
            {showClaimSection ? 'Hide Claim Section' : 'Claim Rewards'}
          </button>

          {/* Claim Rewards Section */}
          {showClaimSection && (
            <div className="mb-8 p-6 bg-gradient-to-r from-yellow-400/10 to-yellow-500/10 border border-yellow-400/30 rounded-2xl">
              <div className="flex items-center gap-3 mb-4">
                <Gift className="w-6 h-6 text-yellow-400" />
                <h3 className="text-xl font-bold text-yellow-400">Claim Your Winnings</h3>
              </div>

              <p className="text-yellow-400 opacity-75 text-sm mb-4">
                Enter the round number(s) you won to claim your rewards. Separate multiple rounds with commas (e.g., 123, 124, 125)
              </p>

              <div className="flex gap-3 mb-4">
                <input
                  type="text"
                  value={roundInput}
                  onChange={(e) => setRoundInput(e.target.value)}
                  placeholder="Enter round number(s)..."
                  className="flex-1 bg-black/50 border border-yellow-400/30 rounded-xl px-4 py-3 text-yellow-400 placeholder-yellow-400/50 focus:outline-none focus:border-yellow-400 transition"
                  disabled={isClaimPending}
                />
                <button
                  onClick={handleClaim}
                  disabled={!roundInput.trim() || isClaimPending}
                  className="px-6 py-3 bg-yellow-400 text-black font-bold rounded-xl hover:bg-yellow-500 disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed transition flex items-center gap-2"
                >
                  {isClaimPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      Claiming...
                    </>
                  ) : (
                    <>
                      <Gift className="w-5 h-5" />
                      Claim
                    </>
                  )}
                </button>
              </div>

              {/* Success/Error Messages */}
              {claimMessage && (
                <div
                  className={`p-4 rounded-xl border ${
                    claimMessage.type === 'success'
                      ? 'bg-green-500/10 border-green-500/30 text-green-400'
                      : 'bg-red-500/10 border-red-500/30 text-red-400'
                  }`}
                >
                  <p className="text-sm font-semibold">{claimMessage.text}</p>
                </div>
              )}
            </div>
          )}

          {/* Total Earned Component */}
          <div className="bg-white rounded-2xl p-6 shadow-lg mb-8">
            <p className="text-black opacity-60 text-sm mb-2">
              TOTAL REWARDS EARNED
            </p>
            {isBetsLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                <p className="text-black text-xl">Loading...</p>
              </div>
            ) : (
              <p className="text-black text-3xl sm:text-4xl font-bold">
                {totalEarned} ETH
              </p>
            )}
            <p className="text-black opacity-50 text-xs mt-2">
              From {bets.filter(b => b.claimed && b.hasWon).length} claimed winning bets
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
