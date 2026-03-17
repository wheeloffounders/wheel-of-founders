import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { isAdmin, isDevelopment } from '@/lib/admin'
import { serverSupabase } from '@/lib/supabase/server'
import { adminSupabase } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSessionFromRequest(req)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    if (!isDevelopment() && !(await isAdmin(session.user.id))) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') as
      | 'failed'
      | 'permanent_failed'
      | 'all'
      | null
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 200)

    const db = serverSupabase()
    const admin = adminSupabase
    if (!admin) {
      return NextResponse.json({ error: 'Admin client not configured' }, { status: 500 })
    }

    // 1. Fetch failed / permanently failed weekly_insights
    let query = db
      .from('weekly_insights')
      .select('user_id, week_start, week_end, status, retry_count, next_retry_at, generated_at')
      .order('week_start', { ascending: false })
      .limit(limit)

    if (status === 'failed') {
      query = query.eq('status', 'failed')
    } else if (status === 'permanent_failed') {
      query = query.eq('status', 'permanent_failed')
    } else {
      query = query.in('status', ['failed', 'permanent_failed'])
    }

    const { data: rows, error } = await query
    if (error) {
      console.error('[admin/weekly-insights/errors] weekly_insights query failed:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const insights = (rows ?? []) as {
      user_id: string
      week_start: string
      week_end: string
      status: string
      retry_count: number | null
      next_retry_at: string | null
      generated_at: string | null
    }[]

    if (insights.length === 0) {
      return NextResponse.json({ errors: [], total: 0 })
    }

    const userIds = [...new Set(insights.map((r) => r.user_id))]

    // 2. Fetch user emails from auth via adminSupabase
    const { data: authUsers, error: authError } = await admin.auth.admin.listUsers({
      perPage: 500,
    })
    if (authError) {
      console.error('[admin/weekly-insights/errors] auth.admin.listUsers error:', authError)
    }
    const authMap = new Map(
      (authUsers?.users ?? [])
        .filter((u) => userIds.includes(u.id))
        .map((u) => [u.id, u.email ?? null])
    )

    // 3. Fetch debug rows for these user/weeks
    const { data: debugRows, error: debugError } = await db
      .from('weekly_insight_debug')
      .select('user_id, week_start, attempt_number, stage, created_at, error, metadata')
      .in('user_id', userIds)
      .order('created_at', { ascending: false })

    if (debugError) {
      console.error('[admin/weekly-insights/errors] weekly_insight_debug query failed:', debugError)
    }

    const debug = (debugRows ?? []) as {
      user_id: string
      week_start: string
      attempt_number: number | null
      stage: string | null
      created_at: string
      error: any
      metadata: any
    }[]

    const errorsPayload = insights.map((row) => {
      const userDebug = debug.filter(
        (d) => d.user_id === row.user_id && d.week_start === row.week_start
      )

      const history = userDebug.map((d) => {
        const err = d.error || {}
        const metrics = (d.metadata?.metrics as {
          morningTasksCount?: number
          eveningReviewsCount?: number
          decisionsCount?: number
        }) || {}
        return {
          attempt: d.attempt_number ?? 1,
          stage: d.stage ?? 'unknown',
          error_code: (err.code as string) ?? '',
          error_message: (err.message as string) ?? JSON.stringify(err),
          timestamp: d.created_at,
          metrics: {
            morningTasksCount: metrics.morningTasksCount ?? 0,
            eveningReviewsCount: metrics.eveningReviewsCount ?? 0,
            decisionsCount: metrics.decisionsCount ?? 0,
          },
        }
      })

      const lastAttempt = history[0]?.timestamp ?? row.generated_at ?? null

      return {
        user_id: row.user_id,
        user_email: authMap.get(row.user_id) ?? null,
        week_start: row.week_start,
        week_end: row.week_end,
        status: row.status,
        retry_count: row.retry_count ?? 0,
        last_attempt: lastAttempt,
        next_retry_at: row.next_retry_at,
        error_history: history,
      }
    })

    return NextResponse.json({
      errors: errorsPayload,
      total: errorsPayload.length,
    })
  } catch (err) {
    console.error('[admin/weekly-insights/errors] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed' },
      { status: 500 }
    )
  }
}

