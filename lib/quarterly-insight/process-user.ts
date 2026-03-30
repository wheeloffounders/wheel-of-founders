import type { SupabaseClient } from '@supabase/supabase-js'
import { generateQuarterlyInsightForUser } from '@/lib/batch-quarterly-insight'
import { getPreviousQuarterRangeYmdInTimeZone, shouldRunMonthlyInsightForUser } from '@/lib/timezone'
import { sendInsightDigestEmail } from '@/lib/email/send-insight-digest'
import { processMonthlyInsightCronUser } from '@/lib/monthly-insight/process-user'

export type ProcessQuarterlyCronUserResult = {
  success: boolean
  error?: string
}

export async function processQuarterlyInsightCronUser(params: {
  db: SupabaseClient
  userId: string
  timeZone: string
  now: Date
}): Promise<ProcessQuarterlyCronUserResult> {
  const { db, userId, timeZone, now } = params

  const range = getPreviousQuarterRangeYmdInTimeZone(now, timeZone)
  if (!range) {
    return { success: false, error: 'No quarter range for user timezone' }
  }
  const { quarterStart, quarterEnd } = range

  try {
    if (shouldRunMonthlyInsightForUser(now, timeZone)) {
      await processMonthlyInsightCronUser({
        db,
        userId,
        timeZone,
        now,
        sendEmail: false,
      })
    }

    const result = await generateQuarterlyInsightForUser(userId, quarterStart, quarterEnd)

    if (result.success && (result.insight ?? '').trim()) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (db.from('quarterly_insights') as any).upsert(
        {
          user_id: userId,
          quarter_start: quarterStart,
          quarter_end: quarterEnd,
          insight_text: result.insight,
          generated_at: new Date().toISOString(),
          status: 'completed',
          retry_count: 0,
          next_retry_at: null,
        },
        { onConflict: 'user_id,quarter_start' }
      )

      await sendInsightDigestEmail({
        userId,
        timeZone,
        db,
        now,
        quarterlyInsightText: result.insight,
      })
      return { success: true }
    }

    const err = result.error ?? 'Quarterly generation failed'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db.from('quarterly_insights') as any).upsert(
      {
        user_id: userId,
        quarter_start: quarterStart,
        quarter_end: quarterEnd,
        insight_text: null,
        generated_at: new Date().toISOString(),
        status: 'failed',
        retry_count: 0,
        next_retry_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      },
      { onConflict: 'user_id,quarter_start' }
    )
    return { success: false, error: err }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    const { quarterStart: qs, quarterEnd: qe } =
      getPreviousQuarterRangeYmdInTimeZone(now, timeZone) ?? { quarterStart: '', quarterEnd: '' }
    if (qs && qe) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (db.from('quarterly_insights') as any).upsert(
        {
          user_id: userId,
          quarter_start: qs,
          quarter_end: qe,
          insight_text: null,
          generated_at: new Date().toISOString(),
          status: 'failed',
          retry_count: 0,
          next_retry_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        },
        { onConflict: 'user_id,quarter_start' }
      )
    }
    return { success: false, error: message }
  }
}
