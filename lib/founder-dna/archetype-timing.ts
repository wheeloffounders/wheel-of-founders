import type { ArchetypeJourneyStatus } from '@/lib/types/founder-dna'

/** Minimum days with entries to see Founder Archetype preview (emerging pattern). */
export const ARCHETYPE_PREVIEW_MIN_DAYS = 21

/** Minimum days with entries for full archetype profile + breakdown. */
export const ARCHETYPE_FULL_MIN_DAYS = 31

export function getArchetypeJourneyStatus(daysActive: number): ArchetypeJourneyStatus {
  if (daysActive < ARCHETYPE_PREVIEW_MIN_DAYS) return 'locked'
  if (daysActive < ARCHETYPE_FULL_MIN_DAYS) return 'preview'
  return 'full'
}
