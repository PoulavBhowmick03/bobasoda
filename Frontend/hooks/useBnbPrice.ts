"use client"

import { usePythPrice } from './usePythPrice'

/**
 * Convenience hook to fetch BNB price from Pyth Network
 *
 * @returns Price data for BNB/USD including current price, confidence interval, and loading state
 *
 * @example
 * ```tsx
 * const { price, isLoading, error } = useBnbPrice()
 * if (isLoading) return <div>Loading...</div>
 * if (error) return <div>Error: {error}</div>
 * return <div>BNB Price: ${price?.toFixed(2)}</div>
 * ```
 */
export function useBnbPrice() {
  return usePythPrice('BNB')
}
