import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/server-supabase'
import { subDays, format } from 'date-fns'

const FOUNDER_EMAIL = 'wttmotivation@gmail.com'

/**
 * Founder analytics: daily stats + aggregated patterns.
 * Protected by founder email (cookie session) or ADMIN_SECRET.
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    const adminSecret = process.env.ADMIN_SECRET
    const isSecretAuth = adminSecret && authHeader === `Bearer ${adminSecret}`

    if (!isSecretAuth) {
      // Try session-based founder check
      const { createServerClient } = await import('@supabase/ssr')
      const { cookies } = await import('next/headers')
      const cookieStore = await cookies()
      const authClient = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll: () => cookieStore.getAll(),
            setAll: (c: { name: string; value: string; options?: object }[]) =>
              c.forEach(({ name, value, options }) => cookieStore.set(name, value, options as object)),
          },
        }
      )
      const { data: { session } } = await authClient.auth.getSession()
      const isFounder = session?.user?.email === FOUNDER_EMAIL
      if (!isFounder) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
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
      else byTextType.set(key, { type: p.pattern_type, count: 1 })
    }
    const topPatterns = Array.from(byTextType.entries())
      .map(([k, v]) => {
        const [pattern_text] = k.split('|')
        return { pattern_text, pattern_type: v.type, frequency: v.count }
      })
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 50)

    return NextResponse.json({
      dailyStats: dailyStats || [],
      topPatterns,
    })
  } catch (e) {
    console.error('[admin/analytics]', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
