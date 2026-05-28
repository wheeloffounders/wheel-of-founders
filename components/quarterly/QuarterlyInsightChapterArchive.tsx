'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  journeyBentoGridClassName,
  journeyPageGridClassName,
  journeyPageLeftColumnClassName,
  journeyPageRightColumnClassName,
} from '@/components/founder-dna/journey-page-layouts'
import { InsightChapterBentoCard } from '@/components/insights/InsightChapterBentoCard'
import { InsightChapterNav } from '@/components/insights/InsightChapterNav'
import type { InsightChapterRecord } from '@/lib/insights/insight-chapter-records'
import { useQuarterlyInsightChapters } from '@/lib/hooks/useQuarterlyInsightChapters'
import { fetchUserProfileBundle, invalidateUserProfileBundle, type MorningUserProfileBundle } from '@/lib/user-profile-bundle-cache'
import { isQuarterlyInsightFeatureLocked, type UserProfile } from '@/lib/features'
import { insightArchiveHref } from '@/lib/insights/insight-archive-url'

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

type QuarterlyInsightChapterArchiveProps = {
  highlightQuarterKey?: string | null
}

export function QuarterlyInsightChapterArchive({
  highlightQuarterKey = null,
}: QuarterlyInsightChapterArchiveProps) {
  const router = useRouter()
  const { chapters, loading, error } = useQuarterlyInsightChapters()
  const [quarterlyNarrativeLocked, setQuarterlyNarrativeLocked] = useState(true)
  const [activePeriodKey, setActivePeriodKey] = useState<string | null>(highlightQuarterKey)

  useEffect(() => {
    let cancelled = false
    const loadLock = async () => {
      const row = await fetchUserProfileBundle()
      if (cancelled) return
      setQuarterlyNarrativeLocked(
        isQuarterlyInsightFeatureLocked('ai_synthesis', profileFromBundle(row)),
      )
    }
    void loadLock()

    const onSim = () => {
      invalidateUserProfileBundle()
      void loadLock()
    }
    window.addEventListener('wof-trial-sim-changed', onSim)
    return () => {
      cancelled = true
      window.removeEventListener('wof-trial-sim-changed', onSim)
    }
  }, [])

  const syncArchiveUrl = useCallback(
    (periodKey: string) => {
      router.replace(insightArchiveHref('quarter', periodKey), { scroll: false })
    },
    [router],
  )

  useEffect(() => {
    if (chapters.length === 0) return
    const fromUrl =
      highlightQuarterKey && chapters.some((c) => c.periodKey === highlightQuarterKey)
        ? highlightQuarterKey
        : null
    const next = fromUrl ?? chapters[0]!.periodKey
    setActivePeriodKey(next)
    if (!fromUrl) syncArchiveUrl(next)
  }, [chapters, highlightQuarterKey, syncArchiveUrl])

  const openQuarter = useCallback(
    (periodKey: string) => {
      router.push(`/quarterly?quarter=${periodKey}`)
    },
    [router],
  )

  const onSelectPeriod = useCallback(
    (periodKey: string) => {
      setActivePeriodKey(periodKey)
      syncArchiveUrl(periodKey)
      document
        .querySelector(`[data-period-key="${periodKey}"]`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    },
    [syncArchiveUrl],
  )

  const renderChapters = (items: InsightChapterRecord[]) =>
    items.map((c) => (
      <InsightChapterBentoCard
        key={c.periodKey}
        record={c}
        contextLabel="QUARTER"
        locked={quarterlyNarrativeLocked}
        onOpenPeriod={openQuarter}
      />
    ))

  return (
    <div className="space-y-6">
      <p className="text-sm italic text-gray-600 dark:text-gray-400">
        Every saved Mrs. Deer quarterly letter, in one place.
        {quarterlyNarrativeLocked ? (
          <>
            {' '}
            Free shows your chapter list; open a quarter to read the reflection teaser, with Pro unlocking the full letter.
          </>
        ) : null}
      </p>

      <div className={journeyPageGridClassName}>
        <div className={journeyPageLeftColumnClassName}>
          <InsightChapterNav
            contextLabel="Quarterly"
            chapters={chapters}
            loading={loading}
            activePeriodKey={activePeriodKey}
            onSelectPeriod={onSelectPeriod}
          />
          {error ? <p className="text-xs text-red-600 mt-3">{error}</p> : null}
        </div>

        <div className={journeyPageRightColumnClassName}>
          <div className={journeyBentoGridClassName}>{renderChapters(chapters)}</div>
        </div>
      </div>
    </div>
  )
}

