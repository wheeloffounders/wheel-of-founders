import type { SupabaseClient } from '@supabase/supabase-js'
import * as Sentry from '@sentry/nextjs'
import { generateWeeklyInsightForUser } from '@/lib/batch-weekly-insight'
import { getPreviousIsoWeekRangeYmdInTimeZone } from '@/lib/timezone'
import { sendInsightDigestEmail } from '@/lib/email/send-insight-digest'

export type ProcessUserWeeklyInsightResult = {
  success: boolean
  skippedNoContent?: boolean
  error?: string
}

/**
 * One user's weekly cron pipeline: generate → pattern HTTP → weekly_insights upsert → digest email.
 * Mirrors legacy sequential cron behavior for a single user.
 */
export async function processUserWeeklyInsight(params: {
  db: SupabaseClient
  userId: string
  timeZone: string
  now: Date
  cronSecret: string | undefined
  appUrl: string | null
}): Promise<ProcessUserWeeklyInsightResult> {
  const { db, userId, timeZone, now, cronSecret, appUrl } = params
  const { weekStart, weekEnd } = getPreviousIsoWeekRangeYmdInTimeZone(now, timeZone)

  try {
    const result = await generateWeeklyInsightForUser(userId, weekStart, weekEnd)

    if (result.success) {
      Sentry.addBreadcrumb({
        category: 'weekly-insights',
        message: 'Weekly insight generated (cron batch)',
        level: 'info',
        data: { userId, weekStart, weekEnd },
      })
    }

    let pattern: string | null = null
    if (appUrl && cronSecret) {
      try {
        const patternRes = await fetch(`${appUrl}/api/patterns/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${cronSecret}`,
          },
          body: JSON.stringify({ userId }),
        })
        if (patternRes.ok) {
          const json = (await patternRes.json()) as { pattern?: string | null }
          pattern = json.pattern ?? null
        }
      } catch (patternErr) {
        console.warn(`[weekly-insight/process-user] Pattern for user ${userId}:`, patternErr)
      }
    }

    const insightText = result.success ? result.insight ?? null : null

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- weekly_insights columns not in generated types
    await (db.from('weekly_insights') as any).upsert(
      {
        user_id: userId,
        week_start: weekStart,
        week_end: weekEnd,
        insight_text: insightText,
        unseen_wins_pattern: pattern,
        generated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,week_start' }
    )

    await sendInsightDigestEmail({
      userId,
      timeZone,
      db,
      now,
      weeklyInsightText: insightText,
      weeklyWeekStart: weekStart,
      weeklyWeekEnd: weekEnd,
    })

    if (!result.success) {
      const err = result.error ?? 'Unknown failure'
      if (err === 'No wins or lessons for week') {
        return { success: false, skippedNoContent: true, error: err }
      }
      return { success: false, error: err }
    }

    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error(`[weekly-insight/process-user] User ${userId}:`, err)
    Sentry.captureException(err, {
      tags: { feature: 'weekly-insights', type: 'cron-batch-user' },
      extra: { userId, weekStart, weekEnd },
    })
    return { success: false, error: message }
  }
}
