'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useComprehensiveTour } from '@/lib/contexts/ComprehensiveTourContext'
import { isNewOnboardingEnabled, isTourEnabled } from '@/lib/feature-flags'

const SESSION_DISMISS_KEY = 'wof_tour_popup_dismissed_session'

export interface UseTourResult {
  showPopUp: boolean
  loading: boolean
  startTour: () => void
  dismissForSession: () => void
}

/**
 * Manages first-time tour pop-up state.
 * - has_seen_tour: never show again
 * - tour_dismissed_at: optional analytics
 * - sessionStorage: "Maybe later" dismisses for this session only
 */
export function useTour(): UseTourResult {
  const ctx = useComprehensiveTour()
  const startTourFromContext = ctx?.startTour ?? (() => {
    console.warn('🔍 [useTour] ctx or startTour is null — may be outside ComprehensiveTourProvider')
  })
  const [hasSeenTour, setHasSeenTour] = useState<boolean | null>(null)
  const [daysSinceJoin, setDaysSinceJoin] = useState<number | null>(null)
  const [dismissedThisSession, setDismissedThisSession] = useState(false)
  const [startedTour, setStartedTour] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setDismissedThisSession(sessionStorage.getItem(SESSION_DISMISS_KEY) === 'true')
    }
  }, [])

  useEffect(() => {
    const fetch = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }
      const { data } = await (supabase.from('user_profiles') as any)
        .select('has_seen_tour, created_at')
        .eq('id', user.id)
        .maybeSingle()
      setHasSeenTour((data?.has_seen_tour as boolean) ?? false)
      // Only show tour popup for users with < 3 days since signup
      const createdAt = data?.created_at ? new Date(data.created_at as string) : null
      const daysSinceJoin = createdAt ? Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)) : 0
      setDaysSinceJoin(daysSinceJoin)
      setLoading(false)
    }
    fetch()
  }, [])

  const startTour = useCallback(() => {
    console.log('🔍 [useTour] startTour called, invoking startTourFromContext')
    setStartedTour(true)
    startTourFromContext()
  }, [startTourFromContext])

  const dismissForSession = useCallback(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(SESSION_DISMISS_KEY, 'true')
      setDismissedThisSession(true)
    }
    // Optionally: POST to update tour_dismissed_at for analytics
    fetch('/api/user/tour-dismiss', { method: 'POST', credentials: 'include' }).catch(() => {})
  }, [])

  const showPopUp =
    isNewOnboardingEnabled() &&
    isTourEnabled() &&
    hasSeenTour === false &&
    !dismissedThisSession &&
    !startedTour &&
    !loading

  return { showPopUp, loading, startTour, dismissForSession }
}
