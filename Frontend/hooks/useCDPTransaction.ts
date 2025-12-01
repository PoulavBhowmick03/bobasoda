'use client'

/**
 * Base Account Transaction Hook
 *
 * Handles betting transactions using Base Account wallets.
 * Sends direct transactions to the Prediction contract.
 */

import { useState } from 'react'
import { useBaseAccount } from '@/lib/base-account'
import { encodeFunctionData, parseEther } from 'viem'
import { PREDICTION_ABI, PREDICTION_ADDRESS } from '@/lib/prediction-contract'

interface BetParams {
  amount: string // ETH amount as string (e.g., "0.01")
  direction: 'bull' | 'bear'
  contractAddress?: string
  epoch: number
}

export function useCDPTransaction() {
  const { authenticated, address, getProvider } = useBaseAccount()
  const [txHash, setTxHash] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  /**
   * Send a transaction using the Base Account provider
   */
  const sendTx = async (to: `0x${string}`, data: `0x${string}`, value: bigint) => {
    if (!authenticated || !address) {
      throw new Error('Wallet not connected')
    }
    const provider = getProvider()
    const from = address as `0x${string}`
    if (!provider || !from) {
      throw new Error('No provider available from Base Account')
    }
    const valueHex = `0x${value.toString(16)}`
    const tx = {
      from,
      to,
      data,
      value: valueHex,
    }
    const hash = await provider.request({ method: 'eth_sendTransaction', params: [tx] })
    return hash as string
  }

  /**
   * Place a bet on the prediction market
   */
  const placeBet = async ({ amount, direction, contractAddress, epoch }: BetParams) => {
    const targetAddress = (contractAddress || PREDICTION_ADDRESS) as `0x${string}`

    try {
      setIsPending(true)
      setError(null)
      setTxHash(null)

      const functionName = direction === 'bull' ? 'betBull' : 'betBear'
      const value = parseEther(amount)
      const data = encodeFunctionData({
        abi: PREDICTION_ABI,
        functionName,
        args: [BigInt(epoch)],
      })

      const hash = await sendTx(targetAddress, data, value)
      setTxHash(hash)
      setIsPending(false)
      return { success: true, hash }
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to place bet'
      console.error('Bet error:', errorMessage)
      setError(errorMessage)
      setIsPending(false)
      return { success: false, error: errorMessage }
    }
  }

  /**
   * Claim rewards from a won round
   */
  const claimRewards = async (contractAddress: string | undefined, epochs: number[]) => {
    const targetAddress = (contractAddress || PREDICTION_ADDRESS) as `0x${string}`

    try {
      setIsPending(true)
      setError(null)
      setTxHash(null)

      const data = encodeFunctionData({
        abi: PREDICTION_ABI,
        functionName: 'claim',
        args: [epochs.map((epoch) => BigInt(epoch))],
      })

      const hash = await sendTx(targetAddress, data, BigInt(0))
      setTxHash(hash)
      setIsPending(false)
      return { success: true, hash }
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to claim rewards'
      console.error('Claim error:', errorMessage)
      setError(errorMessage)
      setIsPending(false)
      return { success: false, error: errorMessage }
    }
  }

  return {
    placeBet,
    claimRewards,
    isPending,
    txHash,
    error,
  }
}
