"use client"

import Profile from "./profile"
import BottomNav from "./bottom-nav"
import { useEffect, useMemo, useState } from "react"
import { createPublicClient, http, formatEther } from "viem"
import { baseSepoliaChain } from "./providers"
import { AuthButton } from "@coinbase/cdp-react"
import { useCurrentUser, useEvmAddress, useIsInitialized, useSignOut } from "@coinbase/cdp-hooks"

export default function ProfilePage() {
  const { isInitialized } = useIsInitialized()
  const { currentUser } = useCurrentUser()
  const { evmAddress } = useEvmAddress()
  const { signOut } = useSignOut()
  const [balance, setBalance] = useState<string>("0.00")
  const [isLoadingBalance, setIsLoadingBalance] = useState<boolean>(false)

  // Create public client for Base Sepolia
  const publicClient = useMemo(() => createPublicClient({
      chain: baseSepoliaChain,
      transport: http(),
    }), [])

  useEffect(() => {
    if (!currentUser || !evmAddress) {
      setBalance("0.00")
      return
    }

    const fetchBalance = async (address: string) => {
      setIsLoadingBalance(true)

      try {
        const balanceWei = await publicClient.getBalance({
          address: address as `0x${string}`,
        })
        const balanceFormatted = formatEther(balanceWei)
        const balanceFinal = parseFloat(balanceFormatted).toFixed(4)

        setBalance(balanceFinal)
      } catch (error) {
        console.error("Error fetching balance:", error)
        setBalance("0.00")
      } finally {
        setIsLoadingBalance(false)
      }
    }

    fetchBalance(evmAddress)
  }, [currentUser, evmAddress, publicClient])

  const handleDisconnectWallet = async () => {
    try {
      await signOut()
    } catch (err) {
      console.error("Failed to sign out:", err)
    }
  }

  const handleSend = () => {
    console.log("=== SEND TRANSACTION ===")
    console.log("Current wallet address:", evmAddress)
    console.log("Current balance:", balance, "ETH")
    console.log("Chain: Base Sepolia (84532)")
    console.log("=======================")
  }

  // Wait for CDP to initialize
  if (!isInitialized) {
    return (
      <div className="relative h-full w-full">
        <div className="h-full w-full flex items-center justify-center" style={{ backgroundColor: '#27262c' }}>
          <p className="text-yellow-400 text-xl">Loading wallet...</p>
        </div>
      </div>
    )
  }

  if (!currentUser || !evmAddress) {
    return (
      <div className="relative h-full w-full overflow-hidden" style={{ backgroundColor: '#0a0b0d' }}>
        <div className="absolute inset-0 opacity-60" style={{ background: 'radial-gradient(circle at 20% 20%, rgba(219,187,26,0.35), transparent 40%), radial-gradient(circle at 80% 30%, rgba(255,255,255,0.08), transparent 35%), radial-gradient(circle at 50% 80%, rgba(219,187,26,0.18), transparent 40%)' }} />
        <div className="relative h-full w-full flex flex-col items-center justify-center px-6 py-10">
          <div className="w-full max-w-lg bg-white/5 border border-yellow-400/40 backdrop-blur-md rounded-3xl shadow-2xl p-8 sm:p-10 space-y-6 text-center">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.18em] text-yellow-300">Welcome to Bobasoda</p>
              <h1 className="text-3xl sm:text-4xl font-bold text-yellow-400">Sign in to play</h1>
            </div>
            <div className="flex flex-col gap-3 items-center">
              <AuthButton className="w-full bg-yellow-400 text-black font-bold py-4 rounded-2xl text-lg hover:bg-yellow-300 transition justify-center shadow-lg shadow-yellow-400/20" />
              <p className="text-xs text-yellow-100/70">
                Powered by Coinbase CDP embedded wallets • Base Sepolia testnet
              </p>
            </div>
          </div>
        </div>
        <BottomNav />
      </div>
    )
  }

  return (
    <div className="relative h-full w-full">
      <Profile
        onDisconnectWallet={handleDisconnectWallet}
        onSend={handleSend}
        isConnected
        walletAddress={evmAddress}
        balance={balance}
        isLoadingBalance={isLoadingBalance}
      />
      <BottomNav />
    </div>
  )
}
