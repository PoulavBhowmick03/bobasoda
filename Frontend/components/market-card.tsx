"use client"

import { ArrowUp, ArrowDown } from "lucide-react"
import { useState, useRef, useEffect, useMemo } from "react"
import { usePriceWithFallback } from "@/hooks/usePriceWithFallback"
import { useCurrentRound } from "@/hooks/useCurrentRound"
import { SUPPORTED_TOKENS } from "@/lib/pyth-config"
import EthPriceChart from "./eth-price-chart"
import { baseSepoliaChain } from "./providers"

interface MarketCardProps {
  marketName: string
  onSwipeComplete: (direction: "up" | "down", marketName: string) => void
  hasSwipedThisRound: boolean
  onTimerReset: () => void
}

export default function MarketCard({ marketName, onSwipeComplete, hasSwipedThisRound, onTimerReset }: MarketCardProps) {
  // Check if market is supported by Pyth
  const isSupported = marketName in SUPPORTED_TOKENS
  const tokenSymbol = isSupported ? marketName as keyof typeof SUPPORTED_TOKENS : 'ETH'

  // Fetch price with smart fallback (Pyth primary, Chainlink backup for ETH)
  const { price, source, isLoading: isPriceLoading, error: priceError } = usePriceWithFallback(tokenSymbol)

  // Fetch round configuration and current round data from contract
  const { currentEpoch, roundData } = useCurrentRound()
  const [currentCardId, setCurrentCardId] = useState(1)
  const [dragOffset, setDragOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [rotation, setRotation] = useState(0)
  const [isMagnetized, setIsMagnetized] = useState(false)
  // Initialize timer from localStorage if available (for smoother refresh experience)
  const [timerProgress, setTimerProgress] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedProgress = localStorage.getItem('bobasoda_timer_progress')
      const savedEpoch = localStorage.getItem('bobasoda_round_epoch')

      // Only use saved progress if it's from the same epoch
      // This will be validated again when roundData loads
      if (savedProgress && savedEpoch) {
        return parseFloat(savedProgress)
      }
    }
    return 0
  })
  const [lockPrice, setLockPrice] = useState<number | null>(null)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [onboardingTimeLeft, setOnboardingTimeLeft] = useState(30)
  const [faucetStatus, setFaucetStatus] = useState<string | null>(null)
  const dragStartX = useRef(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const gainNodeRef = useRef<GainNode | null>(null)
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null)
  const lastResetEpochRef = useRef<number | null>(null)
  const onboardingTimerRef = useRef<NodeJS.Timeout | null>(null)

  const faucetUrl = useMemo(() => 'https://www.coinbase.com/faucets/base-sepolia-testnet', [])
  const onboardingStorageKey = useMemo(() => 'bobasoda_onboarding_seen_v1', [])

  useEffect(() => {
    if (!roundData) {
      console.log('⏸️ Timer waiting for round data...')
      // Don't reset timer to 0 while waiting for data - keep last known state
      return
    }

    // Check if the saved epoch matches current epoch, if not clear localStorage
    if (typeof window !== 'undefined' && currentEpoch !== null) {
      const savedEpoch = localStorage.getItem('bobasoda_round_epoch')
      if (savedEpoch && parseInt(savedEpoch) !== currentEpoch) {
        console.log(`🔄 Round changed from ${savedEpoch} to ${currentEpoch}, clearing saved timer`)
        localStorage.removeItem('bobasoda_timer_progress')
        localStorage.removeItem('bobasoda_round_epoch')
        setTimerProgress(0)
      }
    }

    // Immediately sync when round data changes (from contract events)
    console.log(`⚡ Round data updated - Epoch ${currentEpoch}, syncing timer...`)
    console.log(`   Start: ${roundData.startTimestamp}, Lock: ${roundData.lockTimestamp}, Close: ${roundData.closeTimestamp}`)

    // Use contract round timestamps for synchronization
    const updateTimer = () => {
      const now = Math.floor(Date.now() / 1000)
      const roundDuration = roundData.closeTimestamp - roundData.startTimestamp
      const elapsed = now - roundData.startTimestamp
      const progress = Math.min((elapsed / roundDuration) * 100, 100)

      // Only update if we have valid timestamps
      if (roundDuration > 0 && roundData.startTimestamp > 0) {
        const validProgress = Math.max(0, progress)
        setTimerProgress(validProgress)
        // Save to localStorage for smoother refresh experience
        if (typeof window !== 'undefined' && currentEpoch !== null) {
          localStorage.setItem('bobasoda_timer_progress', validProgress.toString())
          localStorage.setItem('bobasoda_round_epoch', currentEpoch.toString())
        }
      }

      // Debug log every 10 seconds
      if (Math.floor(now) % 10 === 0) {
        console.log(`⏱️ Timer progress: ${progress.toFixed(1)}% (${elapsed}s / ${roundDuration}s)`)
      }

      // Set lock price from contract when available
      if (roundData.lockPrice > BigInt(0) && lockPrice === null) {
        const contractLockPrice = Number(roundData.lockPrice) / 1e8 // Convert from 8 decimals
        setLockPrice(contractLockPrice)
        console.log(`🔒 Lock Price from contract: $${contractLockPrice.toFixed(4)}`)
        console.log(`   Round ${currentEpoch}: Locked at ${new Date(roundData.lockTimestamp * 1000).toLocaleTimeString()}`)
      }

      // Reset for next round when current round ends (only once per epoch)
      if (progress >= 100 && lastResetEpochRef.current !== currentEpoch) {
        lastResetEpochRef.current = currentEpoch
        const closePrice = roundData.closePrice > BigInt(0) ? Number(roundData.closePrice) / 1e8 : null
        console.log(`🏁 Round ${currentEpoch} ended`)
        if (lockPrice !== null && closePrice !== null) {
          const diff = closePrice - lockPrice
          const winner = diff > 0 ? 'BULLS' : diff < 0 ? 'BEARS' : 'TIE'
          console.log(`   Winner: ${winner} (Close: $${closePrice.toFixed(4)} vs Lock: $${lockPrice.toFixed(4)}, Diff: ${diff > 0 ? '+' : ''}${diff.toFixed(4)})`)
        }
        setLockPrice(null)
        // Clear saved timer state when round ends
        if (typeof window !== 'undefined') {
          localStorage.removeItem('bobasoda_timer_progress')
          localStorage.removeItem('bobasoda_round_epoch')
        }
        onTimerReset()
      }
    }

    // Immediate update when round data changes (event-driven)
    updateTimer()

    // Continue smooth animation updates every 100ms
    const interval = setInterval(updateTimer, 100)

    return () => clearInterval(interval)
  }, [roundData, currentEpoch, lockPrice])

  useEffect(() => {
    // Initialize audio on client side with mobile-friendly settings and volume boost
    if (typeof window !== 'undefined') {
      const audio = new Audio('/sounds/game-start.mp3')
      audio.preload = 'auto'
      audio.volume = 1.0 // Max browser volume
      audio.load()
      audioRef.current = audio

      // Create Web Audio API context for volume amplification
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext
      if (AudioContext) {
        const audioContext = new AudioContext()
        const gainNode = audioContext.createGain()
        gainNode.gain.value = 2.0 // 200% volume boost

        const source = audioContext.createMediaElementSource(audio)
        source.connect(gainNode)
        gainNode.connect(audioContext.destination)

        audioContextRef.current = audioContext
        gainNodeRef.current = gainNode
        sourceNodeRef.current = source
      }

      // Unlock audio on first touch/click for iOS
      const unlockAudio = () => {
        if (audioRef.current) {
          audioRef.current.play().then(() => {
            audioRef.current?.pause()
            audioRef.current!.currentTime = 0
          }).catch(() => {})
        }
        // Resume audio context on iOS
        if (audioContextRef.current?.state === 'suspended') {
          audioContextRef.current.resume()
        }
        document.removeEventListener('touchstart', unlockAudio)
        document.removeEventListener('click', unlockAudio)
      }

      document.addEventListener('touchstart', unlockAudio, { once: true })
      document.addEventListener('click', unlockAudio, { once: true })
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const seen = localStorage.getItem(onboardingStorageKey)
    if (!seen) {
      setShowOnboarding(true)
      setOnboardingTimeLeft(30)
      onboardingTimerRef.current = setInterval(() => {
        setOnboardingTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(onboardingTimerRef.current as NodeJS.Timeout)
            localStorage.setItem(onboardingStorageKey, 'true')
            setShowOnboarding(false)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => {
      if (onboardingTimerRef.current) {
        clearInterval(onboardingTimerRef.current)
      }
    }
  }, [onboardingStorageKey])

  const handleDismissOnboarding = () => {
    setShowOnboarding(false)
    localStorage.setItem(onboardingStorageKey, 'true')
    if (onboardingTimerRef.current) {
      clearInterval(onboardingTimerRef.current)
    }
  }

  const handleCopyFaucet = async () => {
    try {
      await navigator.clipboard.writeText(faucetUrl)
      setFaucetStatus('Faucet link copied')
      setTimeout(() => setFaucetStatus(null), 2500)
    } catch (err) {
      console.error('Failed to copy faucet link:', err)
      setFaucetStatus('Copy failed, tap to open faucet')
      window.open(faucetUrl, '_blank')
    }
  }

  const handleAddNetwork = async () => {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      setFaucetStatus('No wallet detected')
      return
    }
    try {
      await (window as any).ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: `0x${baseSepoliaChain.id.toString(16)}`,
          chainName: baseSepoliaChain.name,
          nativeCurrency: baseSepoliaChain.nativeCurrency,
          rpcUrls: baseSepoliaChain.rpcUrls.default.http,
          blockExplorerUrls: [baseSepoliaChain.blockExplorers.default.url],
        }],
      })
      setFaucetStatus('Base Sepolia added to wallet')
      setTimeout(() => setFaucetStatus(null), 2500)
    } catch (err) {
      console.error('Failed to add network:', err)
      setFaucetStatus('Add network request was rejected')
    }
  }

  const cards = [currentCardId, currentCardId + 1, currentCardId + 2]

  const handleDragStart = (clientX: number) => {
    if (isSwipeBlocked) return
    setIsDragging(true)
    setIsMagnetized(false)
    dragStartX.current = clientX
  }

  const handleDragMove = (clientX: number) => {
    if (!isDragging || isMagnetized || isSwipeBlocked) return
    const rawOffset = clientX - dragStartX.current
    const dragCoefficient = 0.5
    const offset = rawOffset * dragCoefficient
    const iconFullyVisibleThreshold = 80

    if (Math.abs(offset) >= iconFullyVisibleThreshold) {
      setIsMagnetized(true)
      setIsDragging(false)
      const direction = offset > 0 ? 1 : -1
      setDragOffset(direction * 500)
      setRotation(direction * 12)

      // Play sound on swipe
      if (audioRef.current) {
        // Resume audio context if suspended (iOS requirement)
        if (audioContextRef.current?.state === 'suspended') {
          audioContextRef.current.resume()
        }

        audioRef.current.currentTime = 0
        const playPromise = audioRef.current.play()

        if (playPromise !== undefined) {
          playPromise.catch(err => {
            console.log('Audio play failed:', err)
            // Retry once on mobile
            setTimeout(() => {
              if (audioRef.current) {
                audioRef.current.play().catch(() => {})
              }
            }, 100)
          })
        }
      }

      setTimeout(() => {
        setCurrentCardId(prev => prev + 1)
        setDragOffset(0)
        setRotation(0)
        setIsMagnetized(false)
        // Trigger commit popup
        onSwipeComplete(direction > 0 ? "up" : "down", marketName)
      }, 400)
    } else {
      setDragOffset(offset)
      setRotation(offset / 20)
    }
  }

  const handleDragEnd = () => {
    if (isMagnetized) return
    setIsDragging(false)
    setDragOffset(0)
    setRotation(0)
  }

  const iconOpacity = Math.min(Math.abs(dragOffset) / 80, 0.6)
  const iconScale = Math.min(Math.abs(dragOffset) / 80, 1)

  // Block swiping when round is not active, in lock phase, or already swiped
  const now = Math.floor(Date.now() / 1000)
  const hasRoundTimestamps = !!roundData && roundData.lockTimestamp > 0 && roundData.startTimestamp > 0 && roundData.closeTimestamp > 0
  const isLockPhase = roundData ? (roundData.lockTimestamp > 0 ? now >= roundData.lockTimestamp : false) : false
  const isRoundActive = !!roundData && hasRoundTimestamps && now < roundData.lockTimestamp
  const isSwipeBlocked = !isRoundActive || isLockPhase || hasSwipedThisRound

  // Show "Round Locked" popup during lock phase only
  const showLockedPopup = isLockPhase && timerProgress < 100
  const showInactivePopup = !isRoundActive && !isLockPhase

  return (
    <div className="relative h-full w-full overflow-hidden select-none">
      {showOnboarding && (
        <div className="absolute inset-0 z-[30] bg-[#0a0b0d]/80 backdrop-blur-md flex items-center justify-center px-4">
          <div className="w-full max-w-xl bg-black bg-opacity-60 border border-yellow-400/70 rounded-2xl shadow-2xl p-6 sm:p-7 space-y-4 relative">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-yellow-300 opacity-80 uppercase tracking-[0.2em]">30s guide</p>
                <h2 className="text-2xl sm:text-3xl font-bold text-white">How Bobasoda rounds work</h2>
              </div>
              <button
                onClick={handleDismissOnboarding}
                className="text-yellow-300 text-sm px-3 py-1 rounded-full bg-yellow-500/10 hover:bg-yellow-500/20 transition"
              >
                Skip
              </button>
            </div>

            <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-yellow-400 transition-[width]"
                style={{ width: `${(onboardingTimeLeft / 30) * 100}%` }}
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-3 text-white">
              <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                <p className="text-yellow-300 font-semibold">1. Join a round</p>
                <p className="text-sm opacity-80 mt-1">Watch the live price, then swipe up/down before the lock time hits.</p>
              </div>
              <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                <p className="text-yellow-300 font-semibold">2. Lock & close</p>
                <p className="text-sm opacity-80 mt-1">After lock, no new bets. Round closes at the timer and settles on oracle price.</p>
              </div>
              <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                <p className="text-yellow-300 font-semibold">3. Payouts</p>
                <p className="text-sm opacity-80 mt-1">Winners split the pool minus fees. Claim after results land.</p>
              </div>
              <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                <p className="text-yellow-300 font-semibold">4. Base Sepolia</p>
                <p className="text-sm opacity-80 mt-1">We’re on Base Sepolia testnet—grab test ETH and add the network.</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleCopyFaucet}
                className="flex-1 bg-yellow-400 text-black font-bold py-3 px-4 rounded-xl hover:bg-yellow-300 transition"
              >
                Copy Base Sepolia faucet link
              </button>
              <button
                onClick={handleAddNetwork}
                className="flex-1 border border-yellow-400 text-yellow-300 font-bold py-3 px-4 rounded-xl hover:bg-yellow-400/10 transition"
              >
                Add Base Sepolia to wallet
              </button>
            </div>

            {faucetStatus && (
              <p className="text-center text-sm text-yellow-300 opacity-80">{faucetStatus}</p>
            )}
          </div>
        </div>
      )}

      {/* Round Locked Popup - Shows during lock phase only (30s-60s) */}
      {showLockedPopup && (
        <div className="absolute inset-0 z-[20] flex items-center justify-center pointer-events-none">
          <div className="bg-black bg-opacity-70 backdrop-blur-sm rounded-2xl px-8 py-6 mx-4 border-2 border-yellow-400">
            <p className="text-yellow-400 font-bold text-2xl sm:text-3xl text-center">
              🔒 ROUND LOCKED
            </p>
            <p className="text-white text-base sm:text-lg text-center mt-2 opacity-90">
              No more bets accepted
            </p>
          </div>
        </div>
      )}

      {/* Already Swiped Warning - Shows when user already swiped this round */}
      {hasSwipedThisRound && !showLockedPopup && (
        <div className="absolute inset-0 z-[20] flex items-center justify-center pointer-events-none">
          <div className="bg-black bg-opacity-60 backdrop-blur-sm rounded-2xl px-6 py-4 mx-4">
            <p className="text-yellow-400 font-bold text-lg sm:text-xl text-center">
              Already Swiped
            </p>
            <p className="text-white text-sm sm:text-base text-center mt-1 opacity-90">
              One swipe per round
            </p>
          </div>
        </div>
      )}
      {/* Swipe Feedback Icons */}
      {dragOffset > 0 && (
        <div
          className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 z-[15]"
          style={{
            opacity: iconOpacity,
            transform: `translateY(-50%) scale(${iconScale})`,
            transition: isMagnetized ? 'all 0.4s ease-out' : 'none',
          }}
        >
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-green-500 flex items-center justify-center shadow-lg">
            <ArrowUp className="w-8 h-8 sm:w-10 sm:h-10 text-white" strokeWidth={3} />
          </div>
        </div>
      )}

      {dragOffset < 0 && (
        <div
          className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 z-[15]"
          style={{
            opacity: iconOpacity,
            transform: `translateY(-50%) scale(${iconScale})`,
            transition: isMagnetized ? 'all 0.4s ease-out' : 'none',
          }}
        >
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-red-500 flex items-center justify-center shadow-lg">
            <ArrowDown className="w-8 h-8 sm:w-10 sm:h-10 text-white" strokeWidth={3} />
          </div>
        </div>
      )}

      {/* Card Stack */}
      {cards.reverse().map((cardId, reverseIndex) => {
        const index = cards.length - 1 - reverseIndex
        const isTopCard = index === 0
        const opacity = 1 - (index * 0.15)

        return (
          <div
            key={cardId}
            className="absolute inset-4 sm:inset-6 bg-yellow-400 rounded-2xl sm:rounded-3xl p-4 sm:p-6 flex flex-col border border-yellow-500 select-none"
            style={{
              transform: isTopCard
                ? `translateX(${dragOffset}px) rotate(${rotation}deg)`
                : 'none',
              transition: isTopCard && (isDragging && !isMagnetized)
                ? 'none'
                : isTopCard && isMagnetized
                ? 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
                : 'all 0.6s cubic-bezier(0.4, 0.0, 0.2, 1)',
              zIndex: 10 - index,
              opacity: opacity,
              cursor: isTopCard ? (isSwipeBlocked ? 'not-allowed' : (isDragging ? 'grabbing' : 'grab')) : 'default',
            }}
            onMouseDown={isTopCard ? (e) => handleDragStart(e.clientX) : undefined}
            onMouseMove={isTopCard ? (e) => handleDragMove(e.clientX) : undefined}
            onMouseUp={isTopCard ? handleDragEnd : undefined}
            onMouseLeave={isTopCard ? handleDragEnd : undefined}
            onTouchStart={isTopCard ? (e) => handleDragStart(e.touches[0].clientX) : undefined}
        onTouchMove={isTopCard ? (e) => handleDragMove(e.touches[0].clientX) : undefined}
        onTouchEnd={isTopCard ? handleDragEnd : undefined}
      >
        {showInactivePopup && (
          <div className="absolute inset-0 z-[20] flex items-center justify-center pointer-events-none">
            <div className="bg-black/80 backdrop-blur-sm rounded-2xl px-6 py-5 mx-4 border border-yellow-400/60 text-center">
              <p className="text-yellow-400 font-bold text-xl sm:text-2xl">Waiting for next round</p>
              <p className="text-yellow-100 opacity-80 text-sm mt-2">Rounds are not open yet. Please wait for the next start.</p>
            </div>
          </div>
        )}

        {/* Header Spacer */}
        <div
          className="mb-4 sm:mb-6"
          style={{
            height: 'calc(3rem + env(safe-area-inset-top, 0px))',
          }}
        />

        {/* Wallet Value */}
        <div className="mb-4 sm:mb-6">
          <div className="flex items-center gap-2 mb-1 sm:mb-2">
            <p className="text-black opacity-90 text-3xl sm:text-4xl md:text-5xl">{marketName}/USD</p>
            {source && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-black bg-opacity-10 text-black opacity-60">
                {source === 'pyth' ? '⚡ Pyth' : '🔗 Chainlink'}
              </span>
            )}
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-black">
            {isPriceLoading ? (
              <span className="opacity-50">Loading...</span>
            ) : priceError ? (
              <span className="opacity-50 text-lg">Error loading price</span>
            ) : price !== null ? (
              `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            ) : (
              <span className="opacity-50">--</span>
            )}
          </h2>
        </div>

        {/* Time Period Selector */}


        {/* Chart Area */}
        <div className="flex-1 mb-4 sm:mb-6 relative">
          {isSupported ? (
            <EthPriceChart currentPrice={price} lockPrice={lockPrice} />
          ) : (
            <>
              <div className="absolute inset-0 flex items-end justify-center gap-0.5">
                {Array.from({ length: 60 }).map((_, i) => {
                  const height = (Math.sin(i / 10) * 30 + 40).toFixed(2)
                  return (
                    <div
                      key={i}
                      className="flex-1 bg-yellow-500 opacity-60 rounded-t"
                      style={{
                        height: `${height}%`,
                      }}
                      suppressHydrationWarning
                    />
                  )
                })}
              </div>
              {/* Trend line */}
              <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                <polyline
                  points={Array.from({ length: 60 })
                    .map((_, i) => {
                      const y = (100 - (Math.sin(i / 10) * 30 + 40)).toFixed(2)
                      const x = ((i / 59) * 100).toFixed(2)
                      return `${x}% ${y}%`
                    })
                    .join(" ")}
                  fill="none"
                  stroke="rgba(0, 0, 0, 0.8)"
                  strokeWidth="2"
                  suppressHydrationWarning
                />
              </svg>
            </>
          )}
        </div>

        {/* Profit/Loss Info */}
        <div
          className="bg-yellow-500 rounded-xl sm:rounded-2xl p-4 sm:p-5 mb-4 sm:mb-6 relative overflow-hidden"
        >
          {/* Timer Overlay - Fills from left to right over 2 minutes */}
          <div
            className="absolute inset-0 bg-black pointer-events-none transition-all duration-75 ease-linear"
            style={{
              width: `${timerProgress}%`,
              opacity: 0.15,
            }}
          />

          <div className="relative z-10">
            <div className="mb-4 sm:mb-5">
              <p className="text-black text-xs sm:text-sm opacity-75 mb-1">CURRENT ROUND {currentEpoch ? `#${currentEpoch}` : ''}</p>
              <p className="text-black font-bold text-2xl sm:text-3xl">
                {roundData ? (Number(roundData.totalAmount) / 1e18).toFixed(4) : '0.0000'} ETH
              </p>
              <p className="text-black text-xs sm:text-sm opacity-60">PRIZE POOL</p>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:gap-6">
              <div>
                <p className="text-black text-xs sm:text-sm opacity-75 mb-1">Down (Bear)</p>
                <p className="font-bold text-3xl sm:text-4xl" style={{ color: '#ed4b9e' }}>
                  {roundData && roundData.bearAmount > BigInt(0) && roundData.totalAmount > BigInt(0)
                    ? ((Number(roundData.totalAmount) * 0.97) / Math.max(Number(roundData.bearAmount), 1)).toFixed(2)
                    : '0.00'}x
                </p>
                <p className="text-black text-[10px] sm:text-xs opacity-60">
                  {roundData ? (Number(roundData.bearAmount) / 1e18).toFixed(4) : '0.0000'} ETH
                </p>
              </div>
              <div className="text-right">
                <p className="text-black text-xs sm:text-sm opacity-75 mb-1">Up (Bull)</p>
                <p className="font-bold text-3xl sm:text-4xl" style={{ color: '#2e8656' }}>
                  {roundData && roundData.bullAmount > BigInt(0) && roundData.totalAmount > BigInt(0)
                    ? ((Number(roundData.totalAmount) * 0.97) / Math.max(Number(roundData.bullAmount), 1)).toFixed(2)
                    : '0.00'}x
                </p>
                <p className="text-black text-[10px] sm:text-xs opacity-60">
                  {roundData ? (Number(roundData.bullAmount) / 1e18).toFixed(4) : '0.0000'} ETH
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Transaction */}


        {/* Bottom Navigation Spacer */}
        <div
          style={{
            height: 'calc(5.5rem + env(safe-area-inset-bottom, 0px))',
          }}
        />
          </div>
        )
      })}
    </div>
  )
}
