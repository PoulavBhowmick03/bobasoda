"use client"

import { usePythPrice } from './usePythPrice'

/**
 * Convenience hook to fetch Bitcoin (BTC) price from Pyth Network
 *
 * @returns Price data for BTC/USD including current price, confidence interval, and loading state
 *
 * @example
 * ```tsx
 * const { price, isLoading, error } = useBtcPrice()
 * if (isLoading) return <div>Loading...</div>
 * if (error) return <div>Error: {error}</div>
 * return <div>BTC Price: ${price?.toLocaleString()}</div>
 * ```
 */
export function useBtcPrice() {
  return usePythPrice('BTC')
}
