"use client"

import { useEffect, useState } from 'react'
import { createPublicClient, http } from 'viem'
import { baseSepoliaChain } from '@/components/providers'

const PREDICTION_CONTRACT = '0x58Ccb2418E0b48D9d3b19a084395B69a1235DcAE' as const

// ABI for reading current epoch and round data, plus events
const PREDICTION_ABI = [
  {
    inputs: [],
    name: 'currentEpoch',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    name: 'rounds',
    outputs: [
      { internalType: 'uint256', name: 'epoch', type: 'uint256' },
      { internalType: 'uint256', name: 'startTimestamp', type: 'uint256' },
      { internalType: 'uint256', name: 'lockTimestamp', type: 'uint256' },
      { internalType: 'uint256', name: 'closeTimestamp', type: 'uint256' },
      { internalType: 'int256', name: 'lockPrice', type: 'int256' },
      { internalType: 'int256', name: 'closePrice', type: 'int256' },
      { internalType: 'uint256', name: 'lockOracleId', type: 'uint256' },
      { internalType: 'uint256', name: 'closeOracleId', type: 'uint256' },
      { internalType: 'uint256', name: 'totalAmount', type: 'uint256' },
      { internalType: 'uint256', name: 'bullAmount', type: 'uint256' },
      { internalType: 'uint256', name: 'bearAmount', type: 'uint256' },
      { internalType: 'uint256', name: 'rewardBaseCalAmount', type: 'uint256' },
      { internalType: 'uint256', name: 'rewardAmount', type: 'uint256' },
      { internalType: 'bool', name: 'oracleCalled', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [{ indexed: true, internalType: 'uint256', name: 'epoch', type: 'uint256' }],
    name: 'StartRound',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'uint256', name: 'epoch', type: 'uint256' },
      { indexed: true, internalType: 'uint256', name: 'oracleTimestamp', type: 'uint256' },
      { indexed: false, internalType: 'int256', name: 'price', type: 'int256' },
    ],
    name: 'LockRound',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'uint256', name: 'epoch', type: 'uint256' },
      { indexed: true, internalType: 'uint256', name: 'oracleTimestamp', type: 'uint256' },
      { indexed: false, internalType: 'int256', name: 'price', type: 'int256' },
    ],
    name: 'EndRound',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'sender', type: 'address' },
      { indexed: true, internalType: 'uint256', name: 'epoch', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'BetBull',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'sender', type: 'address' },
      { indexed: true, internalType: 'uint256', name: 'epoch', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'BetBear',
    type: 'event',
  },
] as const

export interface RoundData {
  epoch: number
  startTimestamp: number
  lockTimestamp: number
  closeTimestamp: number
  lockPrice: bigint
  closePrice: bigint
  totalAmount: bigint
  bullAmount: bigint
  bearAmount: bigint
  oracleCalled: boolean
}

export function useCurrentRound() {
  const [currentEpoch, setCurrentEpoch] = useState<number | null>(null)
  const [roundData, setRoundData] = useState<RoundData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const publicClient = createPublicClient({
      chain: baseSepoliaChain,
      transport: http('https://sepolia.base.org'),
    })

    const fetchCurrentRound = async () => {
      try {
        // Get current epoch
        const epoch = await publicClient.readContract({
          address: PREDICTION_CONTRACT,
          abi: PREDICTION_ABI,
          functionName: 'currentEpoch',
        })

        const epochNum = Number(epoch)

        // If no rounds started yet (epoch 0), return null
        if (epochNum === 0) {
          console.log('⏸️ No rounds started yet (epoch 0)')
          setCurrentEpoch(0)
          setRoundData(null)
          setIsLoading(false)
          return
        }

        // Get round data for current epoch
        const round = await publicClient.readContract({
          address: PREDICTION_CONTRACT,
          abi: PREDICTION_ABI,
          functionName: 'rounds',
          args: [epoch],
        })

        const data: RoundData = {
          epoch: Number(round[0]),
          startTimestamp: Number(round[1]),
          lockTimestamp: Number(round[2]),
          closeTimestamp: Number(round[3]),
          lockPrice: round[4],
          closePrice: round[5],
          totalAmount: round[8],
          bullAmount: round[9],
          bearAmount: round[10],
          oracleCalled: round[13],
        }

        const now = Math.floor(Date.now() / 1000)
        const bettingSecondsLeft = Math.max(0, data.lockTimestamp - now)
        const roundSecondsLeft = Math.max(0, data.closeTimestamp - now)

        console.log('📊 === CURRENT ROUND STATE ===')
        console.log(`Round Epoch: ${data.epoch}`)
        console.log(`Start Time: ${new Date(data.startTimestamp * 1000).toLocaleTimeString()}`)
        console.log(`Lock Time: ${new Date(data.lockTimestamp * 1000).toLocaleTimeString()}`)
        console.log(`Close Time: ${new Date(data.closeTimestamp * 1000).toLocaleTimeString()}`)
        console.log(`Current Time: ${new Date(now * 1000).toLocaleTimeString()}`)
        console.log(`⏱️ Betting closes in: ${bettingSecondsLeft}s`)
        console.log(`⏱️ Round ends in: ${roundSecondsLeft}s`)
        console.log(`💰 Prize Pool: ${Number(data.totalAmount) / 1e18} ETH`)
        console.log(`🟢 Bull Pool: ${Number(data.bullAmount) / 1e18} ETH`)
        console.log(`🔴 Bear Pool: ${Number(data.bearAmount) / 1e18} ETH`)
        console.log('==============================')

        setCurrentEpoch(epochNum)
        setRoundData(data)
        setIsLoading(false)
        setError(null)
      } catch (err) {
        console.error('❌ Error fetching current round:', err)
        setError('Failed to fetch round data')
        setIsLoading(false)
      }
    }

    // Fetch immediately
    fetchCurrentRound()

    // Set up event listeners for realtime updates
    console.log('🎧 Setting up realtime event listeners...')

    // Watch for StartRound events
    const unwatchStartRound = publicClient.watchContractEvent({
      address: PREDICTION_CONTRACT,
      abi: PREDICTION_ABI,
      eventName: 'StartRound',
      onLogs: (logs) => {
        console.log('🚀 StartRound event detected!', logs)
        fetchCurrentRound() // Immediately fetch new round data
      },
    })

    // Watch for LockRound events
    const unwatchLockRound = publicClient.watchContractEvent({
      address: PREDICTION_CONTRACT,
      abi: PREDICTION_ABI,
      eventName: 'LockRound',
      onLogs: (logs) => {
        console.log('🔒 LockRound event detected!', logs)
        fetchCurrentRound() // Immediately fetch updated round data
      },
    })

    // Watch for EndRound events
    const unwatchEndRound = publicClient.watchContractEvent({
      address: PREDICTION_CONTRACT,
      abi: PREDICTION_ABI,
      eventName: 'EndRound',
      onLogs: (logs) => {
        console.log('🏁 EndRound event detected!', logs)
        fetchCurrentRound() // Immediately fetch new round data
      },
    })

    // Watch for BetBull events - update pool in realtime
    const unwatchBetBull = publicClient.watchContractEvent({
      address: PREDICTION_CONTRACT,
      abi: PREDICTION_ABI,
      eventName: 'BetBull',
      onLogs: (logs) => {
        console.log('🟢 BetBull event detected!', logs)
        fetchCurrentRound() // Immediately update prize pool and odds
      },
    })

    // Watch for BetBear events - update pool in realtime
    const unwatchBetBear = publicClient.watchContractEvent({
      address: PREDICTION_CONTRACT,
      abi: PREDICTION_ABI,
      eventName: 'BetBear',
      onLogs: (logs) => {
        console.log('🔴 BetBear event detected!', logs)
        fetchCurrentRound() // Immediately update prize pool and odds
      },
    })

    // Fallback polling every 15 seconds (reduced from 3s since events are primary)
    const interval = setInterval(fetchCurrentRound, 15000)

    return () => {
      clearInterval(interval)
      unwatchStartRound()
      unwatchLockRound()
      unwatchEndRound()
      unwatchBetBull()
      unwatchBetBear()
      console.log('🔌 Event listeners disconnected')
    }
  }, [])

  return { currentEpoch, roundData, isLoading, error }
}
