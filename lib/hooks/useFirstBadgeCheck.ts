'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getUserSession } from '@/lib/auth'
import { fetchUserProfileBundle } from '@/lib/user-profile-bundle-cache'
import type { Badge } from '@/types/badges'

const SESSION_STORAGE_KEY = 'first_spark_shown'
// The trigger runs in the DB after a task completion update; allow enough time
// for it to propagate back to the client before giving up.
const CHECK_INTERVAL_MS = 5_000
const MAX_ATTEMPTS = 24 // ~2 minutes

export function useFirstBadgeCheck() {
  const [showCelebration, setShowCelebration] = useState(false)

  const setShowCelebrationPersist = useCallback(
    (next: boolean) => {
      setShowCelebration(next)
      if (!next) return
      if (typeof window === 'undefined') return
      try {
        sessionStorage.setItem(SESSION_STORAGE_KEY, 'true')
      } catch {
        // Ignore - non-critical
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

      // One celebration per session.
      if (sessionStorage.getItem(SESSION_STORAGE_KEY) === 'true') return

      try {
        const session = await getUserSession()
        if (!session) return

        let badges: Badge[] = []
        if (attempts === 1) {
          const bundle = await fetchUserProfileBundle()
          const rawBadges = bundle?.badges ?? []
          badges = Array.isArray(rawBadges) ? (rawBadges as Badge[]).filter(Boolean) : []
        } else {
          const { data, error } = await supabase
            .from('user_profiles')
            .select('badges')
            .eq('id', session.user.id)
            .maybeSingle()
          if (error) throw error
          const rawBadges = (data?.badges ?? []) as unknown
          badges = Array.isArray(rawBadges) ? (rawBadges as Badge[]).filter(Boolean) : []
        }

        const hasFirstSpark = badges.some((b) => b?.name === 'first_spark')
        if (hasFirstSpark) {
          setShowCelebrationPersist(true)
          return
        }
      } catch (err) {
        console.error('[useFirstBadgeCheck] Error:', err)
      }

      // Keep checking briefly so the modal can appear right after the trigger fires.
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

