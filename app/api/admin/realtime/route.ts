import { NextResponse } from 'next/server'
import { getUserSession } from '@/lib/auth'
import { getServerSupabase } from '@/lib/server-supabase'

/**
 * GET: Real-time metrics - live users, recent activity
 */
export async function GET() {
  try {
    const session = await getUserSession()
    if (!session?.user?.is_admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getServerSupabase()

    // Live users: distinct users with feature_usage in last 5 minutes
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const { data: recentUsage } = await db
      .from('feature_usage')
      .select('user_id')
      .gte('created_at', fiveMinAgo)

    const liveUserIds = new Set((recentUsage ?? []).map((r) => r.user_id).filter(Boolean))
    const liveUsers = liveUserIds.size

    // Recent activity (last 50 events)
    const { data: activity } = await db
      .from('feature_usage')
      .select('user_id, feature_name, action, page, created_at')
      .order('created_at', { ascending: false })
      .limit(50)

    // Today's key metrics
    const today = new Date().toISOString().slice(0, 10)
    const { data: todayStats } = await db
      .from('daily_stats')
      .select('*')
      .eq('date', today)
      .maybeSingle()

    return NextResponse.json({
      liveUsers,
      recentActivity: (activity ?? []).map((a) => ({
        userId: a.user_id,
        feature: a.feature_name,
        action: a.action,
        page: a.page,
        at: a.created_at,
      })),
      todayStats: todayStats ?? null,
    })
  } catch (e) {
    console.error('[api/admin/realtime]', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
