"use client"

import BottomNav from "@/components/bottom-nav"
import { useViewportHeight } from "@/hooks/useViewportHeight"
import { useBettingHistory } from "@/hooks/useBettingHistory"
import { usePrivy, useWallets } from "@privy-io/react-auth"
import { useMemo } from "react"

export default function History() {
  const viewportHeight = useViewportHeight()
  const { authenticated } = usePrivy()
  const { wallets } = useWallets()
  const evmAddress = useMemo(() => {
    if (!authenticated || wallets.length === 0) return ''
    const embedded = wallets.find((w) => w.walletClientType === 'privy') || wallets[0]
    return embedded?.address || ''
  }, [authenticated, wallets])
  const { history, isLoading, clearHistory } = useBettingHistory()

  const formatAmount = (amount: string) => {
    return `${parseFloat(amount).toFixed(4)} ETH`
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString()
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'won':
        return 'text-green-400'
      case 'lost':
        return 'text-red-400'
      case 'claimed':
        return 'text-blue-400'
      default:
        return 'text-yellow-400'
    }
  }

  return (
    <main
      className="w-screen overflow-hidden"
      style={{
        height: viewportHeight ? `${viewportHeight}px` : '100vh',
        backgroundColor: '#27262c',
      }}
    >
      <div
        className="w-full max-w-md md:max-w-xl mx-auto relative"
        style={{
          height: '100%',
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <div className="relative h-full w-full flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-gray-700">
            <div className="flex justify-between items-center">
              <h1 className="text-3xl font-bold text-yellow-400">
                Betting History
              </h1>
              {history.length > 0 && (
                <button
                  onClick={clearHistory}
                  className="text-sm text-red-400 hover:text-red-300"
                >
                  Clear All
                </button>
              )}
            </div>
            {evmAddress && (
              <p className="text-xs text-gray-400 mt-2 truncate">
                {evmAddress}
              </p>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto pb-20">
            {!evmAddress ? (
              <div className="flex flex-col items-center justify-center h-full p-8">
                <p className="text-yellow-400 opacity-75 text-center">
                  Connect your wallet to view betting history
                </p>
              </div>
            ) : isLoading ? (
              <div className="flex flex-col items-center justify-center h-full p-8">
                <p className="text-yellow-400 opacity-75">Loading...</p>
              </div>
            ) : history.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-8">
                <p className="text-yellow-400 opacity-75 text-center">
                  No bets yet. Start playing to see your history!
                </p>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {history.map((bet) => (
                  <div
                    key={bet.id}
                    className="bg-gray-800 rounded-lg p-4 border border-gray-700"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className={`font-bold text-lg ${
                          bet.direction === 'bull' ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {bet.direction === 'bull' ? '📈 BULL' : '📉 BEAR'}
                        </span>
                        <p className="text-sm text-gray-400">Round #{bet.epoch}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-semibold">
                          {formatAmount(bet.amount)}
                        </p>
                        <p className={`text-sm font-medium ${getStatusColor(bet.status)}`}>
                          {bet.status.toUpperCase()}
                        </p>
                      </div>
                    </div>
                    
                    {bet.lockPrice && bet.closePrice && (
                      <div className="text-xs text-gray-400 mt-2 space-y-1">
                        <p>Lock: ${bet.lockPrice.toFixed(2)}</p>
                        <p>Close: ${bet.closePrice.toFixed(2)}</p>
                        {bet.payout && (
                          <p className="text-green-400">
                            Payout: {formatAmount(bet.payout)}
                          </p>
                        )}
                      </div>
                    )}
                    
                    <p className="text-xs text-gray-500 mt-2">
                      {formatDate(bet.timestamp)}
                    </p>
                    
                    {bet.txHash && (
                      <p className="text-xs text-blue-400 mt-1 truncate">
                        Tx: {bet.txHash}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <BottomNav />
        </div>
      </div>
    </main>
  )
}
