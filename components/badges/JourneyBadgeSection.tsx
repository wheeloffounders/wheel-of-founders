'use client'

import type { FounderJourneyQueryState } from '@/lib/hooks/useFounderJourney'
import { BadgeGallery } from '@/components/badges/BadgeGallery'
import { BadgeUnlockFlow } from '@/components/badges/BadgeUnlockFlow'

export type JourneyBadgeSectionProps = {
  /** Shared query from parent so the Journey hub uses one API call. */
  journey: FounderJourneyQueryState
}

export function JourneyBadgeSection({ journey }: JourneyBadgeSectionProps) {
  const { data, loading, error } = journey
  const badges = data?.badges ?? []
  const newlyUnlockedBadges = data?.newlyUnlockedBadges ?? []

  if (loading) {
    return <p className="text-sm text-gray-600 dark:text-gray-300">Loading badges...</p>
  }
  if (error) {
    return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
  }

  return (
    <>
      <BadgeGallery badges={badges} />
      <BadgeUnlockFlow newlyUnlockedBadges={newlyUnlockedBadges} />
    </>
  )
}
