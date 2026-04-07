import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/server-supabase'
import { authorizeCronRequest, logCronRequestMeta } from '@/lib/cron-auth'
import { getEligibleUsersForMonthlyInsightCron } from '@/lib/monthly-insight/eligible-users'
import { processMonthlyInsightCronUser } from '@/lib/monthly-insight/process-user'
import { getUtcIsoMonthId } from '@/lib/monthly-insight/utc-iso-month'
import {
  ensureMonthlyInsightMonthRollover,
  getMonthlyInsightCursor,
  isMonthlyInsightBatchCompleteForMonth,
  markMonthlyInsightBatchComplete,
  setMonthlyInsightCursor,
} from '@/lib/monthly-insight/monthly-cron-batch-state'

export const dynamic = 'force-dynamic'
export const revalidate = 0
/** Ensures Vercel uses 300s even if vercel.json glob order changes; pairs with vercel.json entry. */
export const maxDuration = 300

const BATCH_SIZE = 50
const CONCURRENCY = 5

/**
 * Cron: Monthly insights for users on local calendar day 1 (any hour) when not already completed.
 * Schedule (vercel.json): every 5 min, UTC 10:00–23:59 on day 31 and 00:00–14:59 on day 1 (~29h)
 * so all timezones plus retry headroom are covered.
 * Batch + cron_state cursor until the UTC-month wave completes.
 */
export async function GET(request: NextRequest) {
  logCronRequestMeta('cron/generate-monthly-insights', request)

  const auth = authorizeCronRequest(request)
  if (!auth.ok) {
    return NextResponse.json({ error: 'Unauthorized', reason: auth.reason }, { status: 401 })
  }

  const startTime = Date.now()
  const now = new Date()
  const db = getServerSupabase()
  const monthId = getUtcIsoMonthId(now)

  await ensureMonthlyInsightMonthRollover(db, monthId)

  if (await isMonthlyInsightBatchCompleteForMonth(db, monthId)) {
    const totalTime = Date.now() - startTime
    return NextResponse.json({
      success: true,
      mode: 'batched_per_user_timezone',
      skipped: true,
      reason: 'batch_complete_for_utc_month',
      isoMonthId: monthId,
      processingTimeMs: totalTime,
    })
  }

  const eligible = await getEligibleUsersForMonthlyInsightCron(db, now)

  if (eligible.length === 0) {
    const totalTime = Date.now() - startTime
    return NextResponse.json({
      success: true,
      mode: 'batched_per_user_timezone',
      message: 'No eligible users this run',
      eligibleCount: 0,
      isoMonthId: monthId,
      processingTimeMs: totalTime,
    })
  }

  const lastUserId = await getMonthlyInsightCursor(db)
  let startIndex = 0
  if (lastUserId) {
    const idx = eligible.findIndex((u) => u.id === lastUserId)
    startIndex = idx === -1 ? 0 : idx + 1
  }

  if (startIndex >= eligible.length) {
    await markMonthlyInsightBatchComplete(db, monthId)
    const totalTime = Date.now() - startTime
    return NextResponse.json({
      success: true,
      mode: 'batched_per_user_timezone',
      message: 'All eligible users already processed for this wave',
      eligibleCount: eligible.length,
      isoMonthId: monthId,
      batchProcessed: 0,
      succeeded: 0,
      failed: 0,
      remaining: 0,
      processingTimeMs: totalTime,
    })
  }

  const batch = eligible.slice(startIndex, startIndex + BATCH_SIZE)

  type RowResult = { userId: string; success: boolean; error?: string }
  const results: RowResult[] = []

  for (let i = 0; i < batch.length; i += CONCURRENCY) {
    const chunk = batch.slice(i, i + CONCURRENCY)
    const settled = await Promise.allSettled(
      chunk.map(async (user) => {
        const r = await processMonthlyInsightCronUser({
          db,
          userId: user.id,
          timeZone: user.timezone,
          now,
          sendEmail: true,
        })
        return { userId: user.id, success: r.success, error: r.error } satisfies RowResult
      })
    )

    for (let j = 0; j < settled.length; j++) {
      const s = settled[j]
      const userId = chunk[j]?.id ?? 'unknown'
      if (s.status === 'fulfilled') {
        results.push(s.value)
      } else {
        const reason = s.reason instanceof Error ? s.reason.message : String(s.reason)
        results.push({ userId, success: false, error: reason })
      }
    }
  }

  const succeeded = results.filter((r) => r.success).length
  const failed = results.filter((r) => !r.success).length
  const errors = results
    .filter((r) => !r.success && r.error)
    .map((r) => ({ userId: r.userId, error: r.error ?? 'unknown' }))
    .slice(0, 20)

  const nextIndex = startIndex + batch.length
  const remaining = Math.max(0, eligible.length - nextIndex)

  if (nextIndex >= eligible.length) {
    await markMonthlyInsightBatchComplete(db, monthId)
  } else {
    const lastProcessed = batch[batch.length - 1]
    if (lastProcessed) await setMonthlyInsightCursor(db, lastProcessed.id)
  }

  const totalTime = Date.now() - startTime
  console.log(
    `[cron/monthly-insights] month=${monthId} eligible=${eligible.length} batch=${batch.length} startIndex=${startIndex} succeeded=${succeeded} failed=${failed} remaining=${remaining} timeMs=${totalTime}`
  )

  return NextResponse.json({
    success: true,
    mode: 'batched_per_user_timezone',
    isoMonthId: monthId,
    eligibleCount: eligible.length,
    startIndex,
    batchProcessed: batch.length,
    succeeded,
    failed,
    remaining,
    errors,
    processingTimeMs: totalTime,
    batchComplete: nextIndex >= eligible.length,
  })
}
