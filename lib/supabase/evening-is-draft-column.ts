import type { PostgrestError } from '@supabase/supabase-js'

/**
 * True when the linked DB has not applied migration `125_draft_persistence_sliding_calendar.sql`
 * (or equivalent) and PostgREST rejects `evening_reviews.is_draft`.
 */
export function isMissingEveningIsDraftColumnError(
  err: PostgrestError | { message?: string } | null | undefined
): boolean {
  const m = String(err?.message ?? '').toLowerCase()
  if (!m.includes('is_draft')) return false
  return (
    m.includes('does not exist') ||
    m.includes('schema cache') ||
    m.includes("could not find") ||
    m.includes('unknown column')
  )
}

/**
 * True when DB has not applied migration adding `evening_reviews.brain_dump`
 * and PostgREST rejects the column.
 */
export function isMissingEveningBrainDumpColumnError(
  err: PostgrestError | { message?: string } | null | undefined
): boolean {
  const m = String(err?.message ?? '').toLowerCase()
  if (!m.includes('brain_dump')) return false
  return (
    m.includes('does not exist') ||
    m.includes('schema cache') ||
    m.includes('could not find') ||
    m.includes('unknown column')
  )
}

/** True when migration `140_evening_reviews_is_day_complete.sql` is not applied. */
export function isMissingEveningIsDayCompleteColumnError(
  err: PostgrestError | { message?: string } | null | undefined
): boolean {
  const m = String(err?.message ?? '').toLowerCase()
  if (!m.includes('is_day_complete')) return false
  return (
    m.includes('does not exist') ||
    m.includes('schema cache') ||
    m.includes('could not find') ||
    m.includes('unknown column')
  )
}
