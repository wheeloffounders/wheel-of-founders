import { addDays } from 'date-fns'
import { differenceInCalendarDays } from 'date-fns'
import type { ArchetypeApiFullResponse } from '@/lib/types/founder-dna'

/** Days between automatic full archetype recomputes once the user has full unlock (quarterly cadence). */
export const ARCHETYPE_SNAPSHOT_REFRESH_DAYS = 90

export const ARCHETYPE_SNAPSHOT_VERSION = 1 as const

/** Persisted JSON (no unlockChecklist — that is rebuilt on read). */
export type ArchetypeStoredFullSnapshot = Pick<
  ArchetypeApiFullResponse,
  'status' | 'primary' | 'secondary' | 'traits' | 'personalityProfile' | 'breakdown'
> & { _v?: typeof ARCHETYPE_SNAPSHOT_VERSION }

export function shouldRefreshArchetypeSnapshot(atIso: string | null | undefined): boolean {
  if (!atIso) return true
  const d = new Date(atIso)
  if (Number.isNaN(d.getTime())) return true
  return differenceInCalendarDays(new Date(), d) >= ARCHETYPE_SNAPSHOT_REFRESH_DAYS
}

export function nextArchetypeUpdateIsoFrom(atIso: string): string {
  const d = new Date(atIso)
  if (Number.isNaN(d.getTime())) return new Date().toISOString()
  return addDays(d, ARCHETYPE_SNAPSHOT_REFRESH_DAYS).toISOString()
}

export function parseStoredArchetypeFullSnapshot(raw: unknown): ArchetypeStoredFullSnapshot | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>
  if (o.status !== 'full') return null
  if (!o.primary || typeof o.primary !== 'object') return null
  if (!o.traits || typeof o.traits !== 'object') return null
  if (!o.personalityProfile || typeof o.personalityProfile !== 'object') return null
  if (!o.breakdown || typeof o.breakdown !== 'object') return null
  return raw as ArchetypeStoredFullSnapshot
}

export function toPersistableFullSnapshot(
  body: Pick<
    ArchetypeApiFullResponse,
    'status' | 'primary' | 'secondary' | 'traits' | 'personalityProfile' | 'breakdown'
  >
): ArchetypeStoredFullSnapshot {
  return { ...body, _v: ARCHETYPE_SNAPSHOT_VERSION }
}
