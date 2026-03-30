'use client'

import { useState, useEffect } from 'react'
import { getUserSession } from '@/lib/auth'
import {
  getWeeklyInsightProgress,
  getMonthlyProgress,
  getQuarterlyProgress,
  getNextUnlock,
  type ProgressData,
  type NextUnlockResult,
} from '@/lib/progress'

export function useProgress() {
  const [weekly, setWeekly] = useState<ProgressData | null>(null)
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
        const [w, m, q, n] = await Promise.all([
          getWeeklyInsightProgress(session.user.id),
          getMonthlyProgress(session.user.id),
          getQuarterlyProgress(session.user.id),
          getNextUnlock(session.user.id),
        ])
        setWeekly(w)
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

  return { weekly, monthly, quarterly, nextUnlock, loading }
}
