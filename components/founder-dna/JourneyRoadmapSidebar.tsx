'use client'

import { useMemo } from 'react'
import { Loader2, Shield } from 'lucide-react'
import { JourneyBlueprintCard } from '@/components/founder-dna/JourneyBlueprintCard'
import type { JourneyWeekRecord } from '@/lib/founder-dna/journey-week-records'
import type { FounderJourneyQueryState } from '@/lib/hooks/useFounderJourney'
import { journeyWeekNumberFromDaysWithEntries } from '@/lib/email/weekly-journey-messages'
import { cn } from '@/components/ui/utils'

type JourneyRoadmapSidebarProps = {
  journey: FounderJourneyQueryState
  weeks: JourneyWeekRecord[]
  weeksLoading: boolean
  selectedWeekStart: string | null
  onSelectWeek: (weekStart: string) => void
  resilienceDays: number | null
}

export function JourneyRoadmapSidebar({
  journey,
  weeks,
  weeksLoading,
  selectedWeekStart,
  onSelectWeek,
  resilienceDays,
}: JourneyRoadmapSidebarProps) {
  const { data, loading } = journey
  const m = data?.milestones

  const journeyWeek = useMemo(() => {
    const dwe = m?.daysWithEntries ?? m?.daysActive ?? 0
    return journeyWeekNumberFromDaysWithEntries(dwe)
  }, [m?.daysActive, m?.daysWithEntries])

  const unlockedCount = useMemo(
    () => (data?.schedule ?? []).filter((r) => r.unlocked).length,
    [data?.schedule],
  )

  if (loading && !data) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-[#ef725c]" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <JourneyBlueprintCard as="section" aria-labelledby="journey-tracker-heading">
        <p
          id="journey-tracker-heading"
          className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500"
        >
          Master metric tracker
        </p>
        <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-gray-200">
          You&apos;re on <span className="font-semibold text-slate-900 dark:text-white">Week {journeyWeek}</span>{' '}
          of your founder rhythm — {m?.daysWithEntries ?? m?.daysActive ?? 0} days with entries,{' '}
          {m?.currentStreak ?? 0}-day streak.
        </p>
        {resilienceDays !== null ? (
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-200/90 bg-emerald-50/90 px-2.5 py-1 text-[11px] font-semibold text-emerald-900 dark:border-emerald-800/60 dark:bg-emerald-950/35 dark:text-emerald-200">
            <Shield className="h-3 w-3 shrink-0 opacity-90" aria-hidden />
            Resilience: {resilienceDays} days
          </p>
        ) : null}
        <dl className="mt-4 grid grid-cols-2 gap-2 text-center">
          <div className="rounded-lg border border-slate-200/60 bg-white/40 px-2 py-2 dark:border-slate-600/40 dark:bg-gray-900/20">
            <dt className="text-[10px] uppercase tracking-wide text-slate-500">Unlocks</dt>
            <dd className="text-lg font-semibold tabular-nums text-slate-900 dark:text-white">{unlockedCount}</dd>
          </div>
          <div className="rounded-lg border border-slate-200/60 bg-white/40 px-2 py-2 dark:border-slate-600/40 dark:bg-gray-900/20">
            <dt className="text-[10px] uppercase tracking-wide text-slate-500">Weeks logged</dt>
            <dd className="text-lg font-semibold tabular-nums text-slate-900 dark:text-white">{weeks.length}</dd>
          </div>
        </dl>
      </JourneyBlueprintCard>

      <JourneyBlueprintCard as="nav" aria-labelledby="journey-milestones-nav">
        <p
          id="journey-milestones-nav"
          className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3"
        >
          Milestone map
        </p>
        {weeksLoading ? (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-[#ef725c]" />
            Loading weeks…
          </div>
        ) : weeks.length === 0 ? (
          <p className="text-xs leading-relaxed text-slate-600 dark:text-gray-300">
            Complete a few weekly reflections — your roadmap appears here as Mrs. Deer saves each chapter.
          </p>
        ) : (
          <ul className="max-h-[min(420px,50vh)] space-y-1 overflow-y-auto pr-1">
            {weeks.map((w) => {
              const active = selectedWeekStart === w.weekStart
              return (
                <li key={w.weekStart}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectWeek(w.weekStart)
                      document
                        .querySelector(`[data-week-start="${w.weekStart}"]`)
                        ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    }}
                    className={cn(
                      'w-full rounded-lg px-2.5 py-2 text-left text-xs transition-colors',
                      active
                        ? 'bg-indigo-50 text-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-100'
                        : 'text-slate-700 hover:bg-slate-100/80 dark:text-gray-200 dark:hover:bg-gray-800/50',
                    )}
                  >
                    <span className="font-mono font-medium">Week {w.weekNumber}</span>
                    <span className="mt-0.5 block truncate text-[11px] opacity-80">{w.themeTitle}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </JourneyBlueprintCard>
    </div>
  )
}
