"use client"

import { useState, useEffect } from 'react'
import { Trophy, TrendingUp, Target, Zap, Medal, Crown, Gift, CheckCircle, XCircle, Clock, HelpCircle } from 'lucide-react'
import type { LeaderboardEntry, LeaderboardFilters } from '@/lib/types/leaderboard'
import { useCDPTransaction } from '@/hooks/useCDPTransaction'
import { useUserBets } from '@/hooks/useUserBets'
import { PREDICTION_ADDRESS } from '@/lib/prediction-contract'

export default function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [filters, setFilters] = useState<LeaderboardFilters>({
    timeframe: 'all',
    sortBy: 'profit',
  })
  const [isLoading, setIsLoading] = useState(false)
  const { claimRewards, isPending: isClaimPending } = useCDPTransaction()
  const { bets, isLoading: isBetsLoading, stats } = useUserBets()

  // Claim state
  const [roundInput, setRoundInput] = useState('')
  const [claimMessage, setClaimMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    loadLeaderboard()
  }, [])

  const loadLeaderboard = async () => {
    setIsLoading(true)

    try {
      // No data - waiting for real data source integration
      setEntries([])
      setIsLoading(false)
    } catch (err) {
      console.error('Error loading leaderboard:', err)
      setIsLoading(false)
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

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-6 h-6 text-yellow-400" />
      case 2:
        return <Medal className="w-6 h-6 text-gray-300" />
      case 3:
        return <Medal className="w-6 h-6 text-amber-600" />
      default:
        return <span className="text-gray-400 font-bold">#{rank}</span>
    }
  }

  const getRankBgColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-400/20 to-yellow-500/20 border-yellow-400/30'
      case 2:
        return 'bg-gradient-to-r from-gray-300/20 to-gray-400/20 border-gray-300/30'
      case 3:
        return 'bg-gradient-to-r from-amber-500/20 to-amber-600/20 border-amber-500/30'
      default:
        return 'bg-white/5 border-white/10'
    }
  }

  return (
    <div className="h-full w-full bg-black overflow-y-auto pb-24">
      {/* Header */}
      <div
        className="sticky top-0 z-10 bg-black border-b border-yellow-400/30 px-4 sm:px-6"
        style={{
          paddingTop: 'calc(2rem + env(safe-area-inset-top, 0px))',
          paddingBottom: '1rem',
        }}
      >
        <div className="flex items-center gap-3 mb-4">
          <Trophy className="w-8 h-8 text-yellow-400" />
          <h1 className="text-3xl sm:text-4xl font-bold text-white">Leaderboard</h1>
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setFilters({ ...filters, sortBy: 'profit' })}
            className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition ${
              filters.sortBy === 'profit'
                ? 'bg-yellow-400 text-black'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <TrendingUp className="w-4 h-4 inline mr-1" />
            Profit
          </button>
          <button
            onClick={() => setFilters({ ...filters, sortBy: 'winRate' })}
            className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition ${
              filters.sortBy === 'winRate'
                ? 'bg-yellow-400 text-black'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <Target className="w-4 h-4 inline mr-1" />
            Win Rate
          </button>
          <button
            onClick={() => setFilters({ ...filters, sortBy: 'streak' })}
            className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition ${
              filters.sortBy === 'streak'
                ? 'bg-yellow-400 text-black'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <Zap className="w-4 h-4 inline mr-1" />
            Streak
          </button>
        </div>
      </div>

      {/* Claim Rewards Section */}
      <div className="mx-4 sm:mx-6 mt-6 mb-6 p-6 bg-gradient-to-r from-yellow-400/10 to-yellow-500/10 border border-yellow-400/30 rounded-2xl">
        <div className="flex items-center gap-3 mb-4">
          <Gift className="w-6 h-6 text-yellow-400" />
          <h3 className="text-xl font-bold text-white">Claim Winnings</h3>
        </div>

        <p className="text-gray-300 text-sm mb-4">
          Enter the round number(s) you won to claim your rewards. Separate multiple rounds with commas (e.g., 123, 124, 125)
        </p>

        <div className="flex gap-3 mb-4">
          <input
            type="text"
            value={roundInput}
            onChange={(e) => setRoundInput(e.target.value)}
            placeholder="Enter round number(s)..."
            className="flex-1 bg-black/50 border border-yellow-400/30 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 transition"
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

      {/* My Bets Section */}
      <div className="mx-4 sm:mx-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-2xl font-bold text-white">My Bets</h3>
          {!isBetsLoading && bets.length > 0 && (
            <div className="flex gap-3 text-sm">
              <span className="text-green-400">{stats.wins}W</span>
              <span className="text-red-400">{stats.losses}L</span>
              <span className="text-gray-400">{stats.winRate}% WR</span>
            </div>
          )}
        </div>

        {/* Info message if there are bets awaiting results */}
        {!isBetsLoading && bets.some(b => b.isAwaitingResult) && (
          <div className="mb-4 p-4 bg-yellow-400/10 border border-yellow-400/30 rounded-xl">
            <div className="flex items-start gap-2">
              <HelpCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-yellow-400 font-semibold text-sm">Awaiting Oracle Results</p>
                <p className="text-gray-300 text-xs mt-1">
                  Some rounds have ended but are waiting for the contract operator to finalize results.
                  Win/loss status will update automatically once the oracle price is set.
                </p>
              </div>
            </div>
          </div>
        )}

        {isBetsLoading ? (
          <div className="text-center py-8">
            <div className="inline-block w-6 h-6 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-400 mt-2 text-sm">Loading your bets...</p>
          </div>
        ) : bets.length === 0 ? (
          <div className="text-center py-8 bg-white/5 border border-white/10 rounded-2xl">
            <Target className="w-12 h-12 text-gray-600 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">No bets placed yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {bets.map((bet) => (
              <div
                key={bet.epoch}
                className={`bg-white/5 border rounded-2xl p-4 transition hover:bg-white/10 ${
                  bet.canClaim
                    ? 'border-green-400/50 bg-green-400/5'
                    : bet.hasWon === true
                    ? 'border-green-500/30'
                    : bet.hasWon === false
                    ? 'border-red-500/30'
                    : 'border-white/10'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Left: Round Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-gray-400 text-sm">Round #{bet.epoch}</span>
                      {bet.isActive && (
                        <span className="flex items-center gap-1 text-xs text-blue-400 bg-blue-400/10 px-2 py-1 rounded-full">
                          <Clock className="w-3 h-3" />
                          Active
                        </span>
                      )}
                      {bet.canClaim && (
                        <span className="text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded-full font-semibold">
                          Claimable!
                        </span>
                      )}
                      {bet.claimed && (
                        <span className="text-xs text-gray-400 bg-gray-400/10 px-2 py-1 rounded-full">
                          Claimed
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 mb-2">
                      <span
                        className={`text-lg font-bold ${
                          bet.position === 'Bull' ? 'text-green-400' : 'text-red-400'
                        }`}
                      >
                        {bet.position === 'Bull' ? '🟢' : '🔴'} {bet.position}
                      </span>
                      <span className="text-white font-semibold">{bet.amount} ETH</span>
                    </div>

                    {!bet.isActive && bet.lockPrice && bet.closePrice && (
                      <div className="text-xs text-gray-400">
                        Lock: ${bet.lockPrice} → Close: ${bet.closePrice}
                      </div>
                    )}
                  </div>

                  {/* Right: Status */}
                  <div className="flex flex-col items-end gap-1">
                    {bet.isActive ? (
                      <div className="flex items-center gap-1 text-blue-400">
                        <Clock className="w-5 h-5" />
                        <span className="text-sm font-semibold">Active</span>
                      </div>
                    ) : bet.isAwaitingResult ? (
                      <div className="flex items-center gap-1 text-yellow-400">
                        <HelpCircle className="w-5 h-5" />
                        <span className="text-sm font-semibold">Awaiting Result</span>
                      </div>
                    ) : bet.hasWon === true ? (
                      <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-1 text-green-400">
                          <CheckCircle className="w-6 h-6" />
                          <span className="font-bold">Won!</span>
                        </div>
                        {bet.reward && !bet.claimed && (
                          <span className="text-xs text-green-400">≈ {bet.reward} ETH</span>
                        )}
                      </div>
                    ) : bet.hasWon === false ? (
                      <div className="flex items-center gap-1 text-red-400">
                        <XCircle className="w-6 h-6" />
                        <span className="font-bold">Lost</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Leaderboard Entries */}
      <div className="px-4 sm:px-6 py-6 space-y-3">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-white mt-4">Loading leaderboard...</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12">
            <Trophy className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-white text-lg">No players yet</p>
            <p className="text-gray-400 text-sm mt-2">Be the first to place a bet!</p>
          </div>
        ) : (
          entries.map((entry) => (
            <div
              key={entry.address}
              className={`border rounded-2xl p-4 sm:p-5 transition hover:scale-[1.02] ${getRankBgColor(
                entry.rank
              )}`}
            >
              <div className="flex items-center gap-4">
                {/* Rank */}
                <div className="flex-shrink-0 w-12 text-center">{getRankIcon(entry.rank)}</div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-white font-bold text-lg truncate">
                      {entry.username || `${entry.address.slice(0, 6)}...${entry.address.slice(-4)}`}
                    </p>
                  </div>
                  <p className="text-gray-400 text-xs truncate">{entry.address}</p>
                </div>

                {/* Stats */}
                <div className="flex-shrink-0 text-right">
                  <p className="text-yellow-400 font-bold text-xl">{entry.totalProfit} ETH</p>
                  <div className="flex gap-3 mt-1">
                    <span className="text-green-400 text-sm">{entry.winRate}% WR</span>
                    {entry.currentStreak > 0 && (
                      <span className="text-orange-400 text-sm flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        {entry.currentStreak}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Additional Stats Row */}
              <div className="mt-3 pt-3 border-t border-white/10 flex justify-between text-sm">
                <span className="text-gray-400">
                  <span className="text-white font-semibold">{entry.totalBets}</span> bets
                </span>
                <span className="text-gray-400">
                  Win rate: <span className="text-white font-semibold">{entry.winRate}%</span>
                </span>
                {entry.currentStreak > 0 && (
                  <span className="text-gray-400">
                    Streak: <span className="text-orange-400 font-semibold">{entry.currentStreak}</span>
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
