'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getUserSession } from '@/lib/auth'

const SESSION_STORAGE_KEY = 'decision_style_shown'
const CHECK_INTERVAL_MS = 5_000
const MAX_ATTEMPTS = 24 // ~2 minutes

export function useDecisionStyleCheck() {
  const [showCelebration, setShowCelebration] = useState(false)
  const initialUnlockedRef = useRef<boolean | null>(null)

  const setShowCelebrationPersist = useCallback((next: boolean) => {
    setShowCelebration(next)
    if (!next) return
    if (typeof window === 'undefined') return
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, 'true')
    } catch {
      // non-critical
    }
  }, [])

  useEffect(() => {
    let isMounted = true
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    let attempts = 0

    const checkOnce = async () => {
      attempts += 1
      if (!isMounted) return
      if (typeof window === 'undefined') return

      // Don't show again in this tab/session.
      if (sessionStorage.getItem(SESSION_STORAGE_KEY) === 'true') return

      const session = await getUserSession()
      if (!session) return

      const { data, error } = await supabase
        .from('user_profiles')
        .select('unlocked_features')
        .eq('id', session.user.id)
        .maybeSingle()

      if (error) {
        console.error('[useDecisionStyleCheck] Error:', error)
      }

      const raw = (data?.unlocked_features ?? []) as unknown
      const features = Array.isArray(raw) ? (raw as any[]) : []
      const hasDecisionStyle = features.some((f) => f?.name === 'decision_style')

      // First check establishes the "previous" unlocked state.
      if (initialUnlockedRef.current === null) {
        initialUnlockedRef.current = hasDecisionStyle
        // If already unlocked on page load, we won't pop the "just unlocked" celebration.
        if (hasDecisionStyle) return
      }

      // Show only if it transitioned from locked -> unlocked.
      if (initialUnlockedRef.current === false && hasDecisionStyle) {
        setShowCelebrationPersist(true)
        return
      }

      if (attempts < MAX_ATTEMPTS) {
        timeoutId = setTimeout(checkOnce, CHECK_INTERVAL_MS)
      }
    }

    if (typeof window !== 'undefined' && sessionStorage.getItem(SESSION_STORAGE_KEY) !== 'true') {
      checkOnce()
    }

    return () => {
      isMounted = false
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [setShowCelebrationPersist])

  return { showCelebration, setShowCelebration: setShowCelebrationPersist }
}

