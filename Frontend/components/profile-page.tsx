"use client"

import Profile from "./profile"
import BottomNav from "./bottom-nav"
import { useEffect, useMemo, useState } from "react"
import { createPublicClient, http, formatEther } from "viem"
import { baseSepoliaChain } from "./providers"
import { useBaseAccount } from "@/lib/base-account"
import dynamic from "next/dynamic"

// Dynamically import the SignInWithBaseButton to avoid SSR issues
const SignInWithBaseButton = dynamic(
  () => import("@base-org/account-ui/react").then((mod) => mod.SignInWithBaseButton),
  { ssr: false, loading: () => <div className="w-full h-12 bg-yellow-400/20 rounded-xl animate-pulse" /> }
)

export default function ProfilePage() {
  const { ready, authenticated, login, logout, address } = useBaseAccount()
  const [walletAddress, setWalletAddress] = useState<string>("")
  const [balance, setBalance] = useState<string>("0.00")
  const [isLoadingBalance, setIsLoadingBalance] = useState<boolean>(false)

  const publicClient = useMemo(() => createPublicClient({
      chain: baseSepoliaChain,
      transport: http(),
    }), [])

  useEffect(() => {
    if (!authenticated || !address) {
      setWalletAddress("")
      setBalance("0.00")
      return
    }

    setWalletAddress(address)
    fetchBalance(address)
  }, [authenticated, address])

  const fetchBalance = async (addr: string) => {
    setIsLoadingBalance(true)
    try {
      const balanceWei = await publicClient.getBalance({
        address: addr as `0x${string}`,
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

  const handleConnectWallet = () => {
    login()
  }

  const handleDisconnectWallet = () => {
    logout()
    setWalletAddress("")
  }

  const handleSend = () => {
    console.log("=== SEND TRANSACTION ===")
    console.log("Current wallet address:", walletAddress)
    console.log("Current balance:", balance, "ETH")
    console.log("Chain: Base Sepolia (84532)")
    console.log("=======================")
  }

  if (!ready) {
    return (
      <div className="relative h-full w-full">
        <div className="h-full w-full flex items-center justify-center" style={{ backgroundColor: '#27262c' }}>
          <p className="text-yellow-400 text-xl">Loading wallet...</p>
        </div>
      </div>
    )
  }

  if (!authenticated || !walletAddress) {
    return (
      <div className="relative h-full w-full overflow-hidden" style={{ backgroundColor: '#0a0b0d' }}>
        <div className="absolute inset-0 opacity-60" style={{ background: 'radial-gradient(circle at 20% 20%, rgba(219,187,26,0.35), transparent 40%), radial-gradient(circle at 80% 30%, rgba(255,255,255,0.08), transparent 35%), radial-gradient(circle at 50% 80%, rgba(219,187,26,0.18), transparent 40%)' }} />
        <div className="relative h-full w-full flex flex-col items-center justify-center px-6 py-10">
          <div className="w-full max-w-lg bg-white/5 border border-yellow-400/40 backdrop-blur-md rounded-3xl shadow-2xl p-8 sm:p-10 space-y-6 text-center">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.18em] text-yellow-300">Welcome to Bobasoda</p>
              <h1 className="text-3xl sm:text-4xl font-bold text-yellow-400">Sign in to play</h1>
              <p className="text-sm sm:text-base text-yellow-100/80">
                Sign in with your Base Account and start predicting.
              </p>
            </div>
            <div className="flex flex-col gap-3 items-center">
              <SignInWithBaseButton
                align="center"
                variant="solid"
                colorScheme="dark"
                onClick={handleConnectWallet}
              />
              <p className="text-xs text-yellow-100/70">
                Powered by Base Account • Base Sepolia testnet
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
        onConnectWallet={handleConnectWallet}
        onDisconnectWallet={handleDisconnectWallet}
        onSend={handleSend}
        isConnected={authenticated}
        walletAddress={walletAddress}
        balance={balance}
        isLoadingBalance={isLoadingBalance}
      />
      <BottomNav />
    </div>
  )
}
