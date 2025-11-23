"use client"

import { useEffect, useState } from 'react'
import { createPublicClient, http } from 'viem'
import { bscTestnetChain } from '@/components/providers'

const PYTH_CONTRACT = '0x5744Cbf430D99456a0A8771208b674F27f8EF0Fb' as const
const BNB_USD_PRICE_ID = '0x2f95862b045670cd22bee3114c39763a4a08beeb663b145d283c31d7d1101c4f' as const

// Pyth contract ABI for getPriceUnsafe
const PYTH_ABI = [
  {
    inputs: [{ internalType: 'bytes32', name: 'id', type: 'bytes32' }],
    name: 'getPriceUnsafe',
    outputs: [
      {
        components: [
          { internalType: 'int64', name: 'price', type: 'int64' },
          { internalType: 'uint64', name: 'conf', type: 'uint64' },
          { internalType: 'int32', name: 'expo', type: 'int32' },
          { internalType: 'uint256', name: 'publishTime', type: 'uint256' },
        ],
        internalType: 'struct PythStructs.Price',
        name: 'price',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const

export function useBnbPrice() {
  const [price, setPrice] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let fetchCount = 0

    const publicClient = createPublicClient({
      chain: bscTestnetChain,
      transport: http('https://bsc-testnet-rpc.publicnode.com'),
    })

    const fetchPrice = async () => {
      fetchCount++
      const fetchTime = new Date().toLocaleTimeString()

      console.log(`\n[${fetchTime}] 🔄 Fetching BNB price from Pyth on-chain oracle (attempt #${fetchCount})...`)

      try {
        // Fetch price from Pyth on-chain oracle (same source as contract uses)
        const pythPrice = await publicClient.readContract({
          address: PYTH_CONTRACT,
          abi: PYTH_ABI,
          functionName: 'getPriceUnsafe',
          args: [BNB_USD_PRICE_ID],
        })

        console.log('=== PYTH ON-CHAIN BNB/USD PRICE ===')
        console.log('Fetch Time:', fetchTime)
        console.log('Price:', pythPrice.price.toString())
        console.log('Exponent:', pythPrice.expo)
        console.log('Confidence:', pythPrice.conf.toString())

        const publishDate = new Date(Number(pythPrice.publishTime) * 1000)
        const secondsAgo = Math.floor((Date.now() - publishDate.getTime()) / 1000)
        console.log('Publish Time:', publishDate.toLocaleString())
        console.log(`⏰ Price age: ${secondsAgo} seconds old`)

        // Calculate actual price: price * 10^expo (same logic as contract)
        const formattedPrice = Number(pythPrice.price) * Math.pow(10, pythPrice.expo)

        console.log(`💰 Final BNB Price: $${formattedPrice.toFixed(4)}`)
        console.log('====================================\n')

        setPrice(formattedPrice)
        setIsLoading(false)
        setError(null)
      } catch (err) {
        console.error(`❌ [${fetchTime}] Error fetching BNB price:`, err)
        setError('Failed to fetch price')
        setIsLoading(false)
      }
    }

    // Fetch immediately
    fetchPrice()

    // Update every 5 seconds (same source as contract, more efficient than 2s polling)
    console.log('⚙️ Starting BNB price polling from Pyth on-chain oracle (every 5 seconds)...')
    const interval = setInterval(fetchPrice, 5000)

    return () => {
      console.log('⚙️ Stopping BNB price polling...')
      clearInterval(interval)
    }
  }, [])

  return { price, isLoading, error }
}
