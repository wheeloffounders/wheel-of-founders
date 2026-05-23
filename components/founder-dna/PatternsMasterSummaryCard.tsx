'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { PatternsBlueprintCard } from '@/components/founder-dna/PatternsBlueprintCard'
import type { EnergyTrendsResponse } from '@/lib/types/founder-dna'

const FALLBACK_SUMMARY =
  'Your reflections are building a picture of how you work, decide, and recover. As more evenings land here, Mrs. Deer will surface the macro cycles — what lifts your leverage and what quietly drains it.'

/** Full-width macro-trends anchor — synthesizes energy/mood insights when available. */
export function PatternsMasterSummaryCard() {
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState(FALLBACK_SUMMARY)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/founder-dna/trends', { credentials: 'include' })
        if (!res.ok) {
          if (!cancelled) setSummary(FALLBACK_SUMMARY)
          return
        }
        const json = (await res.json()) as EnergyTrendsResponse
        const insights = Array.isArray(json.insights) ? json.insights : []
        if (!cancelled) {
          if (insights.length > 0) {
            const lead = insights[0]!.description.trim()
            const rest = insights
              .slice(1, 3)
              .map((i) => i.description.trim())
              .filter(Boolean)
            setSummary(rest.length > 0 ? [lead, ...rest].join(' ') : lead)
          } else {
            setSummary(FALLBACK_SUMMARY)
          }
        }
      } catch {
        if (!cancelled) setSummary(FALLBACK_SUMMARY)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const body = useMemo(() => summary, [summary])

  return (
    <PatternsBlueprintCard
      as="section"
      headerTag={{ label: 'Macro trends', tone: 'slate' }}
      title="Your patterns at a glance"
      titleId="patterns-macro-summary"
      aria-labelledby="patterns-macro-summary"
    >
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Loader2 className="h-4 w-4 animate-spin text-[#ef725c]" aria-hidden />
          Reading your cycles…
        </div>
      ) : (
        <p className="text-sm leading-relaxed text-slate-700 dark:text-gray-200">{body}</p>
      )}
    </PatternsBlueprintCard>
  )
}
