import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'
import { getDaysWithEntries } from '@/lib/founder-dna/days-with-entries'
import {
  buildJourneyWeekRecords,
  type JourneyWeekRecordSource,
} from '@/lib/founder-dna/journey-week-records'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSessionFromRequest(req)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getServerSupabase()
    const userId = session.user.id

    const [weeklyRes, historyRes, daysWithEntries] = await Promise.all([
      (db.from('weekly_insights') as any)
        .select('week_start, week_end, insight_text')
        .eq('user_id', userId)
        .not('insight_text', 'is', null)
        .order('week_start', { ascending: false }),
      (db.from('insight_history') as any)
        .select('period_start, period_end, insight_text')
        .eq('user_id', userId)
        .eq('insight_type', 'weekly')
        .order('period_start', { ascending: false }),
      getDaysWithEntries(userId, db),
    ])

    const byWeek = new Map<string, JourneyWeekRecordSource>()

    for (const row of (weeklyRes.data ?? []) as {
      week_start?: string
      week_end?: string
      insight_text?: string | null
    }[]) {
      const weekStart = row.week_start?.slice(0, 10)
      if (!weekStart) continue
      byWeek.set(weekStart, {
        weekStart,
        weekEnd: row.week_end?.slice(0, 10) ?? weekStart,
        insightText: row.insight_text ?? null,
      })
    }

    for (const row of (historyRes.data ?? []) as {
      period_start?: string
      period_end?: string
      insight_text?: string | null
    }[]) {
      const weekStart = row.period_start?.slice(0, 10)
      if (!weekStart || byWeek.has(weekStart)) continue
      byWeek.set(weekStart, {
        weekStart,
        weekEnd: row.period_end?.slice(0, 10) ?? weekStart,
        insightText: row.insight_text ?? null,
      })
    }

    const sources = [...byWeek.values()].filter((s) => Boolean(s.insightText?.trim()))
    const weeks = buildJourneyWeekRecords(sources, daysWithEntries)

    return NextResponse.json({ weeks, daysWithEntries })
  } catch (err) {
    console.error('[founder-dna/journey/weeks] error', err)
    return NextResponse.json({ error: 'Failed to load journey weeks' }, { status: 500 })
  }
}
