import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/server-supabase'
import { authorizeCronRequest, logCronRequestMeta } from '@/lib/cron-auth'
import { getEligibleUsersForQuarterlyInsightCron } from '@/lib/quarterly-insight/eligible-users'
import { processQuarterlyInsightCronUser } from '@/lib/quarterly-insight/process-user'
import { getUtcIsoQuarterId } from '@/lib/quarterly-insight/utc-iso-quarter'
import {
  ensureQuarterlyInsightQuarterRollover,
  getQuarterlyInsightCursor,
  isQuarterlyInsightBatchCompleteForQuarter,
  markQuarterlyInsightBatchComplete,
  setQuarterlyInsightCursor,
} from '@/lib/quarterly-insight/quarterly-cron-batch-state'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const BATCH_SIZE = 50
const CONCURRENCY = 5

/**
 * Cron: Quarterly insights for users whose local time is Jan/Apr/Jul/Oct 1st 00:xx.
 * Schedule (vercel.json): every 5 minutes on UTC day 1 of Jan/Apr/Jul/Oct (first field * /5; month field 1,4,7,10).
 * Batch + cron_state cursor until the UTC-quarter wave completes.
 * Does not skip users on Monday 00 local (quarter-start Mondays included).
 */
export async function GET(request: NextRequest) {
  logCronRequestMeta('cron/generate-quarterly-insights', request)

  const auth = authorizeCronRequest(request)
  if (!auth.ok) {
    return NextResponse.json({ error: 'Unauthorized', reason: auth.reason }, { status: 401 })
  }

  const startTime = Date.now()
  const now = new Date()
  const db = getServerSupabase()
  const quarterId = getUtcIsoQuarterId(now)

  await ensureQuarterlyInsightQuarterRollover(db, quarterId)

  if (await isQuarterlyInsightBatchCompleteForQuarter(db, quarterId)) {
    const totalTime = Date.now() - startTime
    return NextResponse.json({
      success: true,
      mode: 'batched_per_user_timezone',
      skipped: true,
      reason: 'batch_complete_for_utc_quarter',
      isoQuarterId: quarterId,
      processingTimeMs: totalTime,
    })
  }

  const eligible = await getEligibleUsersForQuarterlyInsightCron(db, now)

  if (eligible.length === 0) {
    const totalTime = Date.now() - startTime
    return NextResponse.json({
      success: true,
      mode: 'batched_per_user_timezone',
      message: 'No eligible users this run',
      eligibleCount: 0,
      isoQuarterId: quarterId,
      processingTimeMs: totalTime,
    })
  }

  const lastUserId = await getQuarterlyInsightCursor(db)
  let startIndex = 0
  if (lastUserId) {
    const idx = eligible.findIndex((u) => u.id === lastUserId)
    startIndex = idx === -1 ? 0 : idx + 1
  }

  if (startIndex >= eligible.length) {
    await markQuarterlyInsightBatchComplete(db, quarterId)
    const totalTime = Date.now() - startTime
    return NextResponse.json({
      success: true,
      mode: 'batched_per_user_timezone',
      message: 'All eligible users already processed for this wave',
      eligibleCount: eligible.length,
      isoQuarterId: quarterId,
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
        const r = await processQuarterlyInsightCronUser({
          db,
          userId: user.id,
          timeZone: user.timezone,
          now,
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
    await markQuarterlyInsightBatchComplete(db, quarterId)
  } else {
    const lastProcessed = batch[batch.length - 1]
    if (lastProcessed) await setQuarterlyInsightCursor(db, lastProcessed.id)
  }

  const totalTime = Date.now() - startTime
  console.log(
    `[cron/quarterly-insights] quarter=${quarterId} eligible=${eligible.length} batch=${batch.length} startIndex=${startIndex} succeeded=${succeeded} failed=${failed} remaining=${remaining} timeMs=${totalTime}`
  )

  return NextResponse.json({
    success: true,
    mode: 'batched_per_user_timezone',
    isoQuarterId: quarterId,
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
