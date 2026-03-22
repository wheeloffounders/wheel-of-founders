import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/server-supabase'
import { authorizeCronRequest, logCronRequestMeta } from '@/lib/cron-auth'
import { getLastMonday, toDateStr } from '@/lib/date-utils'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const WEEKLY_CRON_SCHEDULE_UTC = '0 0 * * 1'
const WEEKLY_CRON_LABEL = 'Monday 00:00 UTC (previous Mon–Sun week)'

/**
 * Ops / debugging: cron health hints. Requires Bearer CRON_SECRET.
 * Does not prove Vercel invoked the cron — check Vercel Dashboard → Crons for executions.
 */
export async function GET(request: NextRequest) {
  logCronRequestMeta('cron/status', request)

  const auth = authorizeCronRequest(request)
  if (!auth.ok) {
    return NextResponse.json({ error: 'Unauthorized', reason: auth.reason }, { status: 401 })
  }

  const db = getServerSupabase()
  const expectedLastWeekStart = toDateStr(getLastMonday())

  const { data: latestRow, error: latestErr } = await db
    .from('weekly_insights')
    .select('generated_at, week_start, user_id')
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const latest = latestRow as { generated_at?: string; week_start?: string } | null

  const { count: rowsForTargetWeek } = await db
    .from('weekly_insights')
    .select('user_id', { count: 'exact', head: true })
    .eq('week_start', expectedLastWeekStart)

  const lastGen = latest?.generated_at ? new Date(latest.generated_at).getTime() : null
  const ageMs = lastGen ? Date.now() - lastGen : null
  const staleDays = ageMs != null ? ageMs / (24 * 60 * 60 * 1000) : null
  /** Heuristic: no row or newest row older than 8 days → worth investigating */
  const looksUnhealthy = !lastGen || (staleDays != null && staleDays > 8)

  // Optional: ?notify=1 sends one Sentry signal when unhealthy (avoid spamming on every poll).
  if (looksUnhealthy && request.nextUrl.searchParams.get('notify') === '1') {
    try {
      const Sentry = await import('@sentry/nextjs')
      Sentry.captureMessage('Weekly insights data looks stale (cron/status?notify=1)', {
        level: 'warning',
        tags: { feature: 'weekly-cron-health' },
        extra: {
          lastGeneratedAt: latest?.generated_at ?? null,
          expectedLastWeekStart,
          rowsForTargetWeek: rowsForTargetWeek ?? 0,
        },
      })
    } catch {
      // Sentry optional
    }
  }

  return NextResponse.json({
    healthy: !looksUnhealthy,
    cronSecretConfigured: true,
    weeklyCron: {
      vercelJsonPath: '/api/cron/generate-weekly-insights',
      scheduleCronUTC: WEEKLY_CRON_SCHEDULE_UTC,
      description: WEEKLY_CRON_LABEL,
    },
    expectedLastCompletedWeekStart: expectedLastWeekStart,
    rowsForThatWeekCount: rowsForTargetWeek ?? 0,
    latestWeeklyInsightRow: latest
      ? { generated_at: latest.generated_at, week_start: latest.week_start }
      : null,
    latestRowQueryError: latestErr?.message ?? null,
    note:
      'latestWeeklyInsightRow is the newest row in weekly_insights (any user), not the cron log. Verify executions in Vercel → Crons.',
    dashboardHint: 'Vercel → Project → Settings → Cron Jobs → last execution / failures',
  })
}
