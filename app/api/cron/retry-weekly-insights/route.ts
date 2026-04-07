import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/server-supabase'
import { generateWeeklyInsightForUser } from '@/lib/batch-weekly-insight'
import { authorizeCronRequest, logCronRequestMeta } from '@/lib/cron-auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const maxDuration = 300

/**
 * Cron: Retry failed weekly insights with backoff.
 * Runs on Vercel schedule (see vercel.json).
 */
export async function GET(request: NextRequest) {
  logCronRequestMeta('cron/retry-weekly-insights', request)
  const auth = authorizeCronRequest(request)
  if (!auth.ok) {
    console.warn('[cron/retry-weekly-insights] UNAUTHORIZED', { reason: auth.reason })
    return NextResponse.json({ error: 'Unauthorized', reason: auth.reason }, { status: 401 })
  }

  const db = getServerSupabase()
  const now = new Date().toISOString()

  const { data: rows, error } = await db
    .from('weekly_insights')
    .select('user_id, week_start, week_end, retry_count')
    .eq('status', 'failed')
    .lt('retry_count', 3)
    .lte('next_retry_at', now)
    .limit(50)

  if (error) {
    console.error('[cron/retry-weekly-insights] Failed to fetch rows:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  const toRetry = (rows ?? []) as {
    user_id: string
    week_start: string
    week_end: string
    retry_count: number
  }[]

  let processed = 0
  let succeeded = 0
  let failed = 0

  for (const row of toRetry) {
    processed++
    const currentAttempt = (row.retry_count ?? 0) + 1

    try {
      const result = await generateWeeklyInsightForUser(row.user_id, row.week_start, row.week_end)

      if (result.success) {
        succeeded++
        await (db.from('weekly_insights') as any)
          .update({
            status: 'completed',
            retry_count: currentAttempt,
            next_retry_at: null,
            generated_at: new Date().toISOString(),
          })
          .eq('user_id', row.user_id)
          .eq('week_start', row.week_start)
      } else {
        failed++
        const isFinal = currentAttempt >= 3
        await (db.from('weekly_insights') as any)
          .update({
            status: isFinal ? 'permanent_failed' : 'failed',
            retry_count: currentAttempt,
            next_retry_at: isFinal
              ? null
              : new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          })
          .eq('user_id', row.user_id)
          .eq('week_start', row.week_start)
      }
    } catch (err) {
      failed++
      const isFinal = (row.retry_count ?? 0) + 1 >= 3
      console.error('[cron/retry-weekly-insights] Retry error:', {
        userId: row.user_id,
        weekStart: row.week_start,
        error: err,
      })
      await (db.from('weekly_insights') as any)
        .update({
          status: isFinal ? 'permanent_failed' : 'failed',
          retry_count: currentAttempt,
          next_retry_at: isFinal
            ? null
            : new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        })
        .eq('user_id', row.user_id)
        .eq('week_start', row.week_start)
    }
  }

  return NextResponse.json({
    success: true,
    processed,
    succeeded,
    failed,
  })
}

