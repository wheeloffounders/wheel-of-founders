import type { SupabaseClient } from '@supabase/supabase-js'
import { format, subDays } from 'date-fns'

function uniqueCount(rows: { user_id?: string | null }[]): number {
  const s = new Set<string>()
  for (const r of rows) {
    if (r.user_id) s.add(r.user_id)
  }
  return s.size
}

/**
 * Aggregates for /admin analytics "Tracking" tab (service-role client).
 */
export async function buildTrackingMetrics(db: SupabaseClient, days: number) {
  const daysClamped = Math.min(Math.max(days, 1), 90)
  const sinceIso = subDays(new Date(), daysClamped).toISOString()
  const sinceDate = format(subDays(new Date(), daysClamped), 'yyyy-MM-dd')
  const startOfTodayUtc = new Date()
  startOfTodayUtc.setUTCHours(0, 0, 0, 0)

  const [
    pageViewsToday,
    morningRows,
    eveningRows,
    calSubCount,
    calSubsBySource,
    calSubsRecent,
    feedRequestsRecent,
    sessionSources,
    emailLogsSent,
    emailOpens,
  ] = await Promise.all([
    (db.from('page_views') as any)
      .select('user_id')
      .gte('entered_at', startOfTodayUtc.toISOString())
      .not('user_id', 'is', null)
      .limit(50000),
    (db.from('morning_tasks') as any)
      .select('user_id, plan_date')
      .gte('plan_date', sinceDate),
    (db.from('evening_reviews') as any)
      .select('user_id, review_date')
      .gte('review_date', sinceDate),
    (db.from('calendar_subscriptions') as any)
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true),
    (db.from('calendar_subscriptions') as any)
      .select('source')
      .eq('is_active', true),
    (db.from('calendar_subscriptions') as any)
      .select('created_at, source')
      .gte('created_at', sinceIso)
      .order('created_at', { ascending: true }),
    (db.from('calendar_feed_requests') as any)
      .select('*', { count: 'exact', head: true })
      .gte('requested_at', sinceIso),
    (db.from('session_source_events') as any)
      .select('source')
      .gte('created_at', sinceIso),
    (db.from('email_logs') as any)
      .select('id, email_type, type, sent_at')
      .gte('sent_at', sinceIso),
    (db.from('email_events') as any)
      .select('email_log_id, event_type, created_at')
      .eq('event_type', 'opened')
      .gte('created_at', sinceIso),
  ])

  let retentionData: Record<string, unknown> | null = null
  let retentionRpcError: { message?: string } | null = null
  try {
    const r = await db.rpc('admin_tracking_day_retention')
    retentionData = (r.data ?? null) as Record<string, unknown> | null
    retentionRpcError = r.error
  } catch (e) {
    retentionRpcError = { message: e instanceof Error ? e.message : String(e) }
  }

  const pvToday = (pageViewsToday.data ?? []) as { user_id?: string }[]
  const dau = uniqueCount(pvToday)

  const morning = (morningRows.data ?? []) as { user_id?: string; plan_date?: string }[]
  const evening = (eveningRows.data ?? []) as { user_id?: string; review_date?: string }[]

  const morningUsers7d = uniqueCount(morning)
  const eveningUsers7d = uniqueCount(evening)

  const distinctDaysWithMorning = new Set(morning.map((m) => m.plan_date).filter(Boolean)).size
  const distinctDaysWithEvening = new Set(evening.map((e) => e.review_date).filter(Boolean)).size

  const subsBySourceMap: Record<string, number> = {}
  for (const r of (calSubsBySource.data ?? []) as { source?: string }[]) {
    const k = r.source ?? 'unknown'
    subsBySourceMap[k] = (subsBySourceMap[k] ?? 0) + 1
  }

  const subsTimelineMap: Record<string, number> = {}
  for (const r of (calSubsRecent.data ?? []) as { created_at?: string }[]) {
    const d = r.created_at?.slice(0, 10) ?? ''
    if (!d) continue
    subsTimelineMap[d] = (subsTimelineMap[d] ?? 0) + 1
  }
  const calendarSubscriptionsOverTime = Object.entries(subsTimelineMap)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date))

  const sessionSourceMap: Record<string, number> = {}
  for (const r of (sessionSources.data ?? []) as { source?: string }[]) {
    const k = r.source ?? 'unknown'
    sessionSourceMap[k] = (sessionSourceMap[k] ?? 0) + 1
  }
  const sessionSourceBreakdown = Object.entries(sessionSourceMap).map(([name, value]) => ({
    name,
    value,
  }))

  const logs = (emailLogsSent.data ?? []) as { id?: string; email_type?: string; type?: string }[]
  const opens = (emailOpens.data ?? []) as { email_log_id?: string }[]
  const openSet = new Set(opens.map((o) => o.email_log_id).filter(Boolean) as string[])
  const sent = logs.length
  const openCount = logs.filter((l) => l.id && openSet.has(l.id)).length
  const emailOpenRatePct = sent > 0 ? Math.round((openCount / sent) * 1000) / 10 : 0

  const clicksRes = await (db.from('email_events') as any)
    .select('email_log_id')
    .eq('event_type', 'clicked')
    .gte('created_at', sinceIso)
  const clicks = (clicksRes.data ?? []) as { email_log_id?: string }[]
  const clickSet = new Set(clicks.map((c) => c.email_log_id).filter(Boolean) as string[])
  const clickCount = logs.filter((l) => l.id && clickSet.has(l.id)).length
  const emailClickRatePct = sent > 0 ? Math.round((clickCount / sent) * 1000) / 10 : 0

  const byTypeMap: Record<string, { sent: number; opens: number; clicks: number }> = {}
  for (const l of logs) {
    const t = l.email_type ?? l.type ?? 'unknown'
    if (!byTypeMap[t]) byTypeMap[t] = { sent: 0, opens: 0, clicks: 0 }
    byTypeMap[t].sent++
    if (l.id && openSet.has(l.id)) byTypeMap[t].opens++
    if (l.id && clickSet.has(l.id)) byTypeMap[t].clicks++
  }
  const emailByType = Object.entries(byTypeMap).map(([email_type, v]) => ({
    email_type,
    sent: v.sent,
    opens: v.opens,
    clicks: v.clicks,
    open_rate_pct: v.sent > 0 ? Math.round((v.opens / v.sent) * 1000) / 10 : 0,
    click_rate_pct: v.sent > 0 ? Math.round((v.clicks / v.sent) * 1000) / 10 : 0,
  }))

  const retention = retentionData
  const retentionError = retentionRpcError

  return {
    windowDays: daysClamped,
    dau,
    morningDistinctUsers: morningUsers7d,
    eveningDistinctUsers: eveningUsers7d,
    distinctDaysWithMorning,
    distinctDaysWithEvening,
    calendarActiveSubscribers: calSubCount.count ?? 0,
    calendarSubscriptionsBySource: Object.entries(subsBySourceMap).map(([source, count]) => ({
      source,
      count,
    })),
    calendarSubscriptionsOverTime,
    calendarFeedRequestsInWindow: feedRequestsRecent.count ?? 0,
    sessionSourceBreakdown,
    emailSentInWindow: sent,
    emailOpensInWindow: openCount,
    emailClicksInWindow: clickCount,
    emailOpenRatePct,
    emailClickRatePct,
    emailByType,
    retention: retention ?? {
      cohort_users: 0,
      d1_pct: 0,
      d3_pct: 0,
      d7_pct: 0,
      d30_pct: 0,
    },
    retentionError: retentionError && 'message' in retentionError ? retentionError.message ?? null : null,
  }
}
