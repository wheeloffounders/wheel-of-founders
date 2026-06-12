/**
 * Reuses loaded cohort maps between Command Center core + pulse requests (same date window).
 * Avoids re-querying morning_tasks / evening_reviews when the dashboard lazy-loads pulse.
 */

export type CommandCenterCohortUser = {
  id: string
  email: string | null
  created_at: string
  timezone?: string | null
}

export type CommandCenterCohortSnapshot = {
  startDateStr: string
  endDateStr: string
  startIso: string
  endIso: string
  users: CommandCenterCohortUser[]
  userIds: string[]
  morningByUser: Map<string, unknown[]>
  decisionsByUser: Map<string, unknown[]>
  eveningByUser: Map<string, unknown[]>
  unlocksByUser: Map<string, Array<{ unlock_type?: string; unlock_name?: string }>>
  shadowByUser: Map<string, { label: string }>
  cohortSet: Set<string>
}

const TTL_MS = 3 * 60 * 1000
const cache = new Map<string, { expiresAt: number; snapshot: CommandCenterCohortSnapshot }>()

export function commandCenterCohortKey(startDateStr: string, endDateStr: string): string {
  return `${startDateStr}:${endDateStr}`
}

export function getCommandCenterCohort(key: string): CommandCenterCohortSnapshot | null {
  const hit = cache.get(key)
  if (!hit) return null
  if (Date.now() > hit.expiresAt) {
    cache.delete(key)
    return null
  }
  return hit.snapshot
}

export function setCommandCenterCohort(key: string, snapshot: CommandCenterCohortSnapshot): void {
  cache.set(key, { snapshot, expiresAt: Date.now() + TTL_MS })
}

export function invalidateCommandCenterCohort(key?: string): void {
  if (key) cache.delete(key)
  else cache.clear()
}
