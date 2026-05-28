'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { JourneyHistoryBentoGrid } from '@/components/founder-dna/JourneyHistoryBentoGrid'
import { WeeklyInsightChapterNav } from '@/components/weekly/WeeklyInsightChapterNav'
import {
  journeyPageGridClassName,
  journeyPageLeftColumnClassName,
  journeyPageRightColumnClassName,
} from '@/components/founder-dna/journey-page-layouts'
import { isJourneyWeeklyNarrativeLocked } from '@/lib/founder-dna/journey-week-entitlements'
import { insightArchiveHref } from '@/lib/insights/insight-archive-url'
import type { UserProfile } from '@/lib/features'
import { useWeeklyInsightChapters } from '@/lib/hooks/useWeeklyInsightChapters'
import {
  fetchUserProfileBundle,
  invalidateUserProfileBundle,
  type MorningUserProfileBundle,
} from '@/lib/user-profile-bundle-cache'

function profileFromBundle(bundle: MorningUserProfileBundle | null): UserProfile {
  return {
    tier: bundle?.tier ?? undefined,
    pro_features_enabled: bundle?.pro_features_enabled ?? undefined,
    subscription_override: bundle?.subscription_override ?? null,
    subscription_tier: bundle?.subscription_tier ?? null,
    is_beta_retired: bundle?.is_beta_retired ?? null,
    is_beta: bundle?.is_beta ?? null,
    trial_starts_at: bundle?.trial_starts_at ?? null,
    trial_ends_at: bundle?.trial_ends_at ?? null,
    stripe_subscription_status: bundle?.stripe_subscription_status ?? null,
    created_at: bundle?.created_at ?? null,
  }
}

type WeeklyInsightChapterArchiveProps = {
  /** Week currently open on “This week” (highlights nav selection). */
  highlightWeekStart?: string | null
  forceFreemiumAudit?: boolean
}

export function WeeklyInsightChapterArchive({
  highlightWeekStart = null,
  forceFreemiumAudit = false,
}: WeeklyInsightChapterArchiveProps) {
  const router = useRouter()
  const { weeks, loading, error } = useWeeklyInsightChapters()
  const [weeklyNarrativeLocked, setWeeklyNarrativeLocked] = useState(forceFreemiumAudit)
  const [navWeekStart, setNavWeekStart] = useState<string | null>(highlightWeekStart)

  const refreshWeeklyNarrativeLock = useCallback(async () => {
    const row = await fetchUserProfileBundle()
    setWeeklyNarrativeLocked(
      isJourneyWeeklyNarrativeLocked(profileFromBundle(row), {
        forceFreemiumAuditPath: forceFreemiumAudit,
      }),
    )
  }, [forceFreemiumAudit])

  useEffect(() => {
    void refreshWeeklyNarrativeLock()
    const onSim = () => {
      invalidateUserProfileBundle()
      void refreshWeeklyNarrativeLock()
    }
    window.addEventListener('wof-trial-sim-changed', onSim)
    return () => window.removeEventListener('wof-trial-sim-changed', onSim)
  }, [refreshWeeklyNarrativeLock])

  const syncArchiveUrl = useCallback(
    (weekStart: string) => {
      router.replace(insightArchiveHref('weekStart', weekStart), { scroll: false })
    },
    [router],
  )

  useEffect(() => {
    if (weeks.length === 0) return
    const fromUrl =
      highlightWeekStart && weeks.some((w) => w.weekStart === highlightWeekStart)
        ? highlightWeekStart
        : null
    const next = fromUrl ?? weeks[0]!.weekStart
    setNavWeekStart(next)
    if (!fromUrl) syncArchiveUrl(next)
  }, [weeks, highlightWeekStart, syncArchiveUrl])

  const openWeek = useCallback(
    (weekStart: string) => {
      router.push(`/weekly?weekStart=${weekStart}`)
    },
    [router],
  )

  return (
    <div className="space-y-6">
      <p className="text-sm italic text-gray-600 dark:text-gray-400">
        Every saved Mrs. Deer weekly letter, in one place. Pick a chapter to open that week&apos;s insight — same
        content and Pro gates as{' '}
        <span className="not-italic font-medium text-gray-800 dark:text-gray-200">This week</span>.
        {weeklyNarrativeLocked ? (
          <>
            {' '}
            Free: open any week for stats and reflection teaser; Pro unlocks full letters in the archive.
          </>
        ) : null}
      </p>

      <div className={journeyPageGridClassName}>
        <div className={journeyPageLeftColumnClassName}>
          <WeeklyInsightChapterNav
            weeks={weeks}
            loading={loading}
            activeWeekStart={navWeekStart}
            onSelectWeek={(weekStart) => {
              setNavWeekStart(weekStart)
              syncArchiveUrl(weekStart)
              document
                .querySelector(`[data-week-start="${weekStart}"]`)
                ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }}
          />
        </div>
        <div className={journeyPageRightColumnClassName}>
          <JourneyHistoryBentoGrid
            weeks={weeks}
            loading={loading}
            error={error}
            weeklyNarrativeLocked={weeklyNarrativeLocked}
            onOpenWeek={openWeek}
          />
        </div>
      </div>
    </div>
  )
}
