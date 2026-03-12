import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'
import { isDevelopment } from '@/lib/env'

/**
 * Normalize date to YYYY-MM-DD format.
 * Handles: "2026-01-01", "2026-01-01T00:00:00.000Z", Date objects, null/undefined
 */
function normalizePeriodDate(val: unknown): string | null {
  if (val == null) return null
  if (typeof val === 'string') {
    const match = val.match(/^(\d{4}-\d{2}-\d{2})/)
    return match ? match[1] : null
  }
  if (val instanceof Date) {
    return val.toISOString().slice(0, 10)
  }
  return null
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSessionFromRequest(req)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const type = req.nextUrl.searchParams.get('type')
    if (!type || !['weekly', 'monthly', 'quarterly'].includes(type)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    const db = getServerSupabase()

    const queries = [
      db
        .from('personal_prompts')
        .select('prompt_date')
        .eq('user_id', session.user.id)
        .eq('prompt_type', type)
        .order('prompt_date', { ascending: false }),
      db
        .from('insight_history')
        .select('period_start')
        .eq('user_id', session.user.id)
        .eq('insight_type', type)
        .order('period_start', { ascending: false }),
    ]

    if (type === 'weekly') {
      queries.push(
        (db.from('weekly_insights') as any)
          .select('week_start')
          .eq('user_id', session.user.id)
          .order('week_start', { ascending: false })
      )
    }

    const results = (await Promise.all(queries)) as { data: unknown[] | null; error: unknown }[]
    const [promptsRes, historyRes, weeklyRes] = results

    if (promptsRes.error) {
      console.error('[insights-periods] personal_prompts error:', promptsRes.error)
      throw promptsRes.error
    }
    if (historyRes.error) {
      console.error('[insights-periods] insight_history error:', historyRes.error)
      throw historyRes.error
    }
    if (type === 'weekly' && weeklyRes?.error) {
      console.warn('[insights-periods] weekly_insights error (non-fatal):', weeklyRes.error)
    }

    const rawFromPrompts = (promptsRes.data ?? []).map((p) => (p as { prompt_date?: unknown }).prompt_date)
    const rawFromHistory = (historyRes.data ?? []).map((h) => (h as { period_start?: unknown }).period_start)
    const rawFromWeekly =
      type === 'weekly' && weeklyRes?.data
        ? (weeklyRes.data as { week_start?: unknown }[]).map((w) => w.week_start)
        : []

    const fromPrompts = rawFromPrompts.map(normalizePeriodDate).filter((d): d is string => d != null)
    const fromHistory = rawFromHistory.map(normalizePeriodDate).filter((d): d is string => d != null)
    const fromWeekly = rawFromWeekly.map(normalizePeriodDate).filter((d): d is string => d != null)

    const allDates = [...fromPrompts, ...fromHistory, ...fromWeekly]
    const uniqueDates = [...new Set(allDates)].sort((a, b) => (b < a ? -1 : b > a ? 1 : 0))

    if (isDevelopment) {
      console.log('[insights-periods]', {
        type,
        userId: session.user.id,
        fromPromptsCount: fromPrompts.length,
        fromHistoryCount: fromHistory.length,
        fromWeeklyCount: fromWeekly.length,
        uniqueCount: uniqueDates.length,
        sample: uniqueDates.slice(0, 5),
      })
    }

    return NextResponse.json({
      periods: uniqueDates,
      type,
      currentPeriod: uniqueDates[0] || null,
    })
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    const errDetail =
      error && typeof error === 'object' && 'message' in error
        ? (error as { message?: string; code?: string; details?: string }).message
        : err.message

    console.error('[insights-periods] Error:', errDetail, error)

    return NextResponse.json(
      {
        error: 'Failed to fetch periods',
        ...(isDevelopment && { detail: errDetail }),
      },
      { status: 500 }
    )
  }
}
