import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { getServerSupabase } from '@/lib/server-supabase'
import { authorizeCronRequest, logCronRequestMeta } from '@/lib/cron-auth'
import { getEligibleUsersForWeeklyInsight } from '@/lib/weekly-insight/eligible-users'
import { processUserWeeklyInsight } from '@/lib/weekly-insight/process-user'
import { getUtcIsoWeekId } from '@/lib/weekly-insight/utc-iso-week'
import {
  ensureWeeklyInsightWeekRollover,
  getWeeklyInsightCursor,
  isWeeklyInsightBatchCompleteForWeek,
  markWeeklyInsightBatchComplete,
  setWeeklyInsightCursor,
} from '@/lib/weekly-insight/weekly-cron-batch-state'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const BATCH_SIZE = 50
const CONCURRENCY = 5

/**
 * Cron: Generate weekly insights for active users whose local time is Monday 00:xx.
 * Schedule: every 5 minutes (see vercel.json) — each run processes up to BATCH_SIZE users,
 * continuing from cron_state until the eligible list for this UTC ISO week is exhausted.
 * Secured by CRON_SECRET (Bearer).
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
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)

  const startTime = Date.now()
  const now = new Date()
  const db = getServerSupabase()
  const weekId = getUtcIsoWeekId(now)

  await ensureWeeklyInsightWeekRollover(db, weekId)

  if (await isWeeklyInsightBatchCompleteForWeek(db, weekId)) {
    const totalTime = Date.now() - startTime
    console.log(
      `[cron/generate-weekly-insights] skip: batch already complete for ${weekId} (${totalTime}ms)`
    )
    return NextResponse.json({
      success: true,
      mode: 'batched_per_user_timezone',
      skipped: true,
      reason: 'batch_complete_for_iso_week',
      isoWeekId: weekId,
      processingTimeMs: totalTime,
    })
  }

  const eligible = await getEligibleUsersForWeeklyInsight(db, now)

  if (eligible.length === 0) {
    const totalTime = Date.now() - startTime
    return NextResponse.json({
      success: true,
      mode: 'batched_per_user_timezone',
      message: 'No eligible users this run',
      eligibleCount: 0,
      isoWeekId: weekId,
      processingTimeMs: totalTime,
    })
  }

  const lastUserId = await getWeeklyInsightCursor(db)
  let startIndex = 0
  if (lastUserId) {
    const idx = eligible.findIndex((u) => u.id === lastUserId)
    startIndex = idx === -1 ? 0 : idx + 1
  }

  if (startIndex >= eligible.length) {
    await markWeeklyInsightBatchComplete(db, weekId)
    const totalTime = Date.now() - startTime
    console.log(
      `[cron/generate-weekly-insights] cursor past end; marked complete for ${weekId} (${totalTime}ms)`
    )
    return NextResponse.json({
      success: true,
      mode: 'batched_per_user_timezone',
      message: 'All eligible users already processed for this wave',
      eligibleCount: eligible.length,
      isoWeekId: weekId,
      batchProcessed: 0,
      succeeded: 0,
      failed: 0,
      remaining: 0,
      processingTimeMs: totalTime,
    })
  }

  const batch = eligible.slice(startIndex, startIndex + BATCH_SIZE)

  type RowResult = { userId: string; success: boolean; error?: string; skippedNoContent?: boolean }
  const results: RowResult[] = []

  for (let i = 0; i < batch.length; i += CONCURRENCY) {
    const chunk = batch.slice(i, i + CONCURRENCY)
    const settled = await Promise.allSettled(
      chunk.map(async (user) => {
        const r = await processUserWeeklyInsight({
          db,
          userId: user.id,
          timeZone: user.timezone,
          now,
          cronSecret,
          appUrl,
        })
        return {
          userId: user.id,
          success: r.success,
          error: r.error,
          skippedNoContent: r.skippedNoContent,
        } satisfies RowResult
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
    .filter((r) => !r.success && r.error && r.error !== 'No wins or lessons for week')
    .map((r) => ({ userId: r.userId, error: r.error ?? 'unknown' }))
    .slice(0, 20)

  const nextIndex = startIndex + batch.length
  const remaining = Math.max(0, eligible.length - nextIndex)

  if (nextIndex >= eligible.length) {
    await markWeeklyInsightBatchComplete(db, weekId)
  } else {
    const lastProcessed = batch[batch.length - 1]
    if (lastProcessed) await setWeeklyInsightCursor(db, lastProcessed.id)
  }

  const totalTime = Date.now() - startTime
  console.log(
    `[cron/generate-weekly-insights] week=${weekId} eligible=${eligible.length} batch=${batch.length} startIndex=${startIndex} succeeded=${succeeded} failed=${failed} remaining=${remaining} timeMs=${totalTime}`
  )

  return NextResponse.json({
    success: true,
    mode: 'batched_per_user_timezone',
    isoWeekId: weekId,
    eligibleCount: eligible.length,
    startIndex,
    batchProcessed: batch.length,
    succeeded,
    failed,
    remaining,
    skippedNoContent: results.filter((r) => r.skippedNoContent).length,
    errors,
    processingTimeMs: totalTime,
    batchComplete: nextIndex >= eligible.length,
  })
}
