'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { MrsDeerAvatar } from '@/components/MrsDeerAvatar'
import { Button } from '@/components/ui/button'
import { trackEvent } from '@/lib/analytics'
import type { TrialWrapupStats } from '@/lib/trial-wrapup-stats'

const DISMISS_PREFIX = 'wof_trial_wrapup_dismissed:v1:'

export function trialWrapupDismissStorageKey(userId: string, trialEndsAt: string): string {
  return `${DISMISS_PREFIX}${userId}:${trialEndsAt}`
}

export function isTrialWrapupDismissed(userId: string, trialEndsAt: string | null | undefined): boolean {
  if (typeof window === 'undefined' || !trialEndsAt) return false
  try {
    return window.localStorage.getItem(trialWrapupDismissStorageKey(userId, trialEndsAt)) === '1'
  } catch {
    return false
  }
}

type TrialWeekWrapupCardProps = {
  stats: TrialWrapupStats
  onDismiss: () => void
  userId: string
  trialEndsAt: string
}

/**
 * One-time “Pro week in review” after trial expires — premium-framed summary + upgrade / continue paths.
 */
export function TrialWeekWrapupCard({ stats, onDismiss, userId, trialEndsAt }: TrialWeekWrapupCardProps) {
  const viewedRef = useRef(false)

  useEffect(() => {
    if (viewedRef.current) return
    viewedRef.current = true
    trackEvent('trial_wrapup_viewed', {
      fires_count: stats.firesCount,
      alignment_pct: stats.alignmentPct,
      aligned_days: stats.alignedDays,
      trial_day_count: stats.trialDayCount,
    })
  }, [stats])

  const markDismissed = () => {
    try {
      window.localStorage.setItem(trialWrapupDismissStorageKey(userId, trialEndsAt), '1')
    } catch {
      /* ignore */
    }
    onDismiss()
  }

  const onUpgrade = () => {
    trackEvent('trial_wrapup_cta_clicked', { choice: 'upgrade' })
    markDismissed()
  }

  const onBasic = () => {
    trackEvent('trial_wrapup_cta_clicked', { choice: 'basic' })
    markDismissed()
  }

  return (
    <div
      className="mb-4 overflow-hidden rounded-2xl border-2 border-amber-200/90 bg-gradient-to-br from-amber-50/90 via-white to-[#ecf9ef] shadow-md dark:border-amber-600/50 dark:from-amber-950/40 dark:via-gray-900/80 dark:to-[#0f172a]/90"
      role="region"
      aria-label="Pro week summary"
    >
      <div className="border-b border-amber-200/60 bg-amber-100/30 px-4 py-2 dark:border-amber-800/40 dark:bg-amber-950/30">
        <p className="text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-900/80 dark:text-amber-200/90">
          Pro week in review
        </p>
      </div>
      <div className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex shrink-0 justify-center sm:justify-start">
            <div className="rounded-full border-2 border-amber-300/80 bg-white/80 p-1 shadow-sm dark:border-amber-600/50 dark:bg-gray-900/60">
              <MrsDeerAvatar expression="encouraging" size="large" />
            </div>
          </div>
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <div className="mb-1 flex items-center justify-center gap-2 sm:justify-start">
              <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden />
              <span className="text-sm font-semibold text-[#152b50] dark:text-sky-100">Mrs. Deer</span>
            </div>
            <p className="text-sm leading-relaxed text-gray-800 dark:text-gray-100">
              You navigated <span className="font-semibold text-[#152b50] dark:text-sky-200">{stats.firesCount}</span>{' '}
              fire{stats.firesCount === 1 ? '' : 's'} and stayed aligned with your intentions{' '}
              <span className="font-semibold text-[#152b50] dark:text-sky-200">{stats.alignmentPct}%</span> of the time this
              week ({stats.alignedDays} of {stats.trialDayCount} days with both a committed morning and an evening
              reflection). You&apos;re building a resilient system, Founder.
            </p>
            <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
              Thank you for your first week — whatever you choose next, the groundwork you laid stays yours.
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
          <Button
            type="button"
            variant="outline"
            className="w-full border-slate-300 sm:w-auto dark:border-slate-600"
            onClick={onBasic}
          >
            Continue with Basic Tasks
          </Button>
          <Link
            href="/pricing"
            onClick={() => onUpgrade()}
            className="inline-flex w-full items-center justify-center rounded-none border-2 border-[#152b50] bg-[#152b50] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#152b50]/90 sm:w-auto dark:border-sky-800 dark:bg-sky-800 dark:hover:bg-sky-700"
          >
            Keep Mrs. Deer as my COO (Upgrade)
          </Link>
        </div>
      </div>
    </div>
  )
}
