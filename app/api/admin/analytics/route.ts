import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/server-supabase'
import { subDays, format } from 'date-fns'
import { buildTrackingMetrics } from '@/lib/admin/build-tracking-metrics'
import { authorizeAdminApiRequest } from '@/lib/admin'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Founder / admin analytics: daily stats, patterns, and product tracking aggregates.
 */
export async function GET(req: NextRequest) {
  try {
    if (!(await authorizeAdminApiRequest(req))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getServerSupabase()
    const timeframe = req.nextUrl.searchParams.get('timeframe') || '7d'
    const days = timeframe === '30d' ? 30 : 7
    const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd')

    const { data: dailyStats } = await db
      .from('daily_stats')
      .select('*')
      .gte('date', startDate)
      .order('date', { ascending: false })

    const { data: patterns } = await db
      .from('user_patterns')
      .select('pattern_text, pattern_type, detected_at')
      .gte('detected_at', `${startDate}T00:00:00`)

    const byTextType = new Map<string, { type: string; count: number }>()
    const patternRows = (patterns || []) as { pattern_text?: string; pattern_type?: string }[]
    for (const p of patternRows) {
      const key = `${p.pattern_text ?? ''}|${p.pattern_type ?? ''}`
      const cur = byTextType.get(key)
      if (cur) cur.count++
      else byTextType.set(key, { type: p.pattern_type ?? '', count: 1 })
    }
    const topPatterns = Array.from(byTextType.entries())
      .map(([k, v]) => {
        const [pattern_text] = k.split('|')
        return { pattern_text, pattern_type: v.type, frequency: v.count }
      })
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 50)

    let tracking: Awaited<ReturnType<typeof buildTrackingMetrics>> | null = null
    try {
      tracking = await buildTrackingMetrics(db, days)
    } catch (err) {
      console.error('[admin/analytics] tracking metrics failed (migration may not be applied)', err)
    }

    return NextResponse.json({
      dailyStats: dailyStats || [],
      topPatterns,
      tracking,
    })
  } catch (e) {
    console.error('[admin/analytics]', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
