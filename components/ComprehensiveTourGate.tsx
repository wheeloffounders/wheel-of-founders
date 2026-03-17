'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useComprehensiveTour } from '@/lib/contexts/ComprehensiveTourContext'
import { ComprehensiveTour } from './ComprehensiveTour'
import { isTourEnabled } from '@/lib/feature-flags'

/**
 * Parent-controlled rendering: only mount ComprehensiveTour when runTour is true.
 * When dismissTour() is called, runTour becomes false and we stop rendering,
 * which fully unmounts the tour from the React tree.
 */
export function ComprehensiveTourGate() {
  const pathname = usePathname()
  const ctx = useComprehensiveTour()
  const runTour = ctx?.runTour ?? false
  const startTour = ctx?.startTour
  const tourEnabled = isTourEnabled()
  const shouldRender = runTour && pathname === '/dashboard' && tourEnabled

  console.log('🔍 [Gate] Rendering with runTour:', runTour)
  console.log('🔍 [Gate] Should render:', runTour && pathname === '/dashboard')

  // URL param override: ?force-tour triggers tour
  useEffect(() => {
    if (typeof window === 'undefined' || !startTour) return
    const params = new URLSearchParams(window.location.search)
    if (params.has('force-tour')) {
      console.log('🔴 [DEBUG] Force tour from URL')
      startTour()
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [startTour])

  if (!runTour) return null
  return <ComprehensiveTour />
}
