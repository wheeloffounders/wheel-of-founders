'use client'

import { useEffect, useState } from 'react'
import { fetchJson } from '@/lib/api/fetch-json'
import type { JourneyWeekRecord } from '@/lib/founder-dna/journey-week-records'

type JourneyWeeksResponse = {
  weeks: JourneyWeekRecord[]
  daysWithEntries: number
}

export function useJourneyWeeks() {
  const [weeks, setWeeks] = useState<JourneyWeekRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const json = await fetchJson<JourneyWeeksResponse>('/api/founder-dna/journey/weeks')
        if (!cancelled) setWeeks(json.weeks ?? [])
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load journey history')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  return { weeks, loading, error }
}
