import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function assertAdmin(req: NextRequest): Promise<string | null> {
  const session = await getServerSessionFromRequest(req)
  if (!session) return null
  const db = getServerSupabase()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- admin flags are custom columns
  const { data } = await (db.from('user_profiles') as any)
    .select('is_admin, admin_role')
    .eq('id', session.user.id)
    .maybeSingle()
  const row = (data as { is_admin?: boolean; admin_role?: string } | null) ?? null
  if (row?.is_admin || row?.admin_role === 'super_admin') return session.user.id
  return null
}

function ymd(v: string): string {
  return String(v).slice(0, 10)
}

export async function GET(req: NextRequest) {
  try {
    const adminUserId = await assertAdmin(req)
    if (!adminUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const days = Math.max(1, Math.min(90, Number(req.nextUrl.searchParams.get('days') || 30)))
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
    const db = getServerSupabase()

    const { data: rows } = await db
      .from('feature_usage')
      .select('user_id, action, metadata, created_at')
      .eq('feature_name', 'calendar_subscription')
      .gte('created_at', since)
      .order('created_at', { ascending: true })

    const events = (rows || []) as Array<{
      user_id?: string
      action?: string
      created_at?: string
      metadata?: Record<string, unknown> | null
    }>

    const viewed = events.filter((e) => e.action === 'calendar_setup_modal_viewed')
    const subscribed = events.filter((e) => e.action === 'calendar_setup_subscribed')
    const skipped = events.filter((e) => e.action === 'calendar_setup_skipped')
    const providerClicks = events.filter((e) => e.action === 'calendar_provider_clicked')

    const usersWhoSaw = new Set(viewed.map((e) => e.user_id).filter(Boolean))
    const usersSubscribed = new Set(subscribed.map((e) => e.user_id).filter(Boolean))

    const providerBreakdown = { google: 0, apple: 0, outlook: 0 }
    for (const e of providerClicks) {
      const p = String(e.metadata?.provider || '')
      if (p === 'google' || p === 'apple' || p === 'outlook') providerBreakdown[p]++
    }

    const byDay = new Map<string, { views: number; subscriptions: number }>()
    for (const e of viewed) {
      const d = ymd(e.created_at || '')
      byDay.set(d, { views: (byDay.get(d)?.views || 0) + 1, subscriptions: byDay.get(d)?.subscriptions || 0 })
    }
    for (const e of subscribed) {
      const d = ymd(e.created_at || '')
      byDay.set(d, { views: byDay.get(d)?.views || 0, subscriptions: (byDay.get(d)?.subscriptions || 0) + 1 })
    }
    const dailyTrend = [...byDay.entries()]
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([date, x]) => ({
        date,
        views: x.views,
        subscriptions: x.subscriptions,
        rate: x.views > 0 ? Number(((x.subscriptions / x.views) * 100).toFixed(1)) : 0,
      }))

    const segmentBreakdown = {
      new_user: subscribed.filter((e) => String(e.metadata?.userSegment || '') === 'new_user').length,
      returning_user: subscribed.filter((e) => String(e.metadata?.userSegment || '') === 'returning_user').length,
    }

    const skipReasonCounts = new Map<string, number>()
    for (const e of skipped) {
      const r = String(e.metadata?.skipReason || '').trim()
      if (!r) continue
      skipReasonCounts.set(r, (skipReasonCounts.get(r) || 0) + 1)
    }

    const recentActivity = subscribed
      .slice(-30)
      .reverse()
      .map((e) => ({
        userId: e.user_id,
        at: e.created_at,
        provider: String(e.metadata?.provider || ''),
        placement: String(e.metadata?.placement || ''),
        segment: String(e.metadata?.userSegment || ''),
      }))

    const totalUsersWhoSawModal = usersWhoSaw.size
    const totalSubscribed = usersSubscribed.size
    const subscriptionRate = totalUsersWhoSawModal > 0 ? Number(((totalSubscribed / totalUsersWhoSawModal) * 100).toFixed(1)) : 0
    const skipRate = totalUsersWhoSawModal > 0 ? Number((100 - subscriptionRate).toFixed(1)) : 0

    return NextResponse.json({
      summary: {
        totalUsersWhoSawModal,
        totalSubscribed,
        subscriptionRate,
        skipRate,
      },
      providerBreakdown,
      segmentBreakdown,
      dailyTrend,
      userFeedback: {
        topSkipReasons: [...skipReasonCounts.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([reason, count]) => ({ reason, count })),
      },
      recentActivity,
    })
  } catch (err) {
    console.error('[admin/calendar-analytics] error', err)
    return NextResponse.json({ error: 'Failed to load calendar analytics' }, { status: 500 })
  }
}

