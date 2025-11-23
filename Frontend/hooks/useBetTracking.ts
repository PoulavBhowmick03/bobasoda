"use client"

import { useState, useCallback, useEffect } from 'react'
import { useUserStats } from './useSynapseStorage'
import type { UserStats, UserBet } from '@/lib/types/leaderboard'

/**
 * Hook for tracking user bets and updating statistics
 *
 * Tracks all bets, wins, losses, and calculates stats like win rate and streaks
 */
export function useBetTracking(userAddress: string | undefined) {
  const { stats, loadStats, saveStats, isLoading } = useUserStats(userAddress)
  const [initialized, setInitialized] = useState(false)

  // Load stats when user address changes
  useEffect(() => {
    if (userAddress && !initialized) {
      loadStats()
      setInitialized(true)
    }
  }, [userAddress, initialized, loadStats])

  /**
   * Record a new bet
   */
  const recordBet = useCallback(
    async (bet: {
      epoch: number
      token: string
      direction: 'bull' | 'bear'
      amount: string
    }) => {
      if (!stats || !userAddress) {
        console.warn('Cannot record bet: user stats not loaded')
        return
      }

      const newBet: UserBet = {
        ...bet,
        timestamp: Date.now(),
        won: null, // Pending
        payout: null,
      }

      const updatedStats: UserStats = {
        ...stats,
        totalBets: stats.totalBets + 1,
        pending: stats.pending + 1,
        totalWagered: (parseFloat(stats.totalWagered) + parseFloat(bet.amount)).toString(),
        lastBetTimestamp: Date.now(),
        bets: [...stats.bets, newBet],
        updatedAt: Date.now(),
      }

      console.log(`📝 Recording bet: ${bet.amount} ETH on ${bet.token} ${bet.direction.toUpperCase()}`)
      await saveStats(updatedStats)
    },
    [stats, userAddress, saveStats]
  )

  /**
   * Update bet result (win/loss) when round ends
   */
  const updateBetResult = useCallback(
    async (epoch: number, won: boolean, payout: string | null) => {
      if (!stats || !userAddress) {
        console.warn('Cannot update bet result: user stats not loaded')
        return
      }

      const updatedBets = stats.bets.map((bet) =>
        bet.epoch === epoch && bet.won === null ? { ...bet, won, payout } : bet
      )

      // Calculate new stats
      const wins = stats.wins + (won ? 1 : 0)
      const losses = stats.losses + (won ? 0 : 1)
      const pending = stats.pending - 1

      // Update streak
      let currentStreak = stats.currentStreak
      if (won) {
        currentStreak = currentStreak >= 0 ? currentStreak + 1 : 1
      } else {
        currentStreak = currentStreak <= 0 ? currentStreak - 1 : -1
      }

      const bestStreak = Math.max(stats.bestStreak, Math.abs(currentStreak))

      // Update profit
      const profit = payout ? parseFloat(payout) : 0
      const wager = updatedBets.find((b) => b.epoch === epoch)?.amount || '0'
      const netProfit = won ? profit - parseFloat(wager) : -parseFloat(wager)
      const totalProfit = (parseFloat(stats.totalProfit) + netProfit).toString()

      // Calculate win rate
      const winRate = wins + losses > 0 ? (wins / (wins + losses)) * 100 : 0

      const updatedStats: UserStats = {
        ...stats,
        wins,
        losses,
        pending,
        currentStreak,
        bestStreak,
        totalProfit,
        winRate: Math.round(winRate * 100) / 100,
        bets: updatedBets,
        updatedAt: Date.now(),
      }

      console.log(
        `${won ? '✅' : '❌'} Bet result for epoch ${epoch}: ${won ? 'WON' : 'LOST'} (Profit: ${netProfit > 0 ? '+' : ''}${netProfit} ETH)`
      )
      console.log(`📊 New stats: ${wins}W / ${losses}L (${winRate.toFixed(1)}% WR) | Streak: ${currentStreak}`)

      await saveStats(updatedStats)
    },
    [stats, userAddress, saveStats]
  )

  /**
   * Get pending bets
   */
  const getPendingBets = useCallback(() => {
    if (!stats) return []
    return stats.bets.filter((bet) => bet.won === null)
  }, [stats])

  /**
   * Get bet history for a specific token
   */
  const getBetsByToken = useCallback(
    (token: string) => {
      if (!stats) return []
      return stats.bets.filter((bet) => bet.token === token)
    },
    [stats]
  )

  /**
   * Get recent bets (last N bets)
   */
  const getRecentBets = useCallback(
    (count: number = 10) => {
      if (!stats) return []
      return stats.bets.slice(-count).reverse()
    },
    [stats]
  )

  return {
    stats,
    recordBet,
    updateBetResult,
    getPendingBets,
    getBetsByToken,
    getRecentBets,
    isLoading,
  }
}
