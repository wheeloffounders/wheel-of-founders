'use client'

import { createContext, useContext, useState, useCallback } from 'react'

interface ComprehensiveTourContextType {
  runTour: boolean
  startTour: () => void
  dismissTour: () => void
}

const ComprehensiveTourContext = createContext<ComprehensiveTourContextType | null>(null)

export function ComprehensiveTourProvider({ children }: { children: React.ReactNode }) {
  const [runTour, setRunTour] = useState(false)

  const startTour = useCallback(() => setRunTour(true), [])
  const dismissTour = useCallback(() => setRunTour(false), [])

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
