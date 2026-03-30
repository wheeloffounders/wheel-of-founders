'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { InfoTooltip } from '@/components/InfoTooltip'
import { useFounderJourney } from '@/lib/hooks/useFounderJourney'
import { useMediaQuery } from '@/lib/hooks/useMediaQuery'
import type { JourneyUnlock } from '@/lib/types/founder-dna'
import { getProgressStatus } from '@/lib/format-progress'

type ComingUpNextProps = {
  items?: JourneyUnlock[]
}

/** Pending unlock rows shown in this card (from journey `nextUnlocks`, not total app features). */
const MOBILE_VISIBLE = 3

/** Unlocks where the description row is a real next step (not a locked DNA page). */
const ACTIONABLE_COMING_UP_HREF: Record<string, string> = {
  first_glimpse: '/evening',
  founder_story: '/profile',
  morning_insights: '/morning',
}

function isActionableComingUpUnlock(id: string): boolean {
  return Object.hasOwn(ACTIONABLE_COMING_UP_HREF, id)
}

function actionableHref(id: string): string {
  return ACTIONABLE_COMING_UP_HREF[id] ?? '/dashboard'
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

/** Right-column label: time-to-unlock, or day progress when no estimate (e.g. Founder Story). */
function timingColumnLabel(u: JourneyUnlock): string {
  return unlockTimingPrimary(u) ?? dayProgressLabel(u)
}

export function ComingUpNext({ items }: ComingUpNextProps) {
  const { data, loading, error } = useFounderJourney()
  const isMobile = useMediaQuery('(max-width: 768px)')
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
                const timingPrimary = unlockTimingPrimary(u)
                const dayProg = dayProgressLabel(u)
                const target = Math.max(u.target, 1)
                const progressPct = Math.max(0, Math.min(100, Math.round((u.progress / target) * 100)))
                const timingRight = timingColumnLabel(u)
                const showProgressParens = shouldShowProgressParens(u)
                const detailText = `${u.requirement}${showProgressParens ? ` (${dayProg})` : ''}`
                const actionable = isActionableComingUpUnlock(u.id)

                return (
                  <div key={u.id} className="py-2 first:pt-0 space-y-0.5">
                    <div className="flex w-full min-w-0 items-baseline justify-between gap-3">
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

                    {actionable ? (
                      <Link
                        href={actionableHref(u.id)}
                        className="block pl-6 text-xs text-emerald-600 dark:text-emerald-400 hover:underline leading-snug"
                      >
                        {detailText} →
                      </Link>
                    ) : (
                      <p className="pl-6 text-xs text-gray-500 dark:text-gray-400 leading-snug">{detailText}</p>
                    )}

                    <div className="mt-1.5 pl-6 md:hidden">
                      <div className="h-1.5 w-full max-w-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                        <div
                          className="h-1.5 bg-[#ef725c] transition-all duration-300"
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
