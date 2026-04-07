import { NextRequest, NextResponse } from 'next/server'
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'
import { isMissingEveningIsDraftColumnError } from '@/lib/supabase/evening-is-draft-column'

export const dynamic = 'force-dynamic'

export type DayStatusValue = 'complete' | 'half' | 'empty' | 'future'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const monthParam = searchParams.get('month')
    if (!monthParam || !/^\d{4}-\d{2}$/.test(monthParam)) {
      return NextResponse.json({ error: 'Invalid month (use yyyy-MM)' }, { status: 400 })
    }

    const [year, month] = monthParam.split('-').map(Number)
    const monthStart = startOfMonth(new Date(year, month - 1, 1))
    const monthEnd = endOfMonth(monthStart)
    const startStr = format(monthStart, 'yyyy-MM-dd')
    const endStr = format(monthEnd, 'yyyy-MM-dd')

    const db = getServerSupabase()

    const [tasksRes, decisionsRes, reviewsResFirst, emergenciesRes] = await Promise.all([
      db
        .from('morning_tasks')
        .select('plan_date')
        .eq('user_id', session.user.id)
        .gte('plan_date', startStr)
        .lte('plan_date', endStr),
      db
        .from('morning_decisions')
        .select('plan_date')
        .eq('user_id', session.user.id)
        .gte('plan_date', startStr)
        .lte('plan_date', endStr),
      db
        .from('evening_reviews')
        .select('review_date')
        .eq('user_id', session.user.id)
        .eq('is_draft', false)
        .gte('review_date', startStr)
        .lte('review_date', endStr),
      db
        .from('emergencies')
        .select('fire_date')
        .eq('user_id', session.user.id)
        .gte('fire_date', startStr)
        .lte('fire_date', endStr),
    ])

    let reviewsRes = reviewsResFirst
    if (reviewsRes.error && isMissingEveningIsDraftColumnError(reviewsRes.error)) {
      reviewsRes = await db
        .from('evening_reviews')
        .select('review_date')
        .eq('user_id', session.user.id)
        .gte('review_date', startStr)
        .lte('review_date', endStr)
    }

    const morningDates = new Set<string>()
    for (const r of tasksRes.data ?? []) {
      morningDates.add((r as { plan_date: string }).plan_date)
    }
    for (const r of decisionsRes.data ?? []) {
      morningDates.add((r as { plan_date: string }).plan_date)
    }
    const eveningDates = new Set(
      (reviewsRes.data ?? []).map((r: { review_date: string }) => r.review_date)
    )
    const emergencyDates = new Set(
      (emergenciesRes.data ?? []).map((r: { fire_date: string }) => r.fire_date)
    )

    const today = new Date()
    const todayStr = format(today, 'yyyy-MM-dd')
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
    const status: Record<string, DayStatusValue> = {}

    for (const d of days) {
      const dateStr = format(d, 'yyyy-MM-dd')
      if (dateStr > todayStr) {
        status[dateStr] = 'future'
      } else if (morningDates.has(dateStr) && eveningDates.has(dateStr)) {
        status[dateStr] = 'complete'
      } else if (morningDates.has(dateStr) || eveningDates.has(dateStr) || emergencyDates.has(dateStr)) {
        status[dateStr] = 'half'
      } else {
        status[dateStr] = 'empty'
      }
    }

    return NextResponse.json(status)
  } catch (err) {
    console.error('month-status error', err)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}
