import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/server-supabase'
import { getFeatureAccess } from '@/lib/features'
import { generateWeeklyInsightForUser } from '@/lib/batch-weekly-insight'
import { getLastMonday, getLastSunday, toDateStr } from '@/lib/date-utils'
import { authorizeCronRequest, logCronRequestMeta } from '@/lib/cron-auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Cron: Generate weekly insights for all active users.
 * Schedule: Monday 00:00 UTC (see vercel.json). Generates for the previous week (Mon–Sun).
 * Secured by CRON_SECRET (Bearer); must match Vercel project env exactly (trimmed).
 */
export async function GET(request: NextRequest) {
  logCronRequestMeta('cron/generate-weekly-insights', request)

  const auth = authorizeCronRequest(request)
  if (!auth.ok) {
    console.warn('[cron/generate-weekly-insights] UNAUTHORIZED', {
      reason: auth.reason,
      hint:
        auth.reason === 'missing_secret'
          ? 'Set CRON_SECRET in Vercel → Settings → Environment Variables'
          : 'Bearer token must match CRON_SECRET (check for whitespace in Vercel env)',
    })
    return NextResponse.json(
      {
        error: 'Unauthorized',
        reason: auth.reason,
      },
      { status: 401 }
    )
  }

  console.log('[cron/generate-weekly-insights] authorized OK')

  const cronSecret = process.env.CRON_SECRET?.trim()

  const startTime = Date.now()
  const weekStart = toDateStr(getLastMonday())
  const weekEnd = toDateStr(getLastSunday())

  const db = getServerSupabase()

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const cutoff = sevenDaysAgo.toISOString().slice(0, 10)

  const { data: reviewUsers } = await db
    .from('evening_reviews')
    .select('user_id')
    .gte('review_date', cutoff)
  const { data: taskUsers } = await db
    .from('morning_tasks')
    .select('user_id')
    .gte('plan_date', cutoff)

  const activeIds = new Set<string>()
  ;(reviewUsers ?? []).forEach((r: { user_id?: string }) => { if (r.user_id) activeIds.add(r.user_id) })
  ;(taskUsers ?? []).forEach((t: { user_id?: string }) => { if (t.user_id) activeIds.add(t.user_id) })

  const { data: profiles } = await db
    .from('user_profiles')
    .select('id, tier, pro_features_enabled')
    .in('id', Array.from(activeIds))

  const userIds = (profiles ?? [])
    .filter((p: { id: string; tier?: string; pro_features_enabled?: boolean }) =>
      getFeatureAccess({ tier: p.tier, pro_features_enabled: p.pro_features_enabled }).personalWeeklyInsight
    )
    .map((p: { id: string }) => p.id)
  let processed = 0
  let succeeded = 0
  let failed = 0
  const errors: { userId: string; error: string }[] = []

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)

  for (const userId of userIds) {
    try {
      const result = await generateWeeklyInsightForUser(userId, weekStart, weekEnd)
      processed++
      if (result.success) {
        succeeded++
      } else {
        failed++
        if (result.error && result.error !== 'No wins or lessons for week') {
          errors.push({ userId, error: result.error })
        }
      }

      // Generate unseen wins pattern and upsert weekly_insights
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
            const json = await patternRes.json()
            pattern = json.pattern ?? null
          }
        } catch (patternErr) {
          console.warn(`[cron/weekly-insights] Pattern for user ${userId}:`, patternErr)
        }
      }

      const insightText = result.success ? result.insight ?? null : null
      // Always upsert so the week appears in the list (even when no insight/pattern)
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
    } catch (err) {
      processed++
      failed++
      errors.push({ userId, error: err instanceof Error ? err.message : 'Unknown error' })
      console.error(`[cron/weekly-insights] User ${userId}:`, err)
    }
  }

  const totalTime = Date.now() - startTime
  console.log(`[cron/weekly-insights] weekStart=${weekStart} weekEnd=${weekEnd} users=${userIds.length} processed=${processed} succeeded=${succeeded} failed=${failed} timeMs=${totalTime}`)

  return NextResponse.json({
    success: true,
    weekStart,
    weekEnd,
    totalUsers: userIds.length,
    processed,
    succeeded,
    failed,
    errors: errors.slice(0, 20),
    processingTimeMs: totalTime,
  })
}
