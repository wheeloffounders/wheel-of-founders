import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/server-supabase'
import { getFeatureAccess } from '@/lib/features'
import { getQuarterStart, getQuarterEnd, toDateStr } from '@/lib/date-utils'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Cron: Generate quarterly insights for all active users.
 * Runs Jan 1, Apr 1, Jul 1, Oct 1 at 00:00 UTC. Generates for the previous quarter.
 * Secured by CRON_SECRET.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startTime = Date.now()
  const quarterStart = toDateStr(getQuarterStart())
  const quarterEnd = toDateStr(getQuarterEnd())

  const db = getServerSupabase()

  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
  const cutoff = ninetyDaysAgo.toISOString().slice(0, 10)

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
      getFeatureAccess({ tier: p.tier, pro_features_enabled: p.pro_features_enabled }).personalMonthlyInsight
    )
    .map((p: { id: string }) => p.id)

  let processed = 0
  let succeeded = 0
  let failed = 0
  const errors: { userId: string; error: string }[] = []

  const { generateQuarterlyInsightForUser } = await import('@/lib/batch-quarterly-insight')

  for (const userId of userIds) {
    try {
      const result = await generateQuarterlyInsightForUser(userId, quarterStart, quarterEnd)
      processed++
      if (result.success) {
        succeeded++
      } else {
        failed++
        if (result.error) errors.push({ userId, error: result.error })
      }
    } catch (err) {
      processed++
      failed++
      errors.push({ userId, error: err instanceof Error ? err.message : 'Unknown error' })
      console.error(`[cron/quarterly-insights] User ${userId}:`, err)
    }
  }

  const totalTime = Date.now() - startTime
  console.log(`[cron/quarterly-insights] quarterStart=${quarterStart} quarterEnd=${quarterEnd} users=${userIds.length} processed=${processed} succeeded=${succeeded} failed=${failed} timeMs=${totalTime}`)

  return NextResponse.json({
    success: true,
    quarterStart,
    quarterEnd,
    totalUsers: userIds.length,
    processed,
    succeeded,
    failed,
    errors: errors.slice(0, 20),
    processingTimeMs: totalTime,
  })
}
