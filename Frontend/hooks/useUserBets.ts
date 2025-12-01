'use client'

/**
 * User Bets Hook
 *
 * Fetches user's betting history and determines win/loss status
 * for each bet by comparing their position with round outcomes.
 */

import { useState, useEffect, useMemo } from 'react'
import { useBaseAccount } from '@/lib/base-account'
import { createPublicClient, http } from 'viem'
import { baseSepolia } from 'viem/chains'
import { PREDICTION_ABI, PREDICTION_ADDRESS } from '@/lib/prediction-contract'

export interface UserBet {
  epoch: number
  position: 'Bull' | 'Bear'
  amount: string
  claimed: boolean
  hasWon: boolean | null // null if round not finished yet
  lockPrice: string | null
  closePrice: string | null
  isActive: boolean // round is still ongoing (hasn't reached close time)
  isAwaitingResult: boolean // round ended but waiting for oracle to set price
  canClaim: boolean // won and not claimed
  reward: string | null // estimated reward if won
}

export function useUserBets() {
  const { authenticated, address } = useBaseAccount()
  const [bets, setBets] = useState<UserBet[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const publicClient = useMemo(
    () =>
      createPublicClient({
        chain: baseSepolia,
        transport: http(),
      }),
    []
  )

  useEffect(() => {
    if (authenticated && address) {
      fetchUserBets()
    } else {
      setBets([])
    }
  }, [authenticated, address])

  const fetchUserBets = async () => {
    if (!address) return

    setIsLoading(true)
    setError(null)

    try {
      const userAddress = address as `0x${string}`

      // Get user's bet rounds
      const userRoundsLength = await publicClient.readContract({
        address: PREDICTION_ADDRESS,
        abi: PREDICTION_ABI,
        functionName: 'getUserRoundsLength',
        args: [userAddress],
      }) as bigint

      if (userRoundsLength === BigInt(0)) {
        setBets([])
        setIsLoading(false)
        return
      }

      // Fetch all user rounds data
      const [epochs, betInfos] = await publicClient.readContract({
        address: PREDICTION_ADDRESS,
        abi: PREDICTION_ABI,
        functionName: 'getUserRounds',
        args: [userAddress, BigInt(0), userRoundsLength],
      }) as [bigint[], Array<{ position: number; amount: bigint; claimed: boolean }>]

      // Fetch round details for each epoch
      const roundDetailsPromises = epochs.map((epoch) =>
        publicClient.readContract({
          address: PREDICTION_ADDRESS,
          abi: PREDICTION_ABI,
          functionName: 'rounds',
          args: [epoch],
        })
      )

      const roundDetails = await Promise.all(roundDetailsPromises)

      // Check claimable status for each round
      const claimablePromises = epochs.map((epoch) =>
        publicClient.readContract({
          address: PREDICTION_ADDRESS,
          abi: PREDICTION_ABI,
          functionName: 'claimable',
          args: [epoch, userAddress],
        })
      )

      const claimableStatuses = await Promise.all(claimablePromises)

      // Process all bets
      const processedBets: UserBet[] = epochs.map((epoch, index) => {
        const betInfo = betInfos[index]
        const round = roundDetails[index] as any
        const isClaimable = claimableStatuses[index] as boolean

        // Position: 0 = Bull, 1 = Bear
        const position = betInfo.position === 0 ? 'Bull' : 'Bear'
        const amount = (Number(betInfo.amount) / 1e18).toFixed(4)

        // Check if round is finished (has closePrice)
        // Pyth prices are usually in 8 decimals, but let's check if they exist
        const lockPriceRaw = round.lockPrice ? BigInt(round.lockPrice) : BigInt(0)
        const closePriceRaw = round.closePrice ? BigInt(round.closePrice) : BigInt(0)

        const lockPrice = lockPriceRaw !== BigInt(0) ? Number(lockPriceRaw) / 1e8 : null
        const closePrice = closePriceRaw !== BigInt(0) ? Number(closePriceRaw) / 1e8 : null

        // Check timestamps to determine round status
        const now = Math.floor(Date.now() / 1000)
        const roundCloseTime = Number(round.closeTimestamp)

        // Determine round status
        const hasReachedCloseTime = now >= roundCloseTime
        const hasClosePrice = closePriceRaw !== BigInt(0)

        // Round is active if it hasn't reached close time yet
        const isActive = !hasReachedCloseTime

        // Round is awaiting result if it ended but oracle hasn't set close price
        const isAwaitingResult = hasReachedCloseTime && !hasClosePrice

        // Log for debugging
        console.log(`Round ${epoch}:`, {
          lockPrice,
          closePrice,
          now,
          roundCloseTime,
          hasReachedCloseTime,
          hasClosePrice,
          isActive,
          isAwaitingResult,
          position,
          oracleCalled: round.oracleCalled
        })

        // Determine if user won - only if round is complete with both prices
        let hasWon: boolean | null = null
        if (!isActive && !isAwaitingResult && lockPrice !== null && closePrice !== null) {
          if (position === 'Bull') {
            hasWon = closePrice > lockPrice
          } else {
            hasWon = closePrice < lockPrice
          }
        }

        // Calculate estimated reward if won
        let reward: string | null = null
        if (hasWon && !betInfo.claimed) {
          const bullAmount = Number(round.bullAmount) / 1e18
          const bearAmount = Number(round.bearAmount) / 1e18
          const rewardAmount = Number(round.rewardAmount) / 1e18
          const userBetAmount = Number(betInfo.amount) / 1e18

          if (position === 'Bull' && bullAmount > 0) {
            reward = ((userBetAmount / bullAmount) * rewardAmount).toFixed(4)
          } else if (position === 'Bear' && bearAmount > 0) {
            reward = ((userBetAmount / bearAmount) * rewardAmount).toFixed(4)
          }
        }

        return {
          epoch: Number(epoch),
          position,
          amount,
          claimed: betInfo.claimed,
          hasWon,
          lockPrice: lockPrice?.toFixed(2) || null,
          closePrice: closePrice?.toFixed(2) || null,
          isActive,
          isAwaitingResult,
          canClaim: isClaimable && !betInfo.claimed,
          reward,
        }
      })

      // Sort by epoch descending (most recent first)
      processedBets.sort((a, b) => b.epoch - a.epoch)

      setBets(processedBets)
      setIsLoading(false)
    } catch (err: any) {
      console.error('Error fetching user bets:', err)
      setError(err?.message || 'Failed to fetch bet history')
      setIsLoading(false)
    }
  }

  const winCount = bets.filter((b) => b.hasWon === true).length
  const lossCount = bets.filter((b) => b.hasWon === false).length
  const activeCount = bets.filter((b) => b.isActive).length
  const claimableCount = bets.filter((b) => b.canClaim).length

  return {
    bets,
    isLoading,
    error,
    refetch: fetchUserBets,
    stats: {
      total: bets.length,
      wins: winCount,
      losses: lossCount,
      active: activeCount,
      claimable: claimableCount,
      winRate: bets.length > 0 ? ((winCount / (winCount + lossCount)) * 100).toFixed(1) : '0',
    },
  }
}
