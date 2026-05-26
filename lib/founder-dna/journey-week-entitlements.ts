import { isWeeklyInsightProSurfaceLocked, type UserProfile } from '@/lib/features'
import type { JourneyWeekRecordSource } from '@/lib/founder-dna/journey-week-records'

/** Journey roadmap chapters are weekly insight narrative — same Pro gate as `/weekly`. */
export function isJourneyWeeklyNarrativeLocked(
  user: UserProfile | null | undefined,
  options?: { forceFreemiumAuditPath?: boolean },
): boolean {
  if (options?.forceFreemiumAuditPath) return true
  return isWeeklyInsightProSurfaceLocked(user)
}

/** Strip saved weekly AI text for free tier (server + client defense in depth). */
export function stripJourneyWeekSourcesForFreemium(
  sources: JourneyWeekRecordSource[],
  user: UserProfile | null | undefined,
): JourneyWeekRecordSource[] {
  if (!isJourneyWeeklyNarrativeLocked(user)) return sources
  return sources.map((s) => ({ ...s, insightText: null }))
}
