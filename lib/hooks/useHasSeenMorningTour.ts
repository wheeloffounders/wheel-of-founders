'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { getUserSession } from '@/lib/auth'
import { fetchUserProfileBundle, invalidateUserProfileBundle } from '@/lib/user-profile-bundle-cache'

export function useHasSeenMorningTour() {
  const [hasSeen, setHasSeen] = useState<boolean | null>(null)

  useEffect(() => {
    const fetchFlag = async () => {
      try {
        const session = await getUserSession()
        if (!session) {
          setHasSeen(true)
          return
        }
        const { data } = await supabase
          .from('user_profiles')
          .select('has_seen_morning_tour')
          .eq('id', session.user.id)
          .maybeSingle()
        setHasSeen(!!(data as { has_seen_morning_tour?: boolean } | null)?.has_seen_morning_tour)
      } catch {
        setHasSeen(true)
      }
    }
    fetchFlag()
  }, [])

  const markSeen = useCallback(async () => {
    try {
      const session = await getUserSession()
      if (!session) return
      await supabase
        .from('user_profiles')
        .update({ has_seen_morning_tour: true, updated_at: new Date().toISOString() })
        .eq('id', session.user.id)
      invalidateUserProfileBundle()
      setHasSeen(true)
    } catch {
      // Ignore
    }
  }, [])

  return { hasSeenMorningTour: hasSeen ?? true, markSeenMorningTour: markSeen }
}
