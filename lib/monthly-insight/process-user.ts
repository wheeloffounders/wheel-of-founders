import type { SupabaseClient } from '@supabase/supabase-js'
import { generateMonthlyInsightForUser } from '@/lib/batch-monthly-insight'
import { getPreviousMonthRangeYmdInTimeZone } from '@/lib/timezone'
import { sendInsightDigestEmail } from '@/lib/email/send-insight-digest'

export type ProcessMonthlyCronUserResult = {
  success: boolean
  error?: string
}

export async function processMonthlyInsightCronUser(params: {
  db: SupabaseClient
  userId: string
  timeZone: string
  now: Date
  /** When false (e.g. quarter cron runs month gen first), skip digest email here. */
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
    return { success: false, error: err }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
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
    return { success: false, error: message }
  }
}
