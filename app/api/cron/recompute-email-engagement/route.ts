import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/server-supabase'
import { authorizeCronRequest } from '@/lib/cron-auth'
import { recomputeEmailEngagementForUser } from '@/lib/email/engagement'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    const auth = authorizeCronRequest(request)
    if (!auth.ok) {
      return NextResponse.json({ error: 'Unauthorized', reason: auth.reason }, { status: 401 })
    }

    const db = getServerSupabase()
    const limit = Math.min(1000, Math.max(1, Number(request.nextUrl.searchParams.get('limit') || 300)))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- custom profile columns pending generated typing
    const { data: users, error } = await (db.from('user_profiles') as any)
      .select('id, timezone')
      .limit(limit)

    if (error) {
      return NextResponse.json({ error: 'Failed to load users', details: error.message }, { status: 500 })
    }

    let processed = 0
    let updated = 0
    const failures: Array<{ userId: string; error: string }> = []

    for (const row of (users || []) as Array<{ id: string; timezone?: string | null }>) {
      processed++
      try {
        await recomputeEmailEngagementForUser(row.id, row.timezone || 'UTC')
        updated++
      } catch (err) {
        failures.push({
          userId: row.id,
          error: err instanceof Error ? err.message : 'unknown_error',
        })
      }
    }

    return NextResponse.json({
      success: true,
      processed,
      updated,
      failed: failures.length,
      failures: failures.slice(0, 25),
    })
  } catch (err) {
    console.error('[cron/recompute-email-engagement] error', err)
    return NextResponse.json({ error: 'Failed to recompute email engagement' }, { status: 500 })
  }
}

