'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getUserSession } from '@/lib/auth'

const SESSION_STORAGE_KEY = 'energy_trends_shown'
const CHECK_INTERVAL_MS = 5_000
const MAX_ATTEMPTS = 24 // ~2 minutes

export function useEnergyTrendsCheck() {
  const [showCelebration, setShowCelebration] = useState(false)

  const setShowCelebrationPersist = useCallback(
    (next: boolean) => {
      setShowCelebration(next)
      if (!next) return
      if (typeof window === 'undefined') return
      try {
        sessionStorage.setItem(SESSION_STORAGE_KEY, 'true')
      } catch {
        // non-critical
      }
    },
    [setShowCelebration]
  )

  useEffect(() => {
    let isMounted = true
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    let attempts = 0

    const checkOnce = async () => {
      attempts += 1
      if (!isMounted) return
      if (typeof window === 'undefined') return

      if (sessionStorage.getItem(SESSION_STORAGE_KEY) === 'true') return

      try {
        const session = await getUserSession()
        if (!session) return

        const { data, error } = await supabase
          .from('user_profiles')
          .select('unlocked_features')
          .eq('id', session.user.id)
          .maybeSingle()

        if (error) throw error

        const raw = (data?.unlocked_features ?? []) as unknown
        const features = Array.isArray(raw) ? (raw as any[]) : []
        const hasEnergyTrends = features.some((f) => f?.name === 'energy_trends')

        if (hasEnergyTrends) {
          setShowCelebrationPersist(true)
          return
        }
      } catch (err) {
        console.error('[useEnergyTrendsCheck] Error:', err)
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

