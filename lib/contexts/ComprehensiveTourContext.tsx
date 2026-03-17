'use client'

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'

interface ComprehensiveTourContextType {
  runTour: boolean
  startTour: () => void
  dismissTour: () => void
}

const ComprehensiveTourContext = createContext<ComprehensiveTourContextType | null>(null)

/** Remove leftover Joyride portal elements from the DOM (Joyride bug: portal can persist after unmount) */
function cleanupJoyrideDOM() {
  if (typeof document === 'undefined') return
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 [Tour] cleanupJoyrideDOM running')
  }
  const selectors = [
    '#react-joyride-portal',
    '[id^="react-joyride"]',
    '.react-joyride__tooltip',
    '.react-joyride__overlay',
    '.react-joyride__spotlight',
    '.react-joyride__beacon',
  ]
  selectors.forEach((sel) => {
    document.querySelectorAll(sel).forEach((el) => el.remove())
  })
}

export function ComprehensiveTourProvider({ children }: { children: ReactNode }) {
  const [runTour, setRunTour] = useState(false)

  // Debug: log when runTour changes
  useEffect(() => {
    console.log('🔍 [CTX] runTour state changed to:', runTour)
  }, [runTour])

  const startTour = useCallback(() => {
    console.log('🔍 [CTX] startTour CALLED')
    console.log('🔍 [CTX] runTour before:', runTour)
    setRunTour(true)
    console.log('🔍 [CTX] setRunTour(true) invoked')
  }, [runTour])
  const dismissTour = useCallback(() => {
    console.log('🔍 [CTX] dismissTour CALLED')
    console.log('🔍 [CTX] runTour before:', runTour)
    setRunTour(false)
    setTimeout(() => {
      console.log('🔍 [CTX] Running DOM cleanup')
      cleanupJoyrideDOM()
    }, 300)
  }, [runTour])

  return (
    <ComprehensiveTourContext.Provider value={{ runTour, startTour, dismissTour }}>
      {children}
    </ComprehensiveTourContext.Provider>
  )
}

export function useComprehensiveTour() {
  const ctx = useContext(ComprehensiveTourContext)
  return ctx
}
