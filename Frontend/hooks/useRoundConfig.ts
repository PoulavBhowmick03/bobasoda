"use client"

import { useEffect, useState } from 'react'
import { createPublicClient, http } from 'viem'
import { baseSepoliaChain } from '@/components/providers'
import { PREDICTION_ADDRESS, PREDICTION_ABI } from '@/lib/prediction-contract'

export function useRoundConfig() {
  const [intervalSeconds, setIntervalSeconds] = useState<number | null>(null)
  const [bufferSeconds, setBufferSeconds] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!PREDICTION_ADDRESS || PREDICTION_ADDRESS === '0x0000000000000000000000000000000000000000') {
      setError('Prediction contract address is not configured. Set NEXT_PUBLIC_PREDICTION_CONTRACT.')
      setIsLoading(false)
      return
    }

    const contractAddress = PREDICTION_ADDRESS as `0x${string}`

    const publicClient = createPublicClient({
      chain: baseSepoliaChain,
      transport: http('https://sepolia.base.org'),
    })

    const fetchConfig = async () => {
      try {
        console.log('🔧 Fetching round configuration from contract...')

        const [interval, buffer] = await Promise.all([
          publicClient.readContract({
            address: contractAddress,
            abi: PREDICTION_ABI,
            functionName: 'intervalSeconds',
          }),
          publicClient.readContract({
            address: contractAddress,
            abi: PREDICTION_ABI,
            functionName: 'bufferSeconds',
          }),
        ])

        const intervalSec = Number(interval)
        const bufferSec = Number(buffer)

        console.log('=== ROUND CONFIGURATION ===')
        console.log('Contract:', contractAddress)
        console.log('Interval Seconds:', intervalSec, 'seconds')
        console.log('Buffer Seconds:', bufferSec, 'seconds')
        console.log('Betting Window:', intervalSec - bufferSec, 'seconds (open for betting)')
        console.log('Lock Period:', bufferSec, 'seconds (last', bufferSec, 's before round ends)')
        console.log('===========================')

        setIntervalSeconds(intervalSec)
        setBufferSeconds(bufferSec)
        setIsLoading(false)
        setError(null)
      } catch (err) {
        console.error('❌ Error fetching round config:', err)
        setError('Failed to fetch config')
        setIsLoading(false)
      }
    }

    fetchConfig()
  }, [])

  return {
    intervalSeconds,
    bufferSeconds,
    // Derived values
    bettingWindowSeconds: intervalSeconds && bufferSeconds ? intervalSeconds - bufferSeconds : null,
    isLoading,
    error,
  }
}
