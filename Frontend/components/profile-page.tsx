"use client"

import Profile from "./profile"
import BottomNav from "./bottom-nav"
import { usePrivy, useWallets } from "@privy-io/react-auth"
import { useEffect, useState } from "react"
import { createPublicClient, http, formatEther } from "viem"
import { baseSepoliaChain } from "./providers"

export default function ProfilePage() {
  const { login, logout, authenticated, ready, user } = usePrivy()
  const { wallets } = useWallets()
  const [walletAddress, setWalletAddress] = useState<string>("")
  const [balance, setBalance] = useState<string>("0.00")
  const [isLoadingBalance, setIsLoadingBalance] = useState<boolean>(false)

  // Debug: Log Privy state changes
  useEffect(() => {
    console.log("=== PRIVY STATE ===")
    console.log("Ready:", ready)
    console.log("Authenticated:", authenticated)
    console.log("User:", user)
    if (user) {
      console.log("User ID:", user.id)
      console.log("Linked Accounts:", user.linkedAccounts)
      console.log("Email:", user.email)

      // Check for wallet in linked accounts
      const walletAccount = user.linkedAccounts?.find((account: any) =>
        account.type === 'wallet' || account.type === 'smart_wallet'
      )
      console.log("Wallet in linked accounts:", walletAccount)
    }
    console.log("Wallets from useWallets:", wallets)
    console.log("==================")
  }, [ready, authenticated, user, wallets])

  // Create public client for Base Sepolia
  const publicClient = createPublicClient({
    chain: baseSepoliaChain,
    transport: http(),
  })

  useEffect(() => {
    if (authenticated && wallets.length > 0) {
      console.log("=== WALLET CONNECTION DETAILS ===")
      console.log("Account Status:")
      console.log("- Authenticated:", authenticated)
      console.log("- Ready:", ready)
      console.log("- Total Wallets:", wallets.length)

      // Get the embedded wallet address
      const embeddedWallet = wallets.find((wallet) => wallet.walletClientType === "privy")

      if (embeddedWallet) {
        console.log("\nEmbedded Wallet Found:")
        console.log("- Address:", embeddedWallet.address)
        console.log("- Wallet Client Type:", embeddedWallet.walletClientType)
        console.log("- Connector Type:", embeddedWallet.connectorType)
        console.log("- Chain ID:", embeddedWallet.chainId)

        console.log("\nNetwork Details:")
        console.log("- Chain ID:", embeddedWallet.chainId, "(Base Sepolia: 84532)")
        console.log("- RPC URL: https://sepolia.base.org")
        console.log("- Explorer: https://sepolia.basescan.org")

        console.log("\nFull Wallet Object:", embeddedWallet)
        console.log("================================\n")

        setWalletAddress(embeddedWallet.address)
        // Fetch balance
        fetchBalance(embeddedWallet.address)
      } else {
        console.warn("No embedded wallet found. Available wallets:", wallets)
      }
    } else {
      if (!authenticated) {
        console.log("User not authenticated")
      }
      if (wallets.length === 0) {
        console.log("No wallets connected")
      }
      setWalletAddress("")
      setBalance("0.00")
    }
  }, [authenticated, wallets, ready])

  const fetchBalance = async (address: string) => {
    setIsLoadingBalance(true)
    console.log("Fetching balance for address:", address)

    try {
      const balanceWei = await publicClient.getBalance({
        address: address as `0x${string}`,
      })
      const balanceFormatted = formatEther(balanceWei)
      const balanceFinal = parseFloat(balanceFormatted).toFixed(4)

      console.log("Balance Details:")
      console.log("- Balance (Wei):", balanceWei.toString())
      console.log("- Balance (ETH):", balanceFinal)
      console.log("- Chain: Base Sepolia (84532)")

      setBalance(balanceFinal)
    } catch (error) {
      console.error("Error fetching balance:", error)
      setBalance("0.00")
    } finally {
      setIsLoadingBalance(false)
    }
  }

  const handleConnectWallet = () => {
    console.log("Initiating wallet connection...")
    login()
  }

  const handleDisconnectWallet = () => {
    console.log("Disconnecting wallet...")
    logout()
    setWalletAddress("")
    console.log("Wallet disconnected successfully")
  }

  const handleSend = () => {
    console.log("=== SEND TRANSACTION ===")
    console.log("Current wallet address:", walletAddress)
    console.log("Current balance:", balance, "ETH")
    console.log("Chain: Base Sepolia (84532)")
    console.log("=======================")
  }

  // Wait for Privy to be ready
  if (!ready) {
    return (
      <div className="relative h-full w-full">
        <div className="h-full w-full flex items-center justify-center" style={{ backgroundColor: '#27262c' }}>
          <p className="text-yellow-400 text-xl">Loading...</p>
        </div>
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
