'use client'

import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import type { FounderDnaScheduleRow } from '@/lib/types/founder-dna'
import type { FounderJourneyQueryState } from '@/lib/hooks/useFounderJourney'

function formatNextUpdate(iso: string | null) {
  if (!iso) return null
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return null
  }
}

function progressLabel(p: NonNullable<FounderDnaScheduleRow['progress']>) {
  const u =
    p.unit === 'evenings'
      ? 'evenings'
      : p.unit === 'decisions'
        ? 'decisions'
        : p.unit === 'profile'
          ? 'profile'
          : 'days with entries'
  return `${p.current}/${p.target} ${u}`
}

/** Prefer `milestones.daysWithEntries` so progress matches activity, not calendar days. */
function effectiveProgress(
  row: FounderDnaScheduleRow,
  milestones: { daysWithEntries?: number; daysActive: number } | undefined
): FounderDnaScheduleRow['progress'] | undefined {
  const p = row.progress
  if (!p || !milestones) return p
  if (p.unit === 'days_with_entries') {
    const activityDays = milestones.daysWithEntries ?? milestones.daysActive
    return { ...p, current: Math.min(activityDays, p.target) }
  }
  return p
}

/** Destination when the row is unlocked (feature hub / insight pages). */
const UNLOCKED_FEATURE_HREF: Record<string, string | null> = {
  first_spark: null,
  first_glimpse: null,
  founder_story: '/profile',
  morning_insights: '/morning',
  your_story_so_far: '/founder-dna/rhythm',
  weekly_insight: '/weekly',
  celebration_gap: '/founder-dna/rhythm',
  unseen_wins: '/founder-dna/rhythm',
  energy_trends: '/founder-dna/trends',
  decision_style: '/founder-dna/decisions',
  monthly_insight: '/monthly-insight',
  postponement_patterns: '/founder-dna/postponements',
  recurring_question: '/founder-dna/recurring-question',
  founder_archetype: '/founder-dna/archetype',
  founder_archetype_full: '/founder-dna/archetype',
  quarterly_insight: '/quarterly',
}

/** When locked, these rows link to a concrete next step; others stay passive (requirement copy only). */
const LOCKED_ACTIONABLE: Record<string, { label: string; href: string }> = {
  first_glimpse: { label: 'Complete your first evening reflection', href: '/evening' },
  founder_story: { label: 'Complete your founder profile', href: '/profile' },
  morning_insights: { label: 'Start your morning', href: '/morning' },
}

export type ScheduleRowCTA =
  | { type: 'none' }
  | { type: 'open'; href: string; label: string }
  | { type: 'action'; href: string; label: string }

/** CTA for one schedule row: open link when unlocked, action link when locked+actionable, none otherwise. */
export function getFeatureCTA(row: FounderDnaScheduleRow, schedule: FounderDnaScheduleRow[]): ScheduleRowCTA {
  if (row.id === 'first_spark') {
    return { type: 'none' }
  }

  const fullArchetypeUnlocked = schedule.some((r) => r.id === 'founder_archetype_full' && r.unlocked)

  if (row.unlocked) {
    if (row.id === 'founder_archetype' && fullArchetypeUnlocked) {
      return { type: 'none' }
    }
    const href = Object.prototype.hasOwnProperty.call(UNLOCKED_FEATURE_HREF, row.id)
      ? UNLOCKED_FEATURE_HREF[row.id]
      : row.href
    if (!href) return { type: 'none' }
    const label =
      row.id === 'founder_archetype' || row.id === 'founder_archetype_full'
        ? 'Open Founder Archetype'
        : `Open ${row.name}`
    return { type: 'open', href, label }
  }

  const action = LOCKED_ACTIONABLE[row.id]
  if (action) {
    return { type: 'action', href: action.href, label: action.label }
  }

  return { type: 'none' }
}

export type FounderDnaScheduleTimelineProps = {
  journey: FounderJourneyQueryState
}

const linkClass =
  'inline-block mt-3 text-sm font-medium text-[#ef725c] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ef725c] focus-visible:ring-offset-2 rounded-sm dark:focus-visible:ring-offset-gray-900'

export function FounderDnaScheduleTimeline({ journey }: FounderDnaScheduleTimelineProps) {
  const { data, loading, error } = journey
  const schedule = data?.schedule ?? []
  const milestones = data?.milestones

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-[#ef725c]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50/30 dark:bg-red-900/20 p-4 text-sm text-red-800 dark:text-red-200">
        {error}
      </div>
    )
  }

  if (schedule.length === 0) {
    return (
      <p className="text-sm text-gray-600 dark:text-gray-300">
        Schedule isn’t available yet. Open your dashboard once, then refresh.
      </p>
    )
  }

  return (
    <div className="relative">
      <div className="absolute left-[21px] top-2 bottom-2 w-0.5 bg-gray-200 dark:bg-gray-700" aria-hidden />
      <ul className="space-y-0">
        {schedule.map((row) => {
          const nextStr = formatNextUpdate(row.nextUpdateAt)
          const cta = getFeatureCTA(row, schedule)
          const progress = effectiveProgress(row, milestones)
          return (
            <li key={row.id} className="relative flex gap-4 pb-8 last:pb-0">
              <div
                className={`relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 text-lg ${
                  row.unlocked
                    ? 'border-[#ef725c] bg-white dark:bg-gray-800 shadow-sm'
                    : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900'
                }`}
                aria-hidden
              >
                {row.icon}
              </div>
              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white">{row.name}</h2>
                  <span className="text-sm" aria-hidden>
                    {row.unlocked ? '🔓' : '🔒'}
                  </span>
                  <span
                    className={`text-xs font-medium uppercase tracking-wide ${
                      row.unlocked ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {row.unlocked ? 'Unlocked' : 'Locked'}
                  </span>
                </div>
                {row.detail ? (
                  <p className="text-xs text-amber-800/90 dark:text-amber-200/80 mt-0.5">{row.detail}</p>
                ) : null}
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  <span className="font-medium text-gray-800 dark:text-gray-200">Unlock:</span> {row.unlockSummary}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">
                  <span className="font-medium text-gray-800 dark:text-gray-200">Updates:</span> {row.updateCadence}
                </p>
                {row.unlocked && nextStr ? (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Next update (your timezone):{' '}
                    <span className="font-medium text-gray-700 dark:text-gray-300">{nextStr}</span>
                  </p>
                ) : null}
                {!row.unlocked && progress ? (
                  <>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Progress: {progressLabel(progress)}</p>
                    <div className="mt-1.5 max-w-md">
                      <div className="h-1.5 w-full rounded-full bg-gray-200/90 dark:bg-gray-700 overflow-hidden ring-1 ring-[#ef725c]/15">
                        <div
                          className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-[#f0886c] to-[#ef725c] shadow-[0_0_14px_rgba(239,114,92,0.58)]"
                          style={{
                            width: `${Math.min(100, (progress.current / progress.target) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </>
                ) : null}
                {cta.type === 'open' ? (
                  <Link href={cta.href} className={linkClass}>
                    {cta.label} →
                  </Link>
                ) : cta.type === 'action' ? (
                  <Link href={cta.href} className={linkClass}>
                    {cta.label} →
                  </Link>
                ) : null}
              </div>
            </li>
          )
        })}
      </ul>
      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-6 leading-relaxed">
        Unlock days and refresh windows use the timezone saved in your profile (Settings → Timezone). This page is a map,
        not a deadline.
      </p>
    </div>
  )
}
