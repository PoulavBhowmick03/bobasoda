'use client'

/**
 * CDP Transaction Hook
 *
 * Handles betting transactions using Coinbase embedded wallets.
 * Provides functions to place bets (bull/bear) on the prediction market.
 */

import { useState } from 'react'
import { useEvmAddress, useSendUserOperation } from '@coinbase/cdp-hooks'
import { Abi, encodeFunctionData, parseEther } from 'viem'

const BASE_SEPOLIA = 'base-sepolia' as const

const predictionAbi = [
  {
    type: 'function',
    name: 'betBull',
    stateMutability: 'payable',
    inputs: [{ name: 'epoch', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'betBear',
    stateMutability: 'payable',
    inputs: [{ name: 'epoch', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'claim',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'epochs', type: 'uint256[]' }],
    outputs: [],
  },
] as const satisfies Abi

interface BetParams {
  amount: string // ETH amount as string (e.g., "0.01")
  direction: 'bull' | 'bear'
  contractAddress: string
  epoch: number
}

export function useCDPTransaction() {
  const { evmAddress } = useEvmAddress()
  const { sendUserOperation, status } = useSendUserOperation()
  const [txHash, setTxHash] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const isPending = status === 'pending'

  /**
   * Place a bet on the prediction market
   */
  const placeBet = async ({ amount, direction, contractAddress, epoch }: BetParams) => {
    if (!evmAddress) {
      setError('Wallet not connected')
      return { success: false, error: 'Wallet not connected' }
    }

    try {
      setError(null)
      setTxHash(null)

      // Determine which function to call based on direction
      const functionName = direction === 'bull' ? 'betBull' : 'betBear'
      const value = parseEther(amount)
      const data = encodeFunctionData({
        abi: predictionAbi,
        functionName,
        args: [BigInt(epoch)],
      })

      console.log(`📝 Preparing ${direction} bet:`, {
        amount,
        epoch,
        contractAddress,
        functionName,
      })

      const result = await sendUserOperation({
        evmSmartAccount: evmAddress,
        network: BASE_SEPOLIA,
        calls: [
          {
            to: contractAddress as `0x${string}`,
            data,
            value,
          },
        ],
      })

      console.log('✅ User operation sent:', result.userOperationHash)
      setTxHash(result.userOperationHash)

      return { success: true }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to place bet'
      console.error('❌ Bet error:', errorMessage)
      setError(errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  /**
   * Claim rewards from a won round
   */
  const claimRewards = async (contractAddress: string, epochs: number[]) => {
    if (!evmAddress) {
      setError('Wallet not connected')
      return { success: false, error: 'Wallet not connected' }
    }

    try {
      setError(null)
      setTxHash(null)

      console.log('📝 Claiming rewards for epochs:', epochs)

      const data = encodeFunctionData({
        abi: predictionAbi,
        functionName: 'claim',
        args: [epochs.map((epoch) => BigInt(epoch))],
      })

      const result = await sendUserOperation({
        evmSmartAccount: evmAddress,
        network: BASE_SEPOLIA,
        calls: [
          {
            to: contractAddress as `0x${string}`,
            data,
            value: BigInt(0),
          },
        ],
      })

      console.log('✅ Claim user operation sent:', result.userOperationHash)
      setTxHash(result.userOperationHash)

      return { success: true }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to claim rewards'
      console.error('❌ Claim error:', errorMessage)
      setError(errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  return {
    evmAddress,
    placeBet,
    claimRewards,
    isPending,
    txHash,
    error,
  }
}
