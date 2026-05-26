'use client'

import { useEffect, useState } from 'react'
import { fetchJson } from '@/lib/api/fetch-json'
import type { InsightChapterRecord } from '@/lib/insights/insight-chapter-records'

type QuarterlyInsightChaptersResponse = {
  chapters: InsightChapterRecord[]
}

export function useQuarterlyInsightChapters() {
  const [chapters, setChapters] = useState<InsightChapterRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const json = await fetchJson<QuarterlyInsightChaptersResponse>('/api/quarterly-insight/chapters')
        if (!cancelled) setChapters(json.chapters ?? [])
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load quarterly chapters')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  return { chapters, loading, error }
}

