import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { isAdmin, isDevelopment } from '@/lib/admin'
import { serverSupabase } from '@/lib/supabase/server'
import { generateWeeklyInsightForUser } from '@/lib/batch-weekly-insight'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSessionFromRequest(req)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    if (!isDevelopment() && !(await isAdmin(session.user.id))) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }

    const body = (await req.json()) as {
      user_id?: string
      week_start?: string
      week_end?: string
      force?: boolean
    }

    if (!body.user_id || !body.week_start) {
      return NextResponse.json(
        { error: 'user_id and week_start are required' },
        { status: 400 }
      )
    }

    const db = serverSupabase()

    // Look up week_end from weekly_insights if not provided
    let weekEnd = body.week_end
    if (!weekEnd) {
      const { data, error } = await db
        .from('weekly_insights')
        .select('week_end')
        .eq('user_id', body.user_id)
        .eq('week_start', body.week_start)
        .maybeSingle()
      if (error) {
        console.error('[admin/weekly-insights/retry] lookup error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      weekEnd = (data as { week_end?: string } | null)?.week_end ?? body.week_start
    }

    // If not forcing and already permanently failed, block
    if (!body.force) {
      const { data: row } = await db
        .from('weekly_insights')
        .select('status, retry_count')
        .eq('user_id', body.user_id)
        .eq('week_start', body.week_start)
        .maybeSingle()
      const r = row as { status?: string; retry_count?: number } | null
      if (r?.status === 'permanent_failed') {
        return NextResponse.json(
          { error: 'Week is marked as permanent_failed. Use force=true to override.' },
          { status: 400 }
        )
      }
    }

    // Mark as generating and reset next_retry_at so cron doesn't double-handle
    await (db.from('weekly_insights') as any)
      .update({
        status: 'generating',
        next_retry_at: null,
      })
      .eq('user_id', body.user_id)
      .eq('week_start', body.week_start)

    const result = await generateWeeklyInsightForUser(
      body.user_id,
      body.week_start,
      weekEnd
    )

    return NextResponse.json({
      success: result.success,
      error: result.error ?? null,
    })
  } catch (err) {
    console.error('[admin/weekly-insights/retry] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed' },
      { status: 500 }
    )
  }
}

