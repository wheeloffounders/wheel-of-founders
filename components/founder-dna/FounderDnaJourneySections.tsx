'use client'

import { JourneyBadgeSection } from '@/components/badges/JourneyBadgeSection'
import { FounderDnaScheduleTimeline } from '@/components/founder-dna/FounderDnaScheduleTimeline'
import { FounderDnaLifetimeStats } from '@/components/founder-dna/FounderDnaLifetimeStats'
import { JourneyBlueprintCard } from '@/components/founder-dna/JourneyBlueprintCard'
import { useFounderJourney } from '@/lib/hooks/useFounderJourney'
import Link from 'next/link'

/** Journey hub — badges, unlock schedule, lifetime stats (weekly letters live under Weekly Insight). */
export function FounderDnaJourneySections() {
  const journey = useFounderJourney()

  return (
    <>
      <p className="text-sm italic text-gray-600 dark:text-gray-400 mb-8">
        Your founder journey beyond the weekly letter — badges, unlock timing, and lifetime rhythm. Saved Mrs. Deer
        weekly chapters are in{' '}
        <Link href="/weekly?view=archive" className="font-medium text-[#ef725c] hover:underline not-italic">
          Weekly Insight → Past chapters
        </Link>
        .
      </p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <JourneyBlueprintCard as="section" aria-labelledby="journey-schedule">
          <h2 id="journey-schedule" className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
            Unlock schedule
          </h2>
          <FounderDnaScheduleTimeline journey={journey} />
        </JourneyBlueprintCard>

        <div className="space-y-6">
          <JourneyBlueprintCard as="section" aria-labelledby="journey-badges">
            <h2 id="journey-badges" className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
              Badge gallery
            </h2>
            <JourneyBadgeSection journey={journey} />
          </JourneyBlueprintCard>

          <JourneyBlueprintCard as="section" aria-labelledby="journey-stats">
            <h2 id="journey-stats" className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
              Lifetime stats
            </h2>
            <FounderDnaLifetimeStats journey={journey} />
          </JourneyBlueprintCard>
        </div>
      </div>
    </>
  )
}
