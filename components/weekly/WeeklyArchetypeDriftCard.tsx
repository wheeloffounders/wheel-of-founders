'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArchetypeEditorialCard } from '@/components/founder-dna/ArchetypeEditorialCard'
import { rhythmLeftAccentClassName } from '@/lib/founder-dna/archetype-report-card-styles'
import type { ArchetypeApiFullResponse, ArchetypeApiPreviewResponse } from '@/lib/types/founder-dna'
import { InsightPeriodTeaserLock } from '@/components/insights/InsightPeriodTeaserLock'
import {
  buildWeeklyArchetypeDriftSummary,
  computeWeeklyBlueprintMatch,
  type WeeklyArchetypeDriftMetrics,
} from '@/lib/weekly/compute-weekly-archetype-drift'

type WeeklyArchetypeDriftCardProps = WeeklyArchetypeDriftMetrics & {
  /** Freemium: show match % but lock the narrative paragraph. */
  narrativeLocked?: boolean
  narrativeTeaserMessage?: string
  onUpgradeClick?: () => void
}

export function WeeklyArchetypeDriftCard({
  narrativeLocked = false,
  narrativeTeaserMessage,
  onUpgradeClick,
  ...metrics
}: WeeklyArchetypeDriftCardProps) {
  const [primaryName, setPrimaryName] = useState<string | null>(null)
  const [primaryLabel, setPrimaryLabel] = useState<string | null>(null)
  const [archetypeLoading, setArchetypeLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setArchetypeLoading(true)
      try {
        const res = await fetch('/api/founder-dna/archetype', { credentials: 'include' })
        if (!res.ok) {
          if (!cancelled) {
            setPrimaryName(null)
            setPrimaryLabel(null)
          }
          return
        }
        const json = (await res.json()) as ArchetypeApiFullResponse | ArchetypeApiPreviewResponse
        if (!cancelled) {
          setPrimaryName(json?.primary?.name ?? null)
          setPrimaryLabel(json?.primary?.label ?? null)
        }
      } catch {
        if (!cancelled) {
          setPrimaryName(null)
          setPrimaryLabel(null)
        }
      } finally {
        if (!cancelled) setArchetypeLoading(false)
      }
    }

    void load()
  }, [])

  const archetype = useMemo(
    () => ({ primaryName, primaryLabel }),
    [primaryName, primaryLabel],
  )

  const matchPct = useMemo(() => computeWeeklyBlueprintMatch(metrics, archetype), [metrics, archetype])

  const summary = useMemo(
    () => buildWeeklyArchetypeDriftSummary(metrics, matchPct, archetype),
    [metrics, matchPct, archetype],
  )

  return (
    <ArchetypeEditorialCard
      leftAccentClassName={rhythmLeftAccentClassName}
      data-testid="weekly-archetype-drift-card"
      data-weekly-drift-card="blueprint-framed"
      aria-labelledby="weekly-archetype-drift-heading"
    >
      <div className="relative z-10 min-w-0">
        <p
          id="weekly-archetype-drift-heading"
          className="text-xs font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500"
        >
          Rhythm Alignment // Archetype Match
        </p>
        {archetypeLoading ? (
          <div className="mt-3 space-y-2 animate-pulse" aria-hidden>
            <div className="h-7 w-40 rounded bg-slate-200/80 dark:bg-slate-700/80" />
            <div className="h-4 w-full rounded bg-slate-100 dark:bg-slate-800" />
            <div className="h-4 w-11/12 rounded bg-slate-100 dark:bg-slate-800" />
          </div>
        ) : (
          <>
            <p className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
              {matchPct}% Blueprint Match
            </p>
            {narrativeLocked && narrativeTeaserMessage ? (
              <div className="mt-3">
                <InsightPeriodTeaserLock
                  message={narrativeTeaserMessage}
                  markdown
                  ctaHeadingId="rhythm-archetype-alignment-pro-cta"
                  ctaDescription="Pro unlocks how this week’s execution tracked your archetype — with specific days and next-week anchors."
                  onUpgradeClick={onUpgradeClick}
                />
              </div>
            ) : (
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-gray-300">{summary}</p>
            )}
          </>
        )}
      </div>
    </ArchetypeEditorialCard>
  )
}
