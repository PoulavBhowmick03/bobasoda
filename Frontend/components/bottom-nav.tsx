"use client"

import { usePathname, useRouter } from "next/navigation"
import Image from "next/image"

export default function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()

  return (
    <div
      className="absolute inset-x-4 bottom-0 z-50 flex items-center justify-between bg-white rounded-t-3xl py-2 px-2 sm:p-4 px-6 sm:px-8"
      style={{
        paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))',
      }}
    >
      <button
        onClick={() => router.push("/profile")}
        className={`p-3 sm:p-4 rounded-full transition ${
          pathname === "/profile" || pathname === "/" ? "bg-yellow-400" : "hover:bg-gray-100"
        }`}
      >
        <Image
          src="/icons/user-square.svg"
          alt="Profile"
          width={40}
          height={40}
          className={`w-8 h-8 sm:w-10 sm:h-10 ${
            pathname === "/profile" || pathname === "/" ? "[filter:brightness(0)]" : "[filter:brightness(0)_saturate(100%)_invert(45%)_sepia(0%)_saturate(0%)_hue-rotate(0deg)_brightness(95%)_contrast(92%)]"
          }`}
        />
      </button>
      <button
        onClick={() => router.push("/markets")}
        className={`p-4 sm:p-5 rounded-full transition ${
          pathname === "/markets" ? "bg-yellow-400 text-black" : "hover:bg-gray-100 text-gray-600"
        }`}
      >
        <Image
          src="/icons/video-console.svg"
          alt="Markets"
          width={40}
          height={40}
          className={`w-8 h-8 sm:w-10 sm:h-10 ${
            pathname === "/markets" ? "[filter:brightness(0)]" : "[filter:brightness(0)_saturate(100%)_invert(45%)_sepia(0%)_saturate(0%)_hue-rotate(0deg)_brightness(95%)_contrast(92%)]"
          }`}
        />
      </button>
      <button
        onClick={() => router.push("/history")}
        className={`p-3 sm:p-4 rounded-full transition ${
          pathname === "/history" ? "bg-yellow-400" : "hover:bg-gray-100"
        }`}
      >
        <Image
          src="/icons/transaction-history.svg"
          alt="History"
          width={40}
          height={40}
          className={`w-8 h-8 sm:w-10 sm:h-10 ${
            pathname === "/history" ? "[filter:brightness(0)]" : "[filter:brightness(0)_saturate(100%)_invert(45%)_sepia(0%)_saturate(0%)_hue-rotate(0deg)_brightness(95%)_contrast(92%)]"
          }`}
        />
      </button>
      <button
        onClick={() => router.push("/ai")}
        className={`p-3 sm:p-4 rounded-full transition ${
          pathname === "/ai" ? "bg-yellow-400" : "hover:bg-gray-100"
        }`}
      >
        <Image
          src="/icons/brain-02.svg"
          alt="AI"
          width={40}
          height={40}
          className={`w-8 h-8 sm:w-10 sm:h-10 ${
            pathname === "/ai" ? "[filter:brightness(0)]" : "[filter:brightness(0)_saturate(100%)_invert(45%)_sepia(0%)_saturate(0%)_hue-rotate(0deg)_brightness(95%)_contrast(92%)]"
          }`}
        />
      </button>
    </div>
  )
}
