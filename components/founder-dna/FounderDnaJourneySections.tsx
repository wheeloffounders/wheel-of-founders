'use client'

import { JourneyBadgeSection } from '@/components/badges/JourneyBadgeSection'
import { FounderDnaScheduleTimeline } from '@/components/founder-dna/FounderDnaScheduleTimeline'
import { FounderDnaLifetimeStats } from '@/components/founder-dna/FounderDnaLifetimeStats'
import { useFounderJourney } from '@/lib/hooks/useFounderJourney'

/** Single journey fetch for the hub so Badge / Schedule / Stats stay in sync (avoids triple loading on mobile). */
export function FounderDnaJourneySections() {
  const journey = useFounderJourney()

  return (
    <div className="space-y-8">
      <section aria-labelledby="journey-schedule">
        <h2 id="journey-schedule" className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
          Unlock schedule
        </h2>
        <FounderDnaScheduleTimeline journey={journey} />
      </section>

      <section aria-labelledby="journey-badges">
        <h2 id="journey-badges" className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
          Badge Gallery
        </h2>
        <JourneyBadgeSection journey={journey} />
      </section>

      <section aria-labelledby="journey-stats">
        <h2 id="journey-stats" className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
          Lifetime stats
        </h2>
        <FounderDnaLifetimeStats journey={journey} />
      </section>
    </div>
  )
}
