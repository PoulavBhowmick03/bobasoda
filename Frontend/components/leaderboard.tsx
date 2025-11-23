"use client"

import { useState, useEffect } from 'react'
import { Trophy, TrendingUp, Target, Zap, Medal, Crown } from 'lucide-react'
import type { LeaderboardEntry, LeaderboardFilters } from '@/lib/types/leaderboard'
import { useSynapseStorage } from '@/hooks/useSynapseStorage'

export default function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [filters, setFilters] = useState<LeaderboardFilters>({
    timeframe: 'all',
    sortBy: 'profit',
  })
  const [isLoading, setIsLoading] = useState(true)
  const { downloadLeaderboard, isConfigured } = useSynapseStorage()

  useEffect(() => {
    loadLeaderboard()
  }, [])

  const loadLeaderboard = async () => {
    setIsLoading(true)

    try {
      // Check localStorage for cached leaderboard CID
      const cachedCid = localStorage.getItem('bobasoda_leaderboard_cid')

      if (cachedCid && isConfigured) {
        const data = await downloadLeaderboard(cachedCid)
        if (data && data.entries) {
          setEntries(data.entries)
          setIsLoading(false)
          return
        }
      }

      // Mock data for demonstration (replace with real data from Filecoin)
      const mockEntries: LeaderboardEntry[] = [
        {
          address: '0x1234...5678',
          username: 'CryptoKing',
          rank: 1,
          totalProfit: '12.5',
          winRate: 78,
          totalBets: 145,
          currentStreak: 8,
        },
        {
          address: '0x8765...4321',
          username: 'BullishBob',
          rank: 2,
          totalProfit: '9.3',
          winRate: 72,
          totalBets: 98,
          currentStreak: 5,
        },
        {
          address: '0xabcd...efgh',
          username: 'DiamondHands',
          rank: 3,
          totalProfit: '7.8',
          winRate: 85,
          totalBets: 67,
          currentStreak: 12,
        },
      ]

      setEntries(mockEntries)
      setIsLoading(false)
    } catch (err) {
      console.error('Error loading leaderboard:', err)
      setIsLoading(false)
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

      {/* Info Banner */}
      {!isConfigured && (
        <div className="mx-4 sm:mx-6 mb-6 p-4 bg-yellow-400/10 border border-yellow-400/30 rounded-xl">
          <p className="text-yellow-300 text-sm">
            <strong>Note:</strong> Leaderboard data is stored on Filecoin using Synapse SDK. Configure your
            Synapse private key to enable persistent storage.
          </p>
        </div>
      )}
    </div>
  )
}
