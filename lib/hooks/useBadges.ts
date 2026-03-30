'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getUserSession } from '@/lib/auth'
import type { Badge } from '@/types/badges'

export function useBadges() {
  const [badges, setBadges] = useState<Badge[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    let intervalId: ReturnType<typeof setInterval> | null = null

    const fetchBadges = async () => {
      try {
        const session = await getUserSession()
        if (!session) {
          if (!isMounted) return
          setBadges([])
          setLoading(false)
          return
        }

        const { data, error } = await supabase
          .from('user_profiles')
          .select('badges')
          .eq('id', session.user.id)
          .maybeSingle()

        if (error) throw error

        const rawBadges = (data?.badges ?? []) as unknown
        const parsed = Array.isArray(rawBadges)
          ? (rawBadges as Badge[]).filter(Boolean)
          : ([] as Badge[])

        if (!isMounted) return
        setBadges(parsed)
      } catch (err) {
        console.error('[useBadges] Error:', err)
        if (!isMounted) return
        setBadges([])
      } finally {
        if (!isMounted) return
        setLoading(false)
      }
    }

    fetchBadges()
    intervalId = setInterval(fetchBadges, 30_000)

    return () => {
      isMounted = false
      if (intervalId) clearInterval(intervalId)
    }
  }, [])

  return { badges, loading }
}

