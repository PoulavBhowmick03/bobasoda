'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePrivy, useWallets } from '@privy-io/react-auth'

export interface BetRecord {
  id: string
  epoch: number
  direction: 'bull' | 'bear'
  amount: string
  timestamp: number
  txHash?: string
  status: 'pending' | 'won' | 'lost' | 'claimed'
  lockPrice?: number
  closePrice?: number
  payout?: string
}

const STORAGE_KEY = 'bobasoda_betting_history'

export function useBettingHistory() {
  const { authenticated } = usePrivy()
  const { wallets } = useWallets()
  const [history, setHistory] = useState<BetRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const evmAddress = useMemo(() => {
    if (!authenticated || wallets.length === 0) return ''
    const embedded = wallets.find((w) => w.walletClientType === 'privy') || wallets[0]
    return embedded?.address || ''
  }, [authenticated, wallets])

  // Load history from localStorage
  useEffect(() => {
    if (!evmAddress) {
      setHistory([])
      setIsLoading(false)
      return
    }

    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_${evmAddress}`)
      if (stored) {
        const parsed = JSON.parse(stored)
        setHistory(parsed)
      }
    } catch (err) {
      console.error('Failed to load betting history:', err)
    }
    setIsLoading(false)
  }, [evmAddress])

  // Save history to localStorage
  const saveHistory = (newHistory: BetRecord[]) => {
    if (!evmAddress) return

    try {
      localStorage.setItem(`${STORAGE_KEY}_${evmAddress}`, JSON.stringify(newHistory))
      setHistory(newHistory)
    } catch (err) {
      console.error('Failed to save betting history:', err)
    }
  }

  // Add a new bet
  const addBet = (bet: Omit<BetRecord, 'id' | 'timestamp' | 'status'>) => {
    const newBet: BetRecord = {
      ...bet,
      id: `${Date.now()}_${Math.random()}`,
      timestamp: Date.now(),
      status: 'pending',
    }

    const newHistory = [newBet, ...history]
    saveHistory(newHistory)
  }

  // Update bet status
  const updateBet = (
    id: string,
    updates: Partial<Pick<BetRecord, 'status' | 'lockPrice' | 'closePrice' | 'payout'>>
  ) => {
    const newHistory = history.map((bet) => (bet.id === id ? { ...bet, ...updates } : bet))
    saveHistory(newHistory)
  }

  // Clear all history
  const clearHistory = () => {
    if (!evmAddress) return
    localStorage.removeItem(`${STORAGE_KEY}_${evmAddress}`)
    setHistory([])
  }

  return {
    history,
    isLoading,
    addBet,
    updateBet,
    clearHistory,
  }
}
