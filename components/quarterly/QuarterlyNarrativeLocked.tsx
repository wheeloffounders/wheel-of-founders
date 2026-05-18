'use client'

import { MrsDeerAvatar } from '@/components/MrsDeerAvatar'
import { InsightPeriodSection } from '@/components/insights/InsightPeriodSection'
import { InsightPeriodTeaserLock } from '@/components/insights/InsightPeriodTeaserLock'

import type { InsightPeriodAccent } from '@/lib/insights/insight-period-card-styles'

interface QuarterlyNarrativeLockedProps {
  teaserMessage: string
  accent?: InsightPeriodAccent
  onUpgradeClick?: () => void
}

/** Freemium: one narrative lock instead of five duplicate glass overlays. */
export function QuarterlyNarrativeLocked({
  teaserMessage,
  accent = 'mood',
  onUpgradeClick,
}: QuarterlyNarrativeLockedProps) {
  return (
    <InsightPeriodSection title="How Your Quarter Unfolded" accent={accent}>
      <div className="mb-4 flex justify-start">
        <MrsDeerAvatar expression="encouraging" size="medium" />
      </div>
      <InsightPeriodTeaserLock
        message={teaserMessage}
        markdown={false}
        ctaHeadingId="quarterly-narrative-pro-cta"
        ctaDescription="Pro unlocks month-by-month revelations, your transformation thread, carried-forward strengths, and a guiding question for next quarter."
        ctaFooter={<>Your quarter stats and wins below stay visible while you explore.</>}
        onUpgradeClick={onUpgradeClick}
      />
    </InsightPeriodSection>
  )
}
