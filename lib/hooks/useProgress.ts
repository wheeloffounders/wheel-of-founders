'use client'

import { useState, useEffect } from 'react'
import { getUserSession } from '@/lib/auth'
import {
  getMonthlyProgress,
  getQuarterlyProgress,
  getNextUnlock,
  type ProgressData,
  type NextUnlockResult,
} from '@/lib/progress'

export function useProgress() {
  const [monthly, setMonthly] = useState<ProgressData | null>(null)
  const [quarterly, setQuarterly] = useState<ProgressData | null>(null)
  const [nextUnlock, setNextUnlock] = useState<NextUnlockResult | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const session = await getUserSession()
      if (!session) {
        setLoading(false)
        return
      }
      try {
        const [m, q, n] = await Promise.all([
          getMonthlyProgress(session.user.id),
          getQuarterlyProgress(session.user.id),
          getNextUnlock(session.user.id),
        ])
        setMonthly(m)
        setQuarterly(q)
        setNextUnlock(n)
      } catch (err) {
        console.error('[useProgress] Error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return { monthly, quarterly, nextUnlock, loading }
}
