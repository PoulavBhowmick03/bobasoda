"use client"

import BottomNav from "@/components/bottom-nav";
import { useViewportHeight } from "@/hooks/useViewportHeight";
import { useEffect, useMemo, useState } from "react";

type LeaderboardEntry = {
  id: string
  handle: string
  address: string
  gamesPlayed: number
  wins: number
  roi: number
  volume: number
}

export default function LeaderboardPage() {
  const viewportHeight = useViewportHeight()
  const [isLoading, setIsLoading] = useState(true)
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [lastUpdated, setLastUpdated] = useState<string>("")

  const mockData: LeaderboardEntry[] = useMemo(() => ([
    { id: '1', handle: 'orbitalbull', address: '0xA1C3...8d9F', gamesPlayed: 128, wins: 74, roi: 42.4, volume: 12.8 },
    { id: '2', handle: 'bearsnacks', address: '0x4F12...cB33', gamesPlayed: 96, wins: 52, roi: 31.1, volume: 9.4 },
    { id: '3', handle: 'pythfan', address: '0x9b8E...dE21', gamesPlayed: 88, wins: 49, roi: 28.9, volume: 8.2 },
    { id: '4', handle: 'bobasoda', address: '0x7C44...fA10', gamesPlayed: 72, wins: 38, roi: 19.6, volume: 7.1 },
    { id: '5', handle: 'basepilot', address: '0x15a3...991c', gamesPlayed: 60, wins: 32, roi: 15.4, volume: 5.7 },
  ]), [])

  useEffect(() => {
    // TODO: Replace mock data with Synapse SDK fetch
    const timeout = setTimeout(() => {
      setEntries(mockData)
      setIsLoading(false)
      setLastUpdated(new Date().toLocaleTimeString())
    }, 300)
    return () => clearTimeout(timeout)
  }, [mockData])

  const totalPlayers = entries.length
  const totalGames = entries.reduce((acc, e) => acc + e.gamesPlayed, 0)
  const topRoi = entries[0]?.roi ?? 0

  return (
    <main
      className="w-screen overflow-hidden"
      style={{
        height: viewportHeight ? `${viewportHeight}px` : '100vh',
        backgroundColor: '#27262c',
      }}
      >
        <div
          className="w-full max-w-md md:max-w-xl mx-auto relative"
          style={{
            height: '100%',
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <div className="relative h-full w-full">
          <div className="h-full w-full flex flex-col gap-4 p-5 sm:p-6">
            <header className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-yellow-300">Leaderboard</p>
                <h1 className="text-3xl sm:text-4xl font-bold text-yellow-400">Top predictors</h1>
                <p className="text-sm text-yellow-100/80">Rankings derived from registered players and their rounds.</p>
              </div>
              <div className="text-right text-xs text-yellow-100/60">
                <p className="opacity-80">Base Sepolia</p>
                <p className="opacity-70">Updated {lastUpdated || '—'}</p>
              </div>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-2xl bg-black/30 border border-yellow-400/30 p-4">
                <p className="text-yellow-300 text-xs uppercase tracking-wide">Players</p>
                <p className="text-2xl sm:text-3xl font-bold text-yellow-400">{isLoading ? '—' : totalPlayers}</p>
              </div>
              <div className="rounded-2xl bg-black/30 border border-yellow-400/30 p-4">
                <p className="text-yellow-300 text-xs uppercase tracking-wide">Games played</p>
                <p className="text-2xl sm:text-3xl font-bold text-yellow-400">{isLoading ? '—' : totalGames}</p>
              </div>
              <div className="rounded-2xl bg-black/30 border border-yellow-400/30 p-4">
                <p className="text-yellow-300 text-xs uppercase tracking-wide">Top ROI</p>
                <p className="text-2xl sm:text-3xl font-bold text-yellow-400">{isLoading ? '—' : `${topRoi.toFixed(1)}%`}</p>
              </div>
            </div>

            <div className="flex-1 rounded-3xl bg-black/30 border border-yellow-400/30 backdrop-blur-md overflow-hidden">
              <div className="grid grid-cols-6 gap-2 px-4 py-3 text-xs text-yellow-100/80 border-b border-yellow-400/20">
                <span className="col-span-2">Player</span>
                <span className="text-right">Games</span>
                <span className="text-right">Wins</span>
                <span className="text-right">ROI</span>
                <span className="text-right">Volume</span>
              </div>
              <div className="divide-y divide-yellow-400/10">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="px-4 py-3 grid grid-cols-6 gap-2 text-sm text-yellow-50/80 animate-pulse">
                      <div className="col-span-2 h-4 bg-yellow-400/20 rounded" />
                      <div className="h-4 bg-yellow-400/20 rounded" />
                      <div className="h-4 bg-yellow-400/20 rounded" />
                      <div className="h-4 bg-yellow-400/20 rounded" />
                      <div className="h-4 bg-yellow-400/20 rounded" />
                    </div>
                  ))
                ) : (
                  entries.map((entry, idx) => (
                    <div key={entry.id} className="px-4 py-3 grid grid-cols-6 gap-2 text-sm text-yellow-50">
                      <div className="col-span-2 flex flex-col">
                        <span className="font-semibold text-yellow-200">#{idx + 1} {entry.handle}</span>
                        <span className="text-[11px] text-yellow-100/70">{entry.address}</span>
                      </div>
                      <span className="text-right">{entry.gamesPlayed}</span>
                      <span className="text-right">{entry.wins}</span>
                      <span className="text-right">{entry.roi.toFixed(1)}%</span>
                      <span className="text-right">{entry.volume.toFixed(2)} ETH</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="text-xs text-yellow-100/70 bg-black/30 border border-yellow-400/30 rounded-2xl p-4 space-y-1">
              <p className="font-semibold text-yellow-300">Synapse integration (Filecoin Cloud)</p>
              <p>To persist leaderboard data, install the Synapse SDK, set your API key & endpoint, and replace the mock fetch with a Synapse client call.</p>
              <p>Suggested env vars: <code className="text-yellow-200">SYNAPSE_API_KEY</code>, <code className="text-yellow-200">SYNAPSE_PROJECT_ID</code>, <code className="text-yellow-200">SYNAPSE_ENDPOINT</code>.</p>
              <p>Backend flow: on sign-in, write user profile + wallet address to Synapse; after each round, append game stats. This page should query aggregated stats (games, wins, ROI, volume) sorted by ROI/volume.</p>
            </div>
          </div>
          <BottomNav />
        </div>
      </div>
    </main>
  );
}
