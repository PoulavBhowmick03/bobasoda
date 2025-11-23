"use client"

import { useEffect, useState } from 'react'
import { createPublicClient, http } from 'viem'
import { baseSepoliaChain } from '@/components/providers'

const CHAINLINK_ETH_USD = '0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1' as const

// Chainlink oracle ABI for latestAnswer
const CHAINLINK_ABI = [
  {
    inputs: [],
    name: 'latestAnswer',
    outputs: [{ internalType: 'int256', name: '', type: 'int256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const

export function useEthPrice() {
  const [price, setPrice] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let fetchCount = 0

    const publicClient = createPublicClient({
      chain: baseSepoliaChain,
      transport: http('https://sepolia.base.org'),
    })

    const fetchPrice = async () => {
      fetchCount++
      const fetchTime = new Date().toLocaleTimeString()

      console.log(`\n[${fetchTime}] 🔄 Fetching ETH price from Chainlink on-chain oracle (attempt #${fetchCount})...`)

      try {
        // Fetch price from Chainlink on-chain oracle (same source as contract uses)
        const chainlinkPrice = await publicClient.readContract({
          address: CHAINLINK_ETH_USD,
          abi: CHAINLINK_ABI,
          functionName: 'latestAnswer',
        })

        console.log('=== CHAINLINK ON-CHAIN ETH/USD PRICE ===')
        console.log('Fetch Time:', fetchTime)
        console.log('Price:', chainlinkPrice.toString())

        // Chainlink uses 8 decimals for ETH/USD on Base Sepolia
        const formattedPrice = Number(chainlinkPrice) / 1e8

        console.log(`💰 Final ETH Price: $${formattedPrice.toFixed(2)}`)
        console.log('=========================================\n')

        setPrice(formattedPrice)
        setIsLoading(false)
        setError(null)
      } catch (err) {
        console.error(`❌ [${fetchTime}] Error fetching ETH price:`, err)
        setError('Failed to fetch price')
        setIsLoading(false)
      }
    }

    // Fetch immediately
    fetchPrice()

    // Update every 5 seconds (same as before)
    console.log('⚙️ Starting ETH price polling from Chainlink on-chain oracle (every 5 seconds)...')
    const interval = setInterval(fetchPrice, 5000)

    return () => {
      console.log('⚙️ Stopping ETH price polling...')
      clearInterval(interval)
    }
  }, [])

  return { price, isLoading, error }
}
