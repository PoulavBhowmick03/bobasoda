"use client"

import BottomNav from "@/components/bottom-nav";
import { useViewportHeight } from "@/hooks/useViewportHeight";

export default function AI() {
  const viewportHeight = useViewportHeight()

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
          <div className="h-full w-full flex flex-col items-center justify-center p-8">
            <h1 className="text-4xl sm:text-5xl font-bold text-yellow-400 mb-4">
              AI Assistant
            </h1>
            <p className="text-yellow-400 opacity-75 text-lg text-center">
              Coming soon...
            </p>
          </div>
          <BottomNav />
        </div>
      </div>
    </main>
  );
}
