"use client"

import { useState } from "react"
import { useViewportHeight } from "@/hooks/useViewportHeight"
import BottomNav from "@/components/bottom-nav"

export default function WaitlistPage() {
  const viewportHeight = useViewportHeight()
  const [twitter, setTwitter] = useState("")
  const [telegram, setTelegram] = useState("")
  const [designation, setDesignation] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ twitter, telegram, designation }),
      })

      if (!response.ok) {
        throw new Error("Failed to join waitlist")
      }

      setSubmitted(true)
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main
      className="w-screen overflow-hidden"
      style={{
        height: viewportHeight ? `${viewportHeight}px` : '100vh',
        backgroundColor: '#27262c',
      }}
    >
      <div
        className="w-full max-w-md md:max-w-xl mx-auto relative flex flex-col"
        style={{
          height: '100%',
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-24">
          <h1 className="text-4xl font-bold text-white mb-4 text-center">
            Join the Waitlist
          </h1>
          <p className="text-gray-400 text-center mb-8">
            Be the first to know when we launch. Get early access and exclusive benefits.
          </p>

          {!submitted ? (
            <form onSubmit={handleSubmit} className="w-full max-w-sm">
              <input
                type="text"
                value={twitter}
                onChange={(e) => setTwitter(e.target.value)}
                placeholder="Twitter handle (e.g. @gavinbelson)"
                required
                disabled={loading}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="w-full px-4 py-3 rounded-xl bg-white/10 text-white placeholder-gray-400 border border-white/20 focus:outline-none focus:border-yellow-400 mb-4 disabled:opacity-50"
                style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
              />
              <input
                type="text"
                value={telegram}
                onChange={(e) => setTelegram(e.target.value)}
                placeholder="Telegram handle (e.g. @gavinbelson)"
                required
                disabled={loading}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="w-full px-4 py-3 rounded-xl bg-white/10 text-white placeholder-gray-400 border border-white/20 focus:outline-none focus:border-yellow-400 mb-4 disabled:opacity-50"
                style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
              />
              <div className="relative mb-4">
                <select
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  required
                  disabled={loading}
                  className={`w-full px-4 py-3 pr-10 rounded-xl bg-white/10 border border-white/20 focus:outline-none focus:border-yellow-400 disabled:opacity-50 appearance-none cursor-pointer ${
                    designation ? 'text-white' : 'text-yellow-400 font-bold'
                  }`}
                  style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
                >
                  <option value="" disabled className="bg-[#27262c]">Select your role</option>
                  <option value="founder" className="bg-[#27262c]">Founder</option>
                  <option value="builder" className="bg-[#27262c]">Builder</option>
                  <option value="looking_around" className="bg-[#27262c]">Looking around</option>
                </select>
                <svg
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              {error && (
                <p className="text-red-400 text-sm mb-4">{error}</p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-yellow-400 text-black font-semibold hover:bg-yellow-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Joining..." : "Join Waitlist"}
              </button>
            </form>
          ) : (
            <div className="text-center">
              <div className="text-4xl mb-4">🎉</div>
              <p className="text-white text-lg font-semibold">You&apos;re on the list!</p>
              <p className="text-gray-400 mt-2">We&apos;ll notify you when we launch.</p>
            </div>
          )}
        </div>

        <BottomNav />
      </div>
    </main>
  )
}
