"use client"

import MarketCard from "./market-card"
import CommitPopup from "./commit-popup"
import { useRef, useEffect, useState } from "react"
import { ChevronUp, ChevronDown, Search, Bell } from "lucide-react"
import Image from "next/image"
import BottomNav from "./bottom-nav"
import { useBettingHistory } from "@/hooks/useBettingHistory"
import { useCurrentRound } from "@/hooks/useCurrentRound"
import { useCDPTransaction } from "@/hooks/useCDPTransaction"
import { PREDICTION_ADDRESS, PREDICTION_ABI } from "@/lib/prediction-contract"
import { createPublicClient, http, parseEther } from "viem"
import { baseSepoliaChain } from "./providers"

export default function Markets() {
  const markets = ["ETH", "BTC", "BNB"]
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showCommitPopup, setShowCommitPopup] = useState(false)
  const [commitDirection, setCommitDirection] = useState<"up" | "down">("up")
  const [swipesByMarket, setSwipesByMarket] = useState<Record<string, number>>({})
  
  const { addBet } = useBettingHistory()
  const { currentEpoch, roundData } = useCurrentRound()
  const { placeBet, isPending } = useCDPTransaction()
  const [minBetWei, setMinBetWei] = useState<bigint | null>(null)

  useEffect(() => {
    // Detect if device is mobile
    const checkMobile = () => {
      setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    // Fetch min bet from contract once
    const fetchMinBet = async () => {
      try {
        const client = createPublicClient({
          chain: baseSepoliaChain,
          transport: http('https://sepolia.base.org'),
        })
        const result = await client.readContract({
          address: PREDICTION_ADDRESS as `0x${string}`,
          abi: PREDICTION_ABI,
          functionName: 'minBetAmount',
        })
        if (typeof result === 'bigint') {
          setMinBetWei(result)
        }
      } catch (err) {
        console.warn('Could not fetch min bet amount:', err)
      }
    }
    fetchMinBet()
  }, [])

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    let scrollTimeout: NodeJS.Timeout

    const handleScroll = () => {
      clearTimeout(scrollTimeout)
      scrollTimeout = setTimeout(() => {
        const scrollTop = container.scrollTop
        const itemHeight = container.clientHeight
        const index = Math.round(scrollTop / itemHeight)
        setCurrentIndex(index)

        container.scrollTo({
          top: index * itemHeight,
          behavior: 'smooth'
        })
      }, 150)
    }

    container.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      container.removeEventListener('scroll', handleScroll)
      clearTimeout(scrollTimeout)
    }
  }, [])

  const scrollToMarket = (index: number) => {
    const container = scrollContainerRef.current
    if (!container) return

    const itemHeight = container.clientHeight
    container.scrollTo({
      top: index * itemHeight,
      behavior: 'smooth'
    })
    setCurrentIndex(index)
  }

  const handleSwipeComplete = (direction: "up" | "down", marketName: string) => {
    setCommitDirection(direction)
    setShowCommitPopup(true)
    // Mark this market as swiped for the current epoch
    setSwipesByMarket((prev) => ({
      ...prev,
      [marketName]: currentEpoch ?? 0,
    }))
  }

  const handleCommitConfirm = async (amount: string) => {
    console.log(`Committed ${amount} betting ${commitDirection.toUpperCase()}`)

    if (!currentEpoch || !roundData) {
      alert('Round not active yet. Please wait for the next round to start.')
      return
    }

    const now = Math.floor(Date.now() / 1000)
    if (!(now > roundData.startTimestamp && now < roundData.lockTimestamp)) {
      alert('Bet window is closed for this round.')
      return
    }

    if (!amount || Number(amount) <= 0) {
      alert('Enter a valid amount greater than zero.')
      return
    }

    try {
      const weiAmount = parseEther(amount)
      if (minBetWei && weiAmount < minBetWei) {
        alert(`Minimum bet is ${Number(minBetWei) / 1e18} ETH`)
        return
      }
    } catch (err) {
      alert('Invalid amount')
      return
    }

    // Call on-chain bet
    const betResult = await placeBet({
      amount,
      direction: commitDirection === 'up' ? 'bull' : 'bear',
      contractAddress: PREDICTION_ADDRESS,
      epoch: currentEpoch || 0,
    })

    if (betResult.success) {
      addBet({
        epoch: currentEpoch || 0,
        direction: commitDirection === 'up' ? 'bull' : 'bear',
        amount: amount,
      })
      setShowCommitPopup(false)
    } else if (betResult.error) {
      alert(`Bet failed: ${betResult.error}`)
    }
  }

  const handleTimerReset = () => {
    // Clear all swipes when timer resets (new round begins)
    setSwipesByMarket({})
  }

  // When a new epoch arrives from the contract, reset swipes so users can bet again
  useEffect(() => {
    if (currentEpoch !== undefined && currentEpoch !== null) {
      setSwipesByMarket({})
    }
  }, [currentEpoch])

  return (
    <div className="relative h-full w-full">
      {/* Fixed Header - Always on top */}
      <div
        className="absolute z-50 flex items-center justify-between pointer-events-none"
        style={{
          top: 'calc(2rem + env(safe-area-inset-top, 0px))',
          left: '2rem',
          right: '2rem',
        }}
      >
        <div className="pointer-events-auto">
          <Image
            src="/bobasoda-logo.png"
            alt="BobaSoda"
            width={150}
            height={50}
            className="h-10 sm:h-12 w-auto"
          />
        </div>
        <div className="flex gap-2 sm:gap-3 pointer-events-auto">
          <button className="p-1.5 sm:p-2 hover:bg-yellow-500 rounded-full transition">
            <Search className="w-4 h-4 sm:w-5 sm:h-5 text-black opacity-75" />
          </button>
          <button className="p-1.5 sm:p-2 hover:bg-yellow-500 rounded-full transition">
            <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-black opacity-75" />
          </button>
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        className="h-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
        style={{
          WebkitOverflowScrolling: 'touch',
          scrollSnapType: 'y mandatory',
          scrollSnapStop: 'always',
        }}
      >
        {markets.map((market) => (
          <div
            key={market}
            className="h-full w-full snap-start snap-always flex-shrink-0"
            style={{
              scrollSnapAlign: 'start',
              scrollSnapStop: 'always',
            }}
          >
            <MarketCard
              marketName={market}
              onSwipeComplete={handleSwipeComplete}
              hasSwipedThisRound={swipesByMarket[market] === currentEpoch}
              onTimerReset={handleTimerReset}
            />
          </div>
        ))}
      </div>

      {/* Desktop Navigation Arrows */}
      {!isMobile && (
        <>
          {currentIndex > 0 && (
            <button
              onClick={() => scrollToMarket(currentIndex - 1)}
              className="absolute top-4 left-1/2 -translate-x-1/2 z-30 p-3 bg-white rounded-full shadow-lg hover:bg-gray-100 transition"
              style={{ top: '-60px' }}
            >
              <ChevronUp className="w-6 h-6 text-gray-800" />
            </button>
          )}

          {currentIndex < markets.length - 1 && (
            <button
              onClick={() => scrollToMarket(currentIndex + 1)}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 p-3 bg-white rounded-full shadow-lg hover:bg-gray-100 transition"
              style={{ bottom: '-60px' }}
            >
              <ChevronDown className="w-6 h-6 text-gray-800" />
            </button>
          )}
        </>
      )}

      {/* Commit Popup */}
      {showCommitPopup && (
        <CommitPopup
          direction={commitDirection}
          onConfirm={handleCommitConfirm}
          isPending={isPending}
        />
      )}

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  )
}
