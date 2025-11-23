"use client"

import { useEffect, useState } from 'react'
import { usePythPrice } from './usePythPrice'
import { useEthPrice } from './useEthPrice'
import { SUPPORTED_TOKENS } from '@/lib/pyth-config'

interface PriceResult {
  price: number | null
  source: 'pyth' | 'chainlink' | null
  isLoading: boolean
  error: string | null
}

/**
 * Smart hook that uses Pyth as primary source and Chainlink as fallback for ETH
 *
 * For ETH:
 * 1. Tries Pyth first (faster, more frequent updates)
 * 2. Falls back to Chainlink if Pyth fails (same source as contract)
 *
 * For other tokens:
 * - Uses Pyth only (Chainlink doesn't support all tokens)
 *
 * @param tokenSymbol - The token symbol (e.g., 'ETH', 'BTC', 'SOL')
 * @returns Price data with source information
 *
 * @example
 * ```tsx
 * const { price, source, isLoading } = usePriceWithFallback('ETH')
 * // source will be 'pyth' if Pyth works, 'chainlink' if fallback is used
 * ```
 */
export function usePriceWithFallback(
  tokenSymbol: keyof typeof SUPPORTED_TOKENS
): PriceResult {
  const [finalPrice, setFinalPrice] = useState<number | null>(null)
  const [source, setSource] = useState<'pyth' | 'chainlink' | null>(null)
  const [finalLoading, setFinalLoading] = useState(true)
  const [finalError, setFinalError] = useState<string | null>(null)

  // Always try Pyth for all tokens
  const pythResult = usePythPrice(tokenSymbol)

  // Only initialize Chainlink for ETH (keep it as backup)
  const chainlinkResult = tokenSymbol === 'ETH' ? useEthPrice() : { price: null, isLoading: false, error: null }

  useEffect(() => {
    // Priority 1: Use Pyth if available
    if (!pythResult.isLoading && pythResult.price !== null && !pythResult.error) {
      setFinalPrice(pythResult.price)
      setSource('pyth')
      setFinalLoading(false)
      setFinalError(null)
      console.log(`💎 Using Pyth price for ${tokenSymbol}: $${pythResult.price.toFixed(2)}`)
      return
    }

    // Priority 2: For ETH, fallback to Chainlink if Pyth fails
    if (tokenSymbol === 'ETH' && pythResult.error && !chainlinkResult.isLoading) {
      if (chainlinkResult.price !== null && !chainlinkResult.error) {
        setFinalPrice(chainlinkResult.price)
        setSource('chainlink')
        setFinalLoading(false)
        setFinalError(null)
        console.warn(`⚠️ Pyth failed for ETH, using Chainlink fallback: $${chainlinkResult.price.toFixed(2)}`)
        return
      }
    }

    // Still loading
    if (pythResult.isLoading || (tokenSymbol === 'ETH' && chainlinkResult.isLoading)) {
      setFinalLoading(true)
      return
    }

    // Both failed
    if (pythResult.error) {
      setFinalError(pythResult.error)
      setFinalLoading(false)
      setSource(null)
    }
  }, [
    pythResult.price,
    pythResult.isLoading,
    pythResult.error,
    chainlinkResult.price,
    chainlinkResult.isLoading,
    chainlinkResult.error,
    tokenSymbol,
  ])

  return {
    price: finalPrice,
    source,
    isLoading: finalLoading,
    error: finalError,
  }
}
