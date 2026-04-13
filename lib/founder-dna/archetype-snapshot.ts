import { addDays } from 'date-fns'
import { differenceInCalendarDays } from 'date-fns'
import type { ArchetypeApiFullResponse } from '@/lib/types/founder-dna'
import { ARCHETYPE_FULL_MIN_DAYS } from '@/lib/founder-dna/archetype-timing'
import type { UnlockedFeatureJson } from '@/types/supabase'

/** Days between automatic full archetype recomputes once the user has full unlock (quarterly cadence). */
export const ARCHETYPE_SNAPSHOT_REFRESH_DAYS = 90

export const ARCHETYPE_SNAPSHOT_VERSION = 1 as const

/**
 * Coerce `archetype_snapshot` from Supabase: object as-is, JSON string → parse once, invalid → null.
 * Never throws (avoids crashing the route on malformed or double-encoded JSON).
 */
export function normalizeSnapshotRaw(raw: unknown): unknown {
  if (raw == null) return null
  if (typeof raw === 'object') return raw
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  try {
    return JSON.parse(trimmed) as unknown
  } catch {
    return null
  }
}

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

export function parseStoredArchetypeFullSnapshot(input: unknown): ArchetypeStoredFullSnapshot | null {
  try {
    const raw = normalizeSnapshotRaw(input)
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
    const o = raw as Record<string, unknown>
    if (o.status !== 'full') return null
    if (!o.primary || typeof o.primary !== 'object') return null
    if (!o.traits || typeof o.traits !== 'object') return null
    if (!o.personalityProfile || typeof o.personalityProfile !== 'object') return null
    if (!o.breakdown || typeof o.breakdown !== 'object') return null
    return raw as ArchetypeStoredFullSnapshot
  } catch (e) {
    console.error('[archetype-snapshot] parseStoredArchetypeFullSnapshot failed', e)
    return null
  }
}

/**
 * True when profile JSON clearly has a persisted archetype (strict parse, or loose shape after drift).
 * Used to repair `unlocked_features` and avoid a false "locked" state when Supabase already has a snapshot.
 */
export function hasPersistedArchetypeUnlockHint(input: unknown): boolean {
  try {
    if (parseStoredArchetypeFullSnapshot(input)) return true
    const raw = normalizeSnapshotRaw(input)
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false
    const o = raw as Record<string, unknown>
    return !!(o.primary && typeof o.primary === 'object' && o.traits && typeof o.traits === 'object')
  } catch (e) {
    console.error('[archetype-snapshot] hasPersistedArchetypeUnlockHint failed', e)
    return false
  }
}

/**
 * If `user_profiles.archetype_snapshot` exists but `unlocked_features` is missing archetype rows
 * (stale client, migration gap, or days-with-entries undercount), merge the expected unlock entries.
 */
export function mergeArchetypeUnlocksFromPersistedSnapshot(
  unlocked: UnlockedFeatureJson[],
  snapshot: unknown
): { merged: UnlockedFeatureJson[]; didRepair: boolean } {
  try {
    const snap = normalizeSnapshotRaw(snapshot)
    const strict = parseStoredArchetypeFullSnapshot(snap)
    const loose = hasPersistedArchetypeUnlockHint(snap)
    if (!strict && !loose) {
      return { merged: unlocked, didRepair: false }
    }

    const nowIso = new Date().toISOString()
    const out = [...unlocked]
    const names = new Set(out.map((f) => f.name))

    if (!names.has('founder_archetype')) {
      out.push({
        name: 'founder_archetype',
        label: 'Founder Archetype (Preview)',
        description: 'Emerging archetype preview — full profile at 31 days with entries',
        icon: '🏷️',
        unlocked_at: nowIso,
      })
      names.add('founder_archetype')
    }

    const wantsFull =
      strict ||
      (typeof snap === 'object' &&
        snap !== null &&
        !Array.isArray(snap) &&
        String((snap as Record<string, unknown>).status ?? '') === 'full')

    if (wantsFull && !names.has('founder_archetype_full')) {
      out.push({
        name: 'founder_archetype_full',
        label: 'Founder Archetype (Full)',
        description: 'Full archetype profile and breakdown',
        icon: '🔮',
        unlocked_at: nowIso,
      })
    }

    const didRepair = out.length !== unlocked.length
    return { merged: out, didRepair }
  } catch (e) {
    console.error('[archetype-snapshot] mergeArchetypeUnlocksFromPersistedSnapshot failed', e)
    return { merged: unlocked, didRepair: false }
  }
}

/** When a full snapshot is already stored, avoid recomputing as "preview" if days-with-entries is undercounted. */
export function effectiveDaysActiveForArchetypeCompute(daysActive: number, snapshot: unknown): number {
  if (parseStoredArchetypeFullSnapshot(snapshot)) {
    return Math.max(daysActive, ARCHETYPE_FULL_MIN_DAYS)
  }
  return daysActive
}

export function toPersistableFullSnapshot(
  body: Pick<
    ArchetypeApiFullResponse,
    'status' | 'primary' | 'secondary' | 'traits' | 'personalityProfile' | 'breakdown'
  >
): ArchetypeStoredFullSnapshot {
  return { ...body, _v: ARCHETYPE_SNAPSHOT_VERSION }
}
