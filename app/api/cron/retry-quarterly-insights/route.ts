import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/server-supabase'
import { generateQuarterlyInsightForUser } from '@/lib/batch-quarterly-insight'
import { authorizeCronRequest, logCronRequestMeta } from '@/lib/cron-auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Cron: Retry failed quarterly insights with backoff (see quarterly_insights.status / retry_count).
 * Schedule: vercel.json (every 6h like weekly retry).
 */
export async function GET(request: NextRequest) {
  logCronRequestMeta('cron/retry-quarterly-insights', request)
  const auth = authorizeCronRequest(request)
  if (!auth.ok) {
    console.warn('[cron/retry-quarterly-insights] UNAUTHORIZED', { reason: auth.reason })
    return NextResponse.json({ error: 'Unauthorized', reason: auth.reason }, { status: 401 })
  }

  const db = getServerSupabase()
  const nowIso = new Date().toISOString()

  const { data: rows, error } = await db
    .from('quarterly_insights')
    .select('user_id, quarter_start, quarter_end, retry_count')
    .eq('status', 'failed')
    .lt('retry_count', 3)
    .lte('next_retry_at', nowIso)
    .limit(50)

  if (error) {
    console.error('[cron/retry-quarterly-insights] Failed to fetch rows:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  const toRetry = (rows ?? []) as {
    user_id: string
    quarter_start: string
    quarter_end: string
    retry_count: number
  }[]

  let processed = 0
  let succeeded = 0
  let failed = 0

  for (const row of toRetry) {
    processed++
    const currentAttempt = (row.retry_count ?? 0) + 1
    const quarterStart = row.quarter_start.slice(0, 10)
    const quarterEnd = row.quarter_end.slice(0, 10)

    try {
      const result = await generateQuarterlyInsightForUser(row.user_id, quarterStart, quarterEnd)

      if (result.success) {
        succeeded++
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (db.from('quarterly_insights') as any)
          .update({
            status: 'completed',
            retry_count: currentAttempt,
            next_retry_at: null,
            generated_at: new Date().toISOString(),
            insight_text: result.insight ?? null,
          })
          .eq('user_id', row.user_id)
          .eq('quarter_start', quarterStart)
      } else {
        failed++
        const isFinal = currentAttempt >= 3
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (db.from('quarterly_insights') as any)
          .update({
            status: isFinal ? 'permanent_failed' : 'failed',
            retry_count: currentAttempt,
            next_retry_at: isFinal ? null : new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          })
          .eq('user_id', row.user_id)
          .eq('quarter_start', quarterStart)
      }
    } catch (err) {
      failed++
      const isFinal = (row.retry_count ?? 0) + 1 >= 3
      console.error('[cron/retry-quarterly-insights] Retry error:', {
        userId: row.user_id,
        quarterStart,
        error: err,
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (db.from('quarterly_insights') as any)
        .update({
          status: isFinal ? 'permanent_failed' : 'failed',
          retry_count: currentAttempt,
          next_retry_at: isFinal ? null : new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        })
        .eq('user_id', row.user_id)
        .eq('quarter_start', quarterStart)
    }
  }

  return NextResponse.json({
    success: true,
    processed,
    succeeded,
    failed,
  })
}
