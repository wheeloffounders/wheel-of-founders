import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/server-supabase'
import { authorizeAdminApiRequest } from '@/lib/admin'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: NextRequest) {
  try {
    if (!(await authorizeAdminApiRequest(req))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getServerSupabase()
    const days = Number(req.nextUrl.searchParams.get('days') || '30')
    const since = new Date(Date.now() - Math.max(1, days) * 86400000).toISOString()

    const [{ data: logs }, { data: events }] = await Promise.all([
      (db.from('email_logs') as any)
        .select('id, email_type, sent_at')
        .gte('sent_at', since),
      (db.from('email_events') as any)
        .select('email_log_id, event_type, link_url, created_at')
        .gte('created_at', since),
    ])

    const sentByType = new Map<string, number>()
    const openByType = new Map<string, Set<string>>()
    const clickByType = new Map<string, Set<string>>()
    const logTypeById = new Map<string, string>()
    const topLinks = new Map<string, number>()
    const openTrend = new Map<string, { sent: number; opened: number; clicked: number }>()

    for (const l of (logs || []) as Array<{ id: string; email_type?: string; sent_at?: string }>) {
      const type = l.email_type || 'unknown'
      sentByType.set(type, (sentByType.get(type) ?? 0) + 1)
      logTypeById.set(l.id, type)
      const day = String(l.sent_at || '').slice(0, 10)
      if (day) {
        const cur = openTrend.get(day) ?? { sent: 0, opened: 0, clicked: 0 }
        cur.sent += 1
        openTrend.set(day, cur)
      }
    }

    for (const e of (events || []) as Array<{ email_log_id?: string; event_type?: string; link_url?: string; created_at?: string }>) {
      const logId = e.email_log_id
      if (!logId) continue
      const type = logTypeById.get(logId) || 'unknown'
      if (e.event_type === 'opened') {
        const set = openByType.get(type) ?? new Set<string>()
        set.add(logId)
        openByType.set(type, set)
      } else if (e.event_type === 'clicked') {
        const set = clickByType.get(type) ?? new Set<string>()
        set.add(logId)
        clickByType.set(type, set)
        if (e.link_url) topLinks.set(e.link_url, (topLinks.get(e.link_url) ?? 0) + 1)
      }
      const day = String(e.created_at || '').slice(0, 10)
      if (day) {
        const cur = openTrend.get(day) ?? { sent: 0, opened: 0, clicked: 0 }
        if (e.event_type === 'opened') cur.opened += 1
        if (e.event_type === 'clicked') cur.clicked += 1
        openTrend.set(day, cur)
      }
    }

    const byType = Array.from(sentByType.entries()).map(([emailType, sent]) => {
      const opened = openByType.get(emailType)?.size ?? 0
      const clicked = clickByType.get(emailType)?.size ?? 0
      return {
        emailType,
        sent,
        opened,
        clicked,
        openRate: sent > 0 ? opened / sent : 0,
        clickRate: sent > 0 ? clicked / sent : 0,
      }
    })

    const totals = byType.reduce(
      (acc, r) => {
        acc.sent += r.sent
        acc.opened += r.opened
        acc.clicked += r.clicked
        return acc
      },
      { sent: 0, opened: 0, clicked: 0 }
    )

    return NextResponse.json({
      rangeDays: days,
      totals: {
        ...totals,
        openRate: totals.sent > 0 ? totals.opened / totals.sent : 0,
        clickRate: totals.sent > 0 ? totals.clicked / totals.sent : 0,
      },
      byType: byType.sort((a, b) => b.sent - a.sent),
      topLinks: Array.from(topLinks.entries())
        .map(([url, clicks]) => ({ url, clicks }))
        .sort((a, b) => b.clicks - a.clicks)
        .slice(0, 10),
      trend: Array.from(openTrend.entries())
        .map(([date, v]) => ({ date, ...v }))
        .sort((a, b) => (a.date < b.date ? -1 : 1)),
    })
  } catch (err) {
    console.error('[email/analytics] error', err)
    return NextResponse.json({ error: 'Failed to load analytics' }, { status: 500 })
  }
}

