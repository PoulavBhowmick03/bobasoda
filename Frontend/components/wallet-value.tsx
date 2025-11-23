"use client"

import MarketCard from "./market-card"
import CommitPopup from "./commit-popup"
import Profile from "./profile"
import { useRef, useEffect, useState } from "react"
import { ChevronUp, ChevronDown, Search, Bell } from "lucide-react"
import Image from "next/image"

export default function WalletValue() {
  const markets = ["ETH", "BNB"]
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showCommitPopup, setShowCommitPopup] = useState(false)
  const [commitDirection, setCommitDirection] = useState<"up" | "down">("up")
  const [currentPage, setCurrentPage] = useState<"markets" | "profile">("profile")
  const [swipedMarkets, setSwipedMarkets] = useState<Set<string>>(new Set())

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
    // Mark this market as swiped for this round
    setSwipedMarkets(prev => new Set(prev).add(marketName))
  }

  const handleCommitConfirm = (amount: string) => {
    console.log(`Committed ${amount} betting ${commitDirection.toUpperCase()}`)
    setShowCommitPopup(false)
  }

  const handleTimerReset = () => {
    // Clear all swipes when timer resets (new round begins)
    setSwipedMarkets(new Set())
  }

  const handleConnectWallet = () => {
    // This will be handled by user's wallet connection logic
    console.log("Connect wallet event emitted")
  }

  const handleDisconnectWallet = () => {
    // This will be handled by user's wallet disconnection logic
    console.log("Disconnect wallet event emitted")
  }

  return (
    <div className="relative h-full w-full">
      {/* Content Area */}
      {currentPage === "markets" ? (
        <>
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
              hasSwipedThisRound={swipedMarkets.has(market)}
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
            />
          )}
        </>
      ) : (
        <Profile
          onConnectWallet={handleConnectWallet}
          onDisconnectWallet={handleDisconnectWallet}
        />
      )}

      {/* Fixed Bottom Navigation - Always on top */}
      <div
        className="absolute inset-x-4 bottom-0 z-50 flex items-center justify-between bg-white rounded-t-3xl py-2 px-2 sm:p-4 px-6 sm:px-8"
        style={{
          paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))',
        }}
      >
        <button
          onClick={() => setCurrentPage("profile")}
          className={`p-3 sm:p-4 rounded-full transition ${
        currentPage === "profile" ? "bg-yellow-400" : "hover:bg-gray-100"
          }`}
        >
          <Image
            src="/icons/user-square.svg"
            alt="Profile"
            width={40}
            height={40}
            className={`w-8 h-8 sm:w-10 sm:h-10 ${
        currentPage === "profile" ? "[filter:brightness(0)]" : "[filter:brightness(0)_saturate(100%)_invert(45%)_sepia(0%)_saturate(0%)_hue-rotate(0deg)_brightness(95%)_contrast(92%)]"
            }`}
          />
        </button>
        <button
          onClick={() => setCurrentPage("markets")}
          className={`p-4 sm:p-5 rounded-full transition ${
        currentPage === "markets" ? "bg-yellow-400 text-black" : "hover:bg-gray-100 text-gray-600"
          }`}
        >
          <Image
            src="/icons/video-console.svg"
            alt="Markets"
            width={40}
            height={40}
            className={`w-8 h-8 sm:w-10 sm:h-10 ${
        currentPage === "markets" ? "[filter:brightness(0)]" : "[filter:brightness(0)_saturate(100%)_invert(45%)_sepia(0%)_saturate(0%)_hue-rotate(0deg)_brightness(95%)_contrast(92%)]"
            }`}
          />
        </button>
        <button className="p-3 sm:p-4 hover:bg-gray-100 rounded-full transition">
          <Image
            src="/icons/transaction-history.svg"
            alt="History"
            width={40}
            height={40}
            className="w-8 h-8 sm:w-10 sm:h-10 [filter:brightness(0)_saturate(100%)_invert(45%)_sepia(0%)_saturate(0%)_hue-rotate(0deg)_brightness(95%)_contrast(92%)]"
          />
        </button>
        <button className="p-3 sm:p-4 hover:bg-gray-100 rounded-full transition">
          <Image
            src="/icons/brain-02.svg"
            alt="AI"
            width={40}
            height={40}
            className="w-8 h-8 sm:w-10 sm:h-10 [filter:brightness(0)_saturate(100%)_invert(45%)_sepia(0%)_saturate(0%)_hue-rotate(0deg)_brightness(95%)_contrast(92%)]"
          />
        </button>
      </div>
    </div>
  )
}
