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
      <div className="relative h-full w-full" style={{ backgroundColor: '#27262c' }}>
        <div className="h-full w-full flex flex-col items-center justify-center px-8">
          <h1 className="text-4xl sm:text-5xl font-bold text-yellow-400 mb-6">
            Profile
          </h1>
          <p className="text-yellow-400 opacity-75 text-lg mb-8 text-center">
            Connect your Coinbase embedded wallet to get started
          </p>
          <AuthButton className="bg-yellow-400 text-black px-12 py-5 rounded-2xl font-bold text-2xl hover:bg-yellow-500 transition shadow-lg w-full max-w-xs justify-center" />
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
