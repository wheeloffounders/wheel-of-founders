/**
 * GET /api/rate-limit/usage
 * Returns current rate limit usage for the authenticated user.
 * Used by settings/billing UI to show "X/Y used today" etc.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'
import { checkRateLimit } from '@/lib/rate-limit'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSessionFromRequest(req)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const db = getServerSupabase()
    const { data: profileRaw } = await db
      .from('user_profiles')
      .select('tier')
      .eq('id', session.user.id)
      .maybeSingle()

    const profile = profileRaw as { tier?: string } | null
    const tier = profile?.tier ?? 'free'

    const [dailyResult, weeklyResult] = await Promise.all([
      checkRateLimit(session.user.id, 'morning', tier),
      checkRateLimit(session.user.id, 'weekly', tier),
    ])

    return NextResponse.json({
      daily: {
        used: dailyResult.used,
        limit: dailyResult.limit,
        resetAt: dailyResult.resetAt,
      },
      weekly: {
        used: weeklyResult.used,
        limit: weeklyResult.limit,
        resetAt: weeklyResult.resetAt,
      },
      tier,
    })
  } catch (error) {
    console.error('[rate-limit/usage] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch usage' }, { status: 500 })
  }
}
