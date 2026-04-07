import type { SupabaseClient } from '@supabase/supabase-js'
import { generateMonthlyInsightForUser } from '@/lib/batch-monthly-insight'
import { getPreviousMonthRangeYmdInTimeZone } from '@/lib/timezone'
import { sendInsightDigestEmail } from '@/lib/email/send-insight-digest'

export type ProcessMonthlyCronUserResult = {
  success: boolean
  error?: string
}

const DEFAULT_PER_USER_BUDGET_MS = 55_000

async function upsertMonthlyInsightFailedRow(
  db: SupabaseClient,
  userId: string,
  monthStart: string,
  monthEnd: string
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db.from('monthly_insights') as any).upsert(
    {
      user_id: userId,
      month_start: monthStart,
      month_end: monthEnd,
      insight_text: null,
      generated_at: new Date().toISOString(),
      status: 'failed',
      retry_count: 0,
      next_retry_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    },
    { onConflict: 'user_id,month_start' }
  )
}

async function runMonthlyInsightCronForUser(params: {
  db: SupabaseClient
  userId: string
  timeZone: string
  now: Date
  sendEmail: boolean
}): Promise<ProcessMonthlyCronUserResult> {
  const { db, userId, timeZone, now, sendEmail } = params
  const { monthStart, monthEnd } = getPreviousMonthRangeYmdInTimeZone(now, timeZone)

  try {
    const result = await generateMonthlyInsightForUser(userId, monthStart, monthEnd)

    if (result.success && (result.insight ?? '').trim()) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (db.from('monthly_insights') as any).upsert(
        {
          user_id: userId,
          month_start: monthStart,
          month_end: monthEnd,
          insight_text: result.insight,
          generated_at: new Date().toISOString(),
          status: 'completed',
          retry_count: 0,
          next_retry_at: null,
        },
        { onConflict: 'user_id,month_start' }
      )

      if (sendEmail) {
        await sendInsightDigestEmail({
          userId,
          timeZone,
          db,
          now,
          monthlyInsightText: result.insight,
          monthlyPeriodYyyymm: monthStart.slice(0, 7),
        })
      }
      return { success: true }
    }

    const err = result.error ?? 'Monthly generation failed'
    await upsertMonthlyInsightFailedRow(db, userId, monthStart, monthEnd)
    return { success: false, error: err }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    await upsertMonthlyInsightFailedRow(db, userId, monthStart, monthEnd)
    return { success: false, error: message }
  }
}

/**
 * Generates previous-month insight, upserts `monthly_insights`, optionally sends digest.
 * Bounded by `MONTHLY_CRON_PER_USER_MS` (default 55s) so one slow user cannot exhaust the whole cron.
 */
export async function processMonthlyInsightCronUser(params: {
  db: SupabaseClient
  userId: string
  timeZone: string
  now: Date
  /** When false (e.g. quarter cron runs month gen first), skip digest email here. */
  sendEmail: boolean
}): Promise<ProcessMonthlyCronUserResult> {
  const budgetMs = Number(process.env.MONTHLY_CRON_PER_USER_MS) || DEFAULT_PER_USER_BUDGET_MS
  const { db, userId, timeZone, now } = params
  const { monthStart, monthEnd } = getPreviousMonthRangeYmdInTimeZone(now, timeZone)

  try {
    return await Promise.race([
      runMonthlyInsightCronForUser(params),
      new Promise<ProcessMonthlyCronUserResult>((_, reject) =>
        setTimeout(() => reject(new Error(`Monthly insight exceeded ${budgetMs}ms`)), budgetMs)
      ),
    ])
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    try {
      await upsertMonthlyInsightFailedRow(db, userId, monthStart, monthEnd)
    } catch (upErr) {
      console.error('[monthly-insight] Failed to record failed row after timeout', upErr)
    }
    return { success: false, error: message }
  }
}
