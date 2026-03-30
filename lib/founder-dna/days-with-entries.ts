import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Days with entries = unique YYYY-MM-DD values where the user has either:
 * - a morning plan commit (`morning_plan_commits.plan_date`)
 * - an evening review (`evening_reviews.review_date`)
 *
 * Pass a Supabase client explicitly — never import server-only clients from this module
 * (this file is used from client code via `lib/progress.ts`).
 */
export async function getDaysWithEntries(userId: string, db: SupabaseClient): Promise<number> {

  const [morningsRes, eveningsRes] = await Promise.all([
    db.from('morning_plan_commits').select('plan_date').eq('user_id', userId),
    db.from('evening_reviews').select('review_date').eq('user_id', userId),
  ])

  if (morningsRes.error) throw morningsRes.error
  if (eveningsRes.error) throw eveningsRes.error

  const dates = new Set<string>()

  const morningRows = (morningsRes.data ?? []) as Array<{ plan_date?: string | null }>
  const eveningRows = (eveningsRes.data ?? []) as Array<{ review_date?: string | null }>
  const toYmd = (value: string | null): string | null => {
    if (!value) return null
    const ymd = value.includes('T') ? value.slice(0, 10) : value
    return /^\d{4}-\d{2}-\d{2}$/.test(ymd) ? ymd : null
  }

  for (const row of morningRows) {
    const planDate = typeof row.plan_date === 'string' ? toYmd(row.plan_date) : null
    if (planDate) dates.add(planDate)
  }

  for (const row of eveningRows) {
    const reviewDate = typeof row.review_date === 'string' ? toYmd(row.review_date) : null
    if (reviewDate) dates.add(reviewDate)
  }

  return dates.size
}

/**
 * Same as {@link getDaysWithEntries}, but only dates on or before `endYmd` (YYYY-MM-DD, inclusive).
 */
export async function getDaysWithEntriesUpTo(
  userId: string,
  db: SupabaseClient,
  endYmd: string
): Promise<number> {
  const [morningsRes, eveningsRes] = await Promise.all([
    db.from('morning_plan_commits').select('plan_date').eq('user_id', userId).lte('plan_date', endYmd),
    db.from('evening_reviews').select('review_date').eq('user_id', userId).lte('review_date', endYmd),
  ])

  if (morningsRes.error) throw morningsRes.error
  if (eveningsRes.error) throw eveningsRes.error

  const dates = new Set<string>()

  const morningRows = (morningsRes.data ?? []) as Array<{ plan_date?: string | null }>
  const eveningRows = (eveningsRes.data ?? []) as Array<{ review_date?: string | null }>
  const toYmd = (value: string | null): string | null => {
    if (!value) return null
    const ymd = value.includes('T') ? value.slice(0, 10) : value
    return /^\d{4}-\d{2}-\d{2}$/.test(ymd) ? ymd : null
  }

  for (const row of morningRows) {
    const planDate = typeof row.plan_date === 'string' ? toYmd(row.plan_date) : null
    if (planDate) dates.add(planDate)
  }

  for (const row of eveningRows) {
    const reviewDate = typeof row.review_date === 'string' ? toYmd(row.review_date) : null
    if (reviewDate) dates.add(reviewDate)
  }

  return dates.size
}
