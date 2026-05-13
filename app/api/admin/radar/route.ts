import { NextResponse } from 'next/server'
import { format, subDays } from 'date-fns'
import { getServerSession } from '@/lib/server-auth'
import { isWhitelistAdminEmail } from '@/lib/admin-emails'
import { deriveInboundTouchLabel } from '@/lib/radar-inbound-label'
import { serverSupabase } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type FunnelRow = { funnel_id: string; event_type: string }

type HttpMeta = { httpStatus?: number; httpStatusText?: string }

/** Log PostgREST errors: structured fields first, then full object (empty message/code is common for client/config issues). */
function logRadarQueryError(scope: string, err: unknown, meta?: HttpMeta) {
  if (err == null) return
  const e = err as {
    message?: string
    code?: string
    details?: string
    hint?: string
  }
  console.error(`[admin/radar] ${scope} (summary)`, {
    message: e.message,
    code: e.code,
    details: e.details,
    hint: e.hint,
    httpStatus: meta?.httpStatus,
    httpStatusText: meta?.httpStatusText,
  })
  console.error(`[admin/radar] ${scope} (full object, console.dir)`)
  console.dir(err, { depth: null })
}

/**
 * Prefer is_pro_trial + future trial_ends_at (migration 144 + 135). If that fails—often missing
 * is_pro_trial column—fall back to counting future trial_ends_at only so the rest of the dashboard still loads.
 */
async function countActiveProTrials(db: ReturnType<typeof serverSupabase>) {
  const now = new Date().toISOString()
  const primary = await db
    .from('user_profiles')
    .select('id', { count: 'exact', head: true })
    .eq('is_pro_trial', true)
    .gt('trial_ends_at', now)

  if (!primary.error) {
    return { count: primary.count ?? 0, approximate: false as const, warning: undefined as string | undefined }
  }

  logRadarQueryError('active_pro_trials (is_pro_trial + trial_ends_at)', primary.error, {
    httpStatus: primary.status,
    httpStatusText: primary.statusText,
  })

  const fallback = await db
    .from('user_profiles')
    .select('id', { count: 'exact', head: true })
    .gt('trial_ends_at', now)

  if (!fallback.error) {
    return {
      count: fallback.count ?? 0,
      approximate: true as const,
      warning:
        'Using trial_ends_at-only count. Run migration 144_user_profiles_is_pro_trial.sql so active trials match blog-trial intent (is_pro_trial).',
    }
  }

  logRadarQueryError('active_pro_trials (fallback trial_ends_at only)', fallback.error, {
    httpStatus: fallback.status,
    httpStatusText: fallback.statusText,
  })

  return {
    count: null as null,
    approximate: false as const,
    warning: undefined as string | undefined,
    primaryError: primary.error,
    fallbackError: fallback.error,
  }
}

function inboundLabelFromSnapshot(snap: unknown): string {
  if (!snap || typeof snap !== 'object' || Array.isArray(snap)) {
    return '—'
  }
  const o = snap as Record<string, unknown>
  const tl = typeof o.touch_label === 'string' ? o.touch_label.trim() : ''
  if (tl.length > 0) return tl.slice(0, 128)
  return deriveInboundTouchLabel({
    utm_source: typeof o.utm_source === 'string' ? o.utm_source : '',
    referrer: typeof o.referrer === 'string' ? o.referrer : '',
  })
}

function compactErr(err: unknown): { message: string; code?: string } | null {
  if (err == null) return null
  if (typeof err === 'string') return { message: err }
  const e = err as { message?: string; code?: string }
  if (typeof e.message === 'string' && e.message.length > 0) {
    return e.code ? { message: e.message, code: e.code } : { message: e.message }
  }
  return {
    message: `Empty message on error object (see terminal console.dir for ${Object.prototype.toString.call(err)})`,
    ...(typeof e.code === 'string' && e.code.length > 0 ? { code: e.code } : {}),
  }
}

async function assertAdmin(): Promise<{ ok: true; userId: string } | { ok: false; status: number }> {
  const session = await getServerSession()
  if (!session?.user?.id) return { ok: false, status: 401 }
  const db = serverSupabase()
  const { data: profile } = await db
    .from('user_profiles')
    .select('is_admin')
    .eq('id', session.user.id)
    .maybeSingle()
  const allow = !!(profile as { is_admin?: boolean } | null)?.is_admin || isWhitelistAdminEmail(session.user.email)
  if (!allow) return { ok: false, status: 403 }
  return { ok: true, userId: session.user.id }
}

export async function GET() {
  try {
    const gate = await assertAdmin()
    if (!gate.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: gate.status })

    console.log('[admin/radar] SUPABASE_SERVICE_ROLE_KEY loaded:', Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY))
    console.log('[admin/radar] NEXT_PUBLIC_SUPABASE_URL loaded:', Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL))
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
    if (supabaseUrl.length > 0) {
      console.log(
        '[admin/radar] NEXT_PUBLIC_SUPABASE_URL ends with slash (can break requests):',
        supabaseUrl.endsWith('/')
      )
    }

    const db = serverSupabase()
    const since = subDays(new Date(), 30)
    const sinceIso = since.toISOString()
    const todayStart = `${format(new Date(), 'yyyy-MM-dd')}T00:00:00.000Z`

    const [trialsResult, signupsRes, funnelRes, recentConvRes] = await Promise.all([
      countActiveProTrials(db),
      db
        .from('user_profiles')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', todayStart),
      db.from('funnel_analytics').select('funnel_id, event_type').gte('created_at', sinceIso),
      db
        .from('funnel_analytics')
        .select('funnel_id, created_at, source, visitor_id, inbound_snapshot')
        .eq('event_type', 'conversion')
        .gte('created_at', sinceIso)
        .order('created_at', { ascending: false })
        .limit(50),
    ])

    const signupErr = signupsRes.error
    const funnelErr = funnelRes.error
    const recentConvErr = recentConvRes.error

    if (trialsResult.count === null) {
      logRadarQueryError('signups_today count', signupErr, {
        httpStatus: signupsRes.status,
        httpStatusText: signupsRes.statusText,
      })
      logRadarQueryError('funnel_analytics select', funnelErr, {
        httpStatus: funnelRes.status,
        httpStatusText: funnelRes.statusText,
      })
      logRadarQueryError('funnel_analytics recent conversions', recentConvErr, {
        httpStatus: recentConvRes.status,
        httpStatusText: recentConvRes.statusText,
      })

      const isLocalDev = process.env.NODE_ENV === 'development'
      return NextResponse.json(
        {
          error: 'Query failed',
          hint: isLocalDev
            ? 'Active trials query failed after fallback. Check terminal for httpStatus + console.dir. Typical fixes: run migrations 135_user_profiles_trial_window.sql and 144_user_profiles_is_pro_trial.sql.'
            : 'Check server logs for [admin/radar] entries.',
          ...(isLocalDev
            ? {
                queries: {
                  active_pro_trials_primary: compactErr(trialsResult.primaryError),
                  active_pro_trials_fallback: compactErr(trialsResult.fallbackError),
                  signups_today: compactErr(signupErr),
                  funnel_events: compactErr(funnelErr),
                  recent_conversions: compactErr(recentConvErr),
                },
              }
            : {}),
        },
        { status: 500 }
      )
    }

    if (signupErr || funnelErr || recentConvErr) {
      logRadarQueryError('signups_today count', signupErr, {
        httpStatus: signupsRes.status,
        httpStatusText: signupsRes.statusText,
      })
      logRadarQueryError('funnel_analytics select', funnelErr, {
        httpStatus: funnelRes.status,
        httpStatusText: funnelRes.statusText,
      })
      logRadarQueryError('funnel_analytics recent conversions', recentConvErr, {
        httpStatus: recentConvRes.status,
        httpStatusText: recentConvRes.statusText,
      })

      const isLocalDev = process.env.NODE_ENV === 'development'
      return NextResponse.json(
        {
          error: 'Query failed',
          hint: isLocalDev
            ? 'Check terminal for [admin/radar] logs. Typical fixes: run migrations 146 and 147 (inbound_snapshot), confirm SUPABASE_SERVICE_ROLE_KEY on this environment.'
            : 'Check server logs for [admin/radar] entries.',
          ...(isLocalDev
            ? {
                queries: {
                  signups_today: compactErr(signupErr),
                  funnel_events: compactErr(funnelErr),
                  recent_conversions: compactErr(recentConvErr),
                },
              }
            : {}),
        },
        { status: 500 }
      )
    }

    const activeTrials = trialsResult.count
    const signupsToday = signupsRes.count
    const funnelRows = funnelRes.data

    type RecentConvRow = {
      funnel_id: string
      created_at: string
      source: string
      visitor_id: string
      inbound_snapshot: unknown
    }
    const recentRows = (recentConvRes.data ?? []) as RecentConvRow[]
    const recent_conversions = recentRows.map((r) => ({
      funnel_id: r.funnel_id,
      created_at: r.created_at,
      surface: r.source,
      visitor_id: r.visitor_id,
      inbound_source: inboundLabelFromSnapshot(r.inbound_snapshot),
    }))

    const rows = (funnelRows ?? []) as FunnelRow[]
    let starts = 0
    let completes = 0
    const byFunnel: Record<string, { start: number; complete: number; conversion: number }> = {}

    for (const r of rows) {
      const fid = r.funnel_id
      if (!byFunnel[fid]) byFunnel[fid] = { start: 0, complete: 0, conversion: 0 }
      if (r.event_type === 'start') {
        starts += 1
        byFunnel[fid].start += 1
      } else if (r.event_type === 'complete') {
        completes += 1
        byFunnel[fid].complete += 1
      } else if (r.event_type === 'conversion') {
        byFunnel[fid].conversion += 1
      }
    }

    const diagnosticCompletionRate = starts === 0 ? null : Math.round((completes / starts) * 1000) / 10

    const leaderboard = Object.entries(byFunnel)
      .map(([funnel_id, v]) => {
        const completeToConversion = v.complete > 0 ? v.conversion / v.complete : 0
        return {
          funnel_id,
          starts: v.start,
          completes: v.complete,
          conversions: v.conversion,
          complete_to_conversion: Math.round(completeToConversion * 1000) / 10,
          start_to_complete_pct: v.start > 0 ? Math.round((v.complete / v.start) * 1000) / 10 : 0,
        }
      })
      .sort((a, b) => b.complete_to_conversion - a.complete_to_conversion)

    const radar_warnings = trialsResult.approximate && trialsResult.warning ? [trialsResult.warning] : undefined

    return NextResponse.json({
      window_days: 30,
      active_pro_trials: activeTrials,
      active_pro_trials_approximate: trialsResult.approximate ? true : undefined,
      ...(radar_warnings ? { radar_warnings } : {}),
      signups_today: signupsToday ?? 0,
      diagnostic_completion_rate_pct: diagnosticCompletionRate,
      funnel_starts_30d: starts,
      funnel_completes_30d: completes,
      leaderboard,
      recent_conversions,
    })
  } catch (handlerErr) {
    console.error('[admin/radar] unexpected handler failure (summary)', handlerErr)
    console.error('[admin/radar] unexpected handler failure (full)')
    console.dir(handlerErr, { depth: null })
    return NextResponse.json(
      {
        error: 'Radar handler failed',
        hint:
          process.env.NODE_ENV === 'development'
            ? 'See terminal for console.dir output. Often thrown before DB (bad import, missing env at runtime).'
            : 'See server logs for [admin/radar] unexpected handler failure.',
      },
      { status: 500 }
    )
  }
}
