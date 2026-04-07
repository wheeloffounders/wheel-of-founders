'use client'

import { useEffect, useMemo } from 'react'
import Link from 'next/link'
import { InfoTooltip } from '@/components/InfoTooltip'
import { useFounderJourney } from '@/lib/hooks/useFounderJourney'
import { useMediaQuery } from '@/lib/hooks/useMediaQuery'
import type { JourneyUnlock } from '@/lib/types/founder-dna'
import { getProgressStatus } from '@/lib/format-progress'
import { getEffectivePlanDate } from '@/lib/effective-plan-date'

type ComingUpNextProps = {
  items?: JourneyUnlock[]
}

/** Pending unlock rows shown in this card (from journey `nextUnlocks`, not total app features). */
const MOBILE_VISIBLE = 3

/** Unlocks where the row deep-links to the work that earns the unlock. */
const ACTIONABLE_COMING_UP_IDS = new Set(['first_glimpse', 'founder_story', 'morning_insights'])

function isActionableComingUpUnlock(id: string): boolean {
  return ACTIONABLE_COMING_UP_IDS.has(id)
}

function actionableHref(id: string, planDate: string): string {
  switch (id) {
    case 'first_glimpse':
      return `/evening?date=${planDate}#evening-form`
    case 'founder_story':
      return '/profile'
    case 'morning_insights':
      return '/morning'
    default:
      return '/dashboard'
  }
}

/**
 * Actionable instruction lines (journey `requirement` stays the source of truth on the API;
 * we layer explicit “how to unlock” copy for the highest-friction dashboard rows).
 */
const COMING_UP_INSTRUCTIONS: Record<string, { primary: string; actionLabel: string }> = {
  first_glimpse: {
    primary: 'Complete 1 evening review to unlock tonight.',
    actionLabel: 'Open Evening Reflection →',
  },
  founder_story: {
    primary: 'Fill in all profile sections to unlock.',
    actionLabel: 'Complete profile →',
  },
  morning_insights: {
    primary: 'Unlocks tomorrow morning after your review.',
    actionLabel: 'Open morning plan →',
  },
}

/** Coral timing (day fraction in timing column when no estimate). */
function unlockTimingPrimary(u: JourneyUnlock): string | null {
  const status = getProgressStatus(u.progress, u.target)
  if (status.status === 'ready') return `Day ${u.target} ready now`
  return status.label
}

function shouldShowProgressParens(u: JourneyUnlock): boolean {
  const status = getProgressStatus(u.progress, u.target)
  return status.status === 'in_progress' && u.target > 1
}

function dayProgressLabel(u: JourneyUnlock): string {
  return `Day ${u.progress} of ${u.target}`
}

/** Teaser backdrop for high-value locked unlocks (chart blur). */
const CURIOSITY_DETAIL_IDS = new Set(['first_glimpse', 'founder_story', 'morning_insights'])

/** Right-column label: time-to-unlock, or day progress when no estimate (e.g. Founder Story). */
function timingColumnLabel(u: JourneyUnlock): string {
  return unlockTimingPrimary(u) ?? dayProgressLabel(u)
}

export function ComingUpNext({ items }: ComingUpNextProps) {
  const { data, loading, error } = useFounderJourney()
  const isMobile = useMediaQuery('(max-width: 768px)')
  const planDate = useMemo(() => getEffectivePlanDate(), [])
  const list = items ?? data?.nextUnlocks ?? []
  const visibleUnlocks = isMobile ? list.slice(0, MOBILE_VISIBLE) : list

  const hasMoreOnMobile = isMobile && list.length > MOBILE_VISIBLE
  const moreOnMobileCount = list.length - MOBILE_VISIBLE

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return
    const pending = items ?? data?.nextUnlocks
    if (!pending?.length) return
    console.log('[ComingUpNext] nextUnlocks (pending) count:', pending.length, {
      ids: pending.map((u) => u.id),
    })
  }, [items, data?.nextUnlocks])

  return (
    <div className="border border-gray-200 dark:border-gray-700 border-l-4 border-l-[#ef725c] bg-white/60 dark:bg-gray-800/40 px-4 pb-4 pt-4 overflow-visible flex flex-col min-h-0">
      <div className="mb-2 flex shrink-0 items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Coming Up Next
          </h3>
          <InfoTooltip
            presentation="popover"
            position="bottom"
            text="Shows founder features you’re marching toward based on days with entries (days you saved a morning plan or completed an evening review). Visiting the Journey page shows the full roadmap and unlock criteria."
          />
        </div>
        {!loading && !error && list.length > 0 ? (
          <Link
            href="/founder-dna/schedule"
            className="shrink-0 text-xs font-medium text-[#ef725c] hover:underline whitespace-nowrap"
            title={`${list.length} upcoming unlock${list.length === 1 ? '' : 's'} (schedule)`}
          >
            View all {list.length} upcoming →
          </Link>
        ) : null}
      </div>
      {loading ? <p className="text-sm text-gray-500 mt-2">Loading...</p> : null}
      {error ? <p className="text-sm text-red-500 mt-2">{error}</p> : null}
      {!loading && !error ? (
        list.length === 0 ? (
          <p className="text-sm text-gray-500 mt-2">You are all caught up for now.</p>
        ) : (
          <div className="flex min-h-0 flex-col gap-0">
            <div
              className={`min-h-0 divide-y divide-gray-100 pr-1 dark:divide-gray-700/80 ${
                isMobile ? '' : 'max-h-[120px] overflow-y-auto'
              }`}
            >
              {visibleUnlocks.map((u) => {
                const dayProg = dayProgressLabel(u)
                const target = Math.max(u.target, 1)
                const progressPct = Math.max(0, Math.min(100, Math.round((u.progress / target) * 100)))
                const timingRight = timingColumnLabel(u)
                const showProgressParens = shouldShowProgressParens(u)
                const rawDetail = `${u.requirement}${showProgressParens ? ` (${dayProg})` : ''}`
                const instruction = COMING_UP_INSTRUCTIONS[u.id]
                const actionable = isActionableComingUpUnlock(u.id)
                const showTeaserBackdrop = CURIOSITY_DETAIL_IDS.has(u.id)

                return (
                  <div key={u.id} className="relative py-2 first:pt-0 space-y-0.5 overflow-hidden">
                    {showTeaserBackdrop ? (
                      <div
                        className="pointer-events-none absolute right-1 top-1/2 z-0 -translate-y-1/2 w-[5.5rem] h-14 overflow-hidden rounded-md backdrop-blur-[2px]"
                        aria-hidden
                      >
                        <div className="absolute inset-0 flex items-end justify-center gap-0.5 pb-0.5 blur-[4px] opacity-55 dark:opacity-45">
                          {[42, 68, 38, 88, 52].map((h, i) => (
                            <div
                              key={i}
                              className="w-1.5 rounded-t bg-gradient-to-t from-emerald-600 to-teal-300 dark:from-emerald-500 dark:to-cyan-400"
                              style={{ height: `${h}%` }}
                            />
                          ))}
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center text-2xl blur-[3px] opacity-50">
                          🦌
                        </div>
                      </div>
                    ) : null}
                    <div className="relative z-[1] flex w-full min-w-0 items-baseline justify-between gap-3">
                      <div className="flex min-w-0 flex-1 items-baseline gap-2">
                        <span className="shrink-0 text-base leading-none">{u.icon}</span>
                        <span className="truncate text-sm font-medium text-gray-900 dark:text-white">
                          {u.name}
                        </span>
                      </div>
                      <span className="shrink-0 text-right text-xs font-medium text-[#ef725c]">
                        {timingRight}
                      </span>
                    </div>

                    {actionable && instruction ? (
                      <Link
                        href={actionableHref(u.id, planDate)}
                        className="relative z-[1] block pl-6 text-xs leading-snug group"
                      >
                        <span className="text-gray-600 dark:text-gray-400">{instruction.primary} </span>
                        <span className="font-semibold text-[#ef725c] underline-offset-2 group-hover:underline">
                          {instruction.actionLabel}
                        </span>
                      </Link>
                    ) : (
                      <p className="relative z-[1] pl-6 text-xs text-gray-600 dark:text-gray-400 leading-snug">
                        {rawDetail}
                      </p>
                    )}

                    <div className="relative z-[1] mt-1.5 pl-6">
                      <div className="h-1.5 w-full max-w-full rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden ring-1 ring-[#ef725c]/20">
                        <div
                          className="h-1.5 rounded-full bg-gradient-to-r from-[#f0886c] to-[#ef725c] transition-all duration-300 shadow-[0_0_12px_rgba(239,114,92,0.5)]"
                          style={{ width: `${progressPct}%` }}
                          aria-hidden
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {hasMoreOnMobile ? (
              <p className="mt-2 text-center text-xs text-gray-400 dark:text-gray-500">
                +{moreOnMobileCount} more
              </p>
            ) : null}
          </div>
        )
      ) : null}
    </div>
  )
}
