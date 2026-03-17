import { NextRequest, NextResponse } from 'next/server'
import { format } from 'date-fns'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'

export const dynamic = 'force-dynamic'

export type ProgressStatus = 'full' | 'half' | 'empty' | 'future'

/** GET /api/user/progress?dates=YYYY-MM-DD,YYYY-MM-DD,...
 * Returns status per date: full (morning+evening), half (morning only), empty, future
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const datesParam = searchParams.get('dates')
    if (!datesParam) {
      return NextResponse.json({ error: 'Missing dates (use dates=YYYY-MM-DD,YYYY-MM-DD,...)' }, { status: 400 })
    }

    const dateStrings = datesParam.split(',').filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d.trim()))
    if (dateStrings.length === 0) {
      return NextResponse.json({ error: 'No valid dates provided' }, { status: 400 })
    }

    const todayStr = format(new Date(), 'yyyy-MM-dd')
    const minDate = dateStrings.reduce((a, b) => (a < b ? a : b))
    const maxDate = dateStrings.reduce((a, b) => (a > b ? a : b))

    const db = getServerSupabase()

    const [tasksRes, decisionsRes, reviewsRes] = await Promise.all([
      db
        .from('morning_tasks')
        .select('plan_date')
        .eq('user_id', session.user.id)
        .gte('plan_date', minDate)
        .lte('plan_date', maxDate),
      db
        .from('morning_decisions')
        .select('plan_date')
        .eq('user_id', session.user.id)
        .gte('plan_date', minDate)
        .lte('plan_date', maxDate),
      db
        .from('evening_reviews')
        .select('review_date')
        .eq('user_id', session.user.id)
        .gte('review_date', minDate)
        .lte('review_date', maxDate),
    ])

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

    const status: Record<string, ProgressStatus> = {}
    for (const dateStr of dateStrings) {
      if (dateStr > todayStr) {
        status[dateStr] = 'future'
      } else if (morningDates.has(dateStr) && eveningDates.has(dateStr)) {
        status[dateStr] = 'full'
      } else if (morningDates.has(dateStr)) {
        status[dateStr] = 'half'
      } else {
        status[dateStr] = 'empty'
      }
    }

    return NextResponse.json(status)
  } catch (err) {
    console.error('[user/progress] error', err)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}
