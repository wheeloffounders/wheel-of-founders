import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { getServerSupabase } from '@/lib/server-supabase'
import { subDays, format, parseISO, eachDayOfInterval } from 'date-fns'

function anonymizeUserId(userId: string): string {
  let h = 0
  for (let i = 0; i < userId.length; i++) {
    const c = userId.charCodeAt(i)
    h = (h << 5) - h + c
    h |= 0
  }
  return `usr_${Math.abs(h).toString(36).slice(0, 8)}`
}

/**
 * Require admin: try Authorization Bearer token first (session lives in localStorage, not cookies),
 * then fall back to cookie-based session for server-rendered requests.
 */
async function requireAdmin(req: NextRequest): Promise<{ ok: true; userId: string } | { ok: false; reason: string }> {
  const authHeader = req.headers.get('authorization')
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (bearerToken) {
    const anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } }
    )
    const { data: { user }, error: userError } = await anonClient.auth.getUser(bearerToken)
    if (userError) return { ok: false, reason: `Invalid token: ${userError.message}` }
    if (!user?.id) return { ok: false, reason: 'No user from token' }
    const db = getServerSupabase()
    const { data: profile, error: profileError } = await db
      .from('user_profiles')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle()
    if (profileError) return { ok: false, reason: `user_profiles: ${profileError.message}` }
    if (!profile?.is_admin) return { ok: false, reason: `User ${user.id} is_admin=false` }
    return { ok: true, userId: user.id }
  }

  const cookieStore = await cookies()
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll(c: { name: string; value: string; options?: object }[]) {
          c.forEach(({ name, value, options }) => cookieStore.set(name, value, options as object))
        },
      },
    }
  )
  const { data: { session }, error: sessionError } = await authClient.auth.getSession()
  if (sessionError) return { ok: false, reason: `getSession: ${sessionError.message}` }
  if (!session?.user?.id) return { ok: false, reason: 'No session' }

  const { data: profile, error: profileError } = await authClient
    .from('user_profiles')
    .select('is_admin')
    .eq('id', session.user.id)
    .maybeSingle()
  if (profileError) return { ok: false, reason: `user_profiles: ${profileError.message}` }
  if (!profile?.is_admin) return { ok: false, reason: `User ${session.user.id} is_admin=false` }
  return { ok: true, userId: session.user.id }
}

/**
 * GET: Cross-user analytics for founder dashboard.
 * Query: timeframe=7d|30d or startDate=yyyy-MM-dd&endDate=yyyy-MM-dd
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl
  const timeframe = url.searchParams.get('timeframe') || '7d'

  try {
    const auth = await requireAdmin(req)
    if (!auth.ok) {
      return NextResponse.json(
        { error: 'Unauthorized', detail: auth.reason },
        { status: 401 }
      )
    }

    const db = getServerSupabase()
    const startParam = url.searchParams.get('startDate')
    const endParam = url.searchParams.get('endDate')

    let startDate: string
    let endDate: string
    if (startParam && endParam) {
      startDate = startParam
      endDate = endParam
    } else {
      const days = timeframe === '30d' ? 30 : 7
      endDate = format(new Date(), 'yyyy-MM-dd')
      startDate = format(subDays(new Date(), days), 'yyyy-MM-dd')
    }

    const startTs = `${startDate}T00:00:00`
    const endTs = `${endDate}T23:59:59`

    const { data: dailyStats } = await db
      .from('daily_stats')
      .select('date, active_users')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true })

    const { data: patterns } = await db
      .from('user_patterns')
      .select('user_id, pattern_text, pattern_type, detected_at')
      .gte('detected_at', startTs)
      .lte('detected_at', endTs)

    const list = patterns || []

    const byTextType = new Map<string, number>()
    const struggles: { text: string; count: number }[] = []
    const wins: { text: string; count: number }[] = []
    const byDate: Record<string, { struggles: number; wins: number }> = {}

    const days = eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) })
    days.forEach((d) => {
      const key = format(d, 'yyyy-MM-dd')
      byDate[key] = { struggles: 0, wins: 0 }
    })

    for (const p of list) {
      const key = `${p.pattern_text}|${p.pattern_type}`
      byTextType.set(key, (byTextType.get(key) || 0) + 1)
      const dateKey = p.detected_at ? format(new Date(p.detected_at), 'yyyy-MM-dd') : ''
      if (dateKey && byDate[dateKey] !== undefined) {
        if (p.pattern_type === 'struggle') byDate[dateKey].struggles++
        if (p.pattern_type === 'win') byDate[dateKey].wins++
      }
    }

    const struggleCounts = new Map<string, number>()
    const winCounts = new Map<string, number>()
    for (const p of list) {
      if (p.pattern_type === 'struggle') {
        struggleCounts.set(p.pattern_text, (struggleCounts.get(p.pattern_text) || 0) + 1)
      }
      if (p.pattern_type === 'win') {
        winCounts.set(p.pattern_text, (winCounts.get(p.pattern_text) || 0) + 1)
      }
    }

    const topStruggles = Array.from(struggleCounts.entries())
      .map(([text, count]) => ({ text, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    const topWins = Array.from(winCounts.entries())
      .map(([text, count]) => ({ text, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    const totalActiveUsers = dailyStats?.length
      ? Math.max(...dailyStats.map((r) => (r as { active_users?: number }).active_users ?? 0), 0)
      : 0
    const totalPatternsDetected = list.length
    const mostCommonStruggle = topStruggles[0]?.text ?? '—'
    const mostCommonWin = topWins[0]?.text ?? '—'

    const trendOverTime = Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, struggles: v.struggles, wins: v.wins }))

    const allThemes = new Map<string, number>()
    for (const p of list) {
      const t = p.pattern_text.trim().toLowerCase()
      if (t) allThemes.set(t, (allThemes.get(t) || 0) + 1)
    }
    const wordCloudThemes = Array.from(allThemes.entries())
      .map(([text, count]) => ({ text, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 50)

    const rawData = list.map((p) => ({
      pattern_text: p.pattern_text,
      pattern_type: p.pattern_type,
      user_id_anon: anonymizeUserId(p.user_id || ''),
      date: p.detected_at ? format(new Date(p.detected_at), 'yyyy-MM-dd') : '',
    }))

    const totalStruggles = list.filter((p) => p.pattern_type === 'struggle').length
    const totalWins = list.filter((p) => p.pattern_type === 'win').length
    const uniqueUsers = new Set(list.map((p) => p.user_id)).size
    const correlationInsights: string[] = []
    if (totalStruggles > 0 && uniqueUsers > 0) {
      correlationInsights.push(
        `Across ${uniqueUsers} user(s), ${totalStruggles} struggle(s) and ${totalWins} win(s) were detected in the selected period.`
      )
    }
    if (topStruggles[0]) {
      correlationInsights.push(
        `Most common struggle: "${topStruggles[0].text}" (${topStruggles[0].count} mention${topStruggles[0].count === 1 ? '' : 's'}).`
      )
    }
    if (topWins[0]) {
      correlationInsights.push(
        `Most common win: "${topWins[0].text}" (${topWins[0].count} mention${topWins[0].count === 1 ? '' : 's'}).`
      )
    }
    if (trendOverTime.length >= 2) {
      const last = trendOverTime[trendOverTime.length - 1]
      const prev = trendOverTime[trendOverTime.length - 2]
      if (prev.struggles > 0) {
        const pct = Math.round(((last.struggles - prev.struggles) / prev.struggles) * 100)
        correlationInsights.push(
          `Struggles ${pct >= 0 ? 'up' : 'down'} ${Math.abs(pct)}% in the last day vs previous day.`
        )
      }
    }
    if (correlationInsights.length === 0) {
      correlationInsights.push('Add more reflections and run pattern analysis to see correlation insights.')
    }

    return NextResponse.json({
      totalActiveUsers,
      totalPatternsDetected,
      mostCommonStruggle,
      mostCommonWin,
      topStruggles,
      topWins,
      trendOverTime,
      wordCloudThemes,
      correlationInsights,
      rawData,
      startDate,
      endDate,
    })
  } catch (e) {
    console.error('[cross-user-analytics GET]', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

/**
 * POST: Manually trigger pattern queue processing (founder only).
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin(req)
    if (!auth.ok) {
      return NextResponse.json(
        { error: 'Unauthorized', detail: auth.reason },
        { status: 401 }
      )
    }
    const { processPatternQueue } = await import('@/lib/analytics/pattern-extractor')
    await processPatternQueue(50)
    return NextResponse.json({ success: true, message: 'Pattern analysis triggered.' })
  } catch (e) {
    console.error('[cross-user-analytics POST]', e)
    return NextResponse.json({ error: 'Failed to run pattern analysis' }, { status: 500 })
  }
}
