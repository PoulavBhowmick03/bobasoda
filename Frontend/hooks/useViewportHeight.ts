"use client"

import { useEffect, useState } from 'react'

export function useViewportHeight() {
  const [viewportHeight, setViewportHeight] = useState<number | null>(null)

  useEffect(() => {
    // Function to update viewport height
    const updateHeight = () => {
      if (typeof window !== 'undefined') {
        // Use visualViewport if available (better for mobile)
        if (window.visualViewport) {
          setViewportHeight(window.visualViewport.height)
        } else {
          // Fallback to window.innerHeight
          setViewportHeight(window.innerHeight)
        }
      }
    }

    // Set initial height
    updateHeight()

    // Listen to resize and scroll events
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateHeight)
      window.visualViewport.addEventListener('scroll', updateHeight)
    }

    window.addEventListener('resize', updateHeight)
    window.addEventListener('orientationchange', updateHeight)

    // Cleanup
    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', updateHeight)
        window.visualViewport.removeEventListener('scroll', updateHeight)
      }
      window.removeEventListener('resize', updateHeight)
      window.removeEventListener('orientationchange', updateHeight)
    }
  }, [])

  return viewportHeight
}
