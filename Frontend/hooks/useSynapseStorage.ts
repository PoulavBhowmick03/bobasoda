"use client"

import { useState, useCallback } from 'react'
import { Synapse } from '@filoz/synapse-sdk'
import { SYNAPSE_CONFIG, isSynapseConfigured, getUserStorageKey, STORAGE_KEYS } from '@/lib/synapse-config'
import type { UserStats, LeaderboardData } from '@/lib/types/leaderboard'

/**
 * Hook for interacting with Synapse SDK for decentralized storage
 *
 * Stores user stats and leaderboard data on Filecoin using Synapse
 */
export function useSynapseStorage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Initialize Synapse client
   */
  const getSynapseClient = useCallback(async () => {
    if (!isSynapseConfigured()) {
      throw new Error('Synapse SDK not configured. Please set NEXT_PUBLIC_SYNAPSE_PRIVATE_KEY')
    }

    try {
      const synapse = await Synapse.create({
        privateKey: SYNAPSE_CONFIG.privateKey,
        rpcURL: SYNAPSE_CONFIG.rpcURL,
      })
      return synapse
    } catch (err) {
      console.error('Failed to initialize Synapse:', err)
      throw new Error('Failed to initialize Synapse SDK')
    }
  }, [])

  /**
   * Upload user stats to Filecoin
   */
  const uploadUserStats = useCallback(async (userStats: UserStats): Promise<string | null> => {
    setIsLoading(true)
    setError(null)

    try {
      const synapse = await getSynapseClient()
      const data = JSON.stringify(userStats)
      const encoder = new TextEncoder()
      const bytes = encoder.encode(data)

      console.log(`📤 Uploading user stats for ${userStats.address}...`)
      const { pieceCid, size } = await synapse.storage.upload(bytes)
      const cid = typeof pieceCid === 'string' ? pieceCid : (pieceCid as any)?.toString?.() ?? ''

      console.log(`✅ User stats uploaded successfully`)
      console.log(`   Piece CID: ${cid}`)
      console.log(`   Size: ${size} bytes`)

      setIsLoading(false)
      return cid || null
    } catch (err) {
      console.error('❌ Error uploading user stats:', err)
      setError(err instanceof Error ? err.message : 'Failed to upload user stats')
      setIsLoading(false)
      return null
    }
  }, [getSynapseClient])

  /**
   * Download user stats from Filecoin
   */
  const downloadUserStats = useCallback(async (pieceCid: string): Promise<UserStats | null> => {
    setIsLoading(true)
    setError(null)

    try {
      const synapse = await getSynapseClient()

      console.log(`📥 Downloading user stats from CID: ${pieceCid}...`)
      const bytes = await synapse.storage.download(pieceCid)

      const decoder = new TextDecoder()
      const data = decoder.decode(bytes)
      const userStats: UserStats = JSON.parse(data)

      console.log(`✅ User stats downloaded successfully`)
      setIsLoading(false)
      return userStats
    } catch (err) {
      console.error('❌ Error downloading user stats:', err)
      setError(err instanceof Error ? err.message : 'Failed to download user stats')
      setIsLoading(false)
      return null
    }
  }, [getSynapseClient])

  /**
   * Upload leaderboard data to Filecoin
   */
  const uploadLeaderboard = useCallback(async (leaderboard: LeaderboardData): Promise<string | null> => {
    setIsLoading(true)
    setError(null)

    try {
      const synapse = await getSynapseClient()
      const data = JSON.stringify(leaderboard)
      const encoder = new TextEncoder()
      const bytes = encoder.encode(data)

      console.log(`📤 Uploading leaderboard data...`)
      const { pieceCid, size } = await synapse.storage.upload(bytes)
      const cid = typeof pieceCid === 'string' ? pieceCid : (pieceCid as any)?.toString?.() ?? ''

      console.log(`✅ Leaderboard uploaded successfully`)
      console.log(`   Piece CID: ${cid}`)
      console.log(`   Size: ${size} bytes`)

      setIsLoading(false)
      return cid || null
    } catch (err) {
      console.error('❌ Error uploading leaderboard:', err)
      setError(err instanceof Error ? err.message : 'Failed to upload leaderboard')
      setIsLoading(false)
      return null
    }
  }, [getSynapseClient])

  /**
   * Download leaderboard data from Filecoin
   */
  const downloadLeaderboard = useCallback(async (pieceCid: string): Promise<LeaderboardData | null> => {
    setIsLoading(true)
    setError(null)

    try {
      const synapse = await getSynapseClient()

      console.log(`📥 Downloading leaderboard from CID: ${pieceCid}...`)
      const bytes = await synapse.storage.download(pieceCid)

      const decoder = new TextDecoder()
      const data = decoder.decode(bytes)
      const leaderboard: LeaderboardData = JSON.parse(data)

      console.log(`✅ Leaderboard downloaded successfully`)
      console.log(`   Total users: ${leaderboard.totalUsers}`)
      setIsLoading(false)
      return leaderboard
    } catch (err) {
      console.error('❌ Error downloading leaderboard:', err)
      setError(err instanceof Error ? err.message : 'Failed to download leaderboard')
      setIsLoading(false)
      return null
    }
  }, [getSynapseClient])

  return {
    uploadUserStats,
    downloadUserStats,
    uploadLeaderboard,
    downloadLeaderboard,
    isLoading,
    error,
    isConfigured: isSynapseConfigured(),
  }
}

/**
 * Hook for managing user stats with localStorage caching
 *
 * Uses localStorage to cache CIDs and reduce Filecoin reads
 */
export function useUserStats(userAddress: string | undefined) {
  const [stats, setStats] = useState<UserStats | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const storage = useSynapseStorage()

  /**
   * Load user stats (from cache or Filecoin)
   */
  const loadStats = useCallback(async () => {
    if (!userAddress) return

    setIsLoading(true)

    try {
      // Check localStorage for cached CID
      const cachedCid = localStorage.getItem(getUserStorageKey(userAddress))

      if (cachedCid && storage.isConfigured) {
        // Download from Filecoin
        const userStats = await storage.downloadUserStats(cachedCid)
        if (userStats) {
          setStats(userStats)
          setIsLoading(false)
          return
        }
      }

      // No cached data, create new user stats
      const newStats: UserStats = {
        address: userAddress,
        totalBets: 0,
        wins: 0,
        losses: 0,
        pending: 0,
        totalWagered: '0',
        totalProfit: '0',
        winRate: 0,
        currentStreak: 0,
        bestStreak: 0,
        favoriteToken: 'ETH',
        lastBetTimestamp: 0,
        bets: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      setStats(newStats)
      setIsLoading(false)
    } catch (err) {
      console.error('Error loading user stats:', err)
      setIsLoading(false)
    }
  }, [userAddress, storage])

  /**
   * Save user stats to Filecoin and cache CID
   */
  const saveStats = useCallback(async (updatedStats: UserStats) => {
    if (!storage.isConfigured) {
      console.warn('Synapse not configured, stats will not be persisted to Filecoin')
      setStats(updatedStats)
      return
    }

    const cid = await storage.uploadUserStats(updatedStats)
    if (cid) {
      // Cache CID in localStorage
      localStorage.setItem(getUserStorageKey(updatedStats.address), cid)
      setStats(updatedStats)
    }
  }, [storage])

  return {
    stats,
    loadStats,
    saveStats,
    isLoading,
  }
}
