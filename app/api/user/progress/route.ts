import { NextRequest, NextResponse } from 'next/server'
import { format } from 'date-fns'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'

export const dynamic = 'force-dynamic'

export type ProgressStatus = 'full' | 'half' | 'partial' | 'empty' | 'future'

/** GET /api/user/progress?dates=YYYY-MM-DD,YYYY-MM-DD,...
 * Returns status per date:
 * - full: morning complete + evening review
 * - half: morning complete, evening not done
 * - partial: morning started but not committed
 * - empty: no morning activity
 * - future: date after today
 *
 * Morning complete definition:
 * - morning_plan_commits row exists for plan_date (committed_at is UTC; do not require same calendar day as plan_date)
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

    const [tasksRes, decisionsRes, reviewsRes, commitsRes] = await Promise.all([
      db
        .from('morning_tasks')
        .select('plan_date, completed')
        .eq('user_id', session.user.id)
        .gte('plan_date', minDate)
        .lte('plan_date', maxDate),
      db
        .from('morning_decisions')
        .select('plan_date, decision')
        .eq('user_id', session.user.id)
        .gte('plan_date', minDate)
        .lte('plan_date', maxDate),
      db
        .from('evening_reviews')
        .select('review_date')
        .eq('user_id', session.user.id)
        .gte('review_date', minDate)
        .lte('review_date', maxDate),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- morning_plan_commits projection includes generated-type lag columns
      (db.from('morning_plan_commits') as any)
        .select('plan_date, committed_at')
        .eq('user_id', session.user.id)
        .gte('plan_date', minDate)
        .lte('plan_date', maxDate),
    ])

    const tasksByDate = new Map<string, boolean[]>()
    for (const r of tasksRes.data ?? []) {
      const row = r as { plan_date: string; completed?: boolean | null }
      const d = row.plan_date
      const list = tasksByDate.get(d) ?? []
      list.push(row.completed === true)
      tasksByDate.set(d, list)
    }

    const decisionTextByDate = new Map<string, string>()
    for (const r of decisionsRes.data ?? []) {
      const row = r as { plan_date: string; decision?: string | null }
      const text = typeof row.decision === 'string' ? row.decision : ''
      if (text.trim().length > 0) {
        decisionTextByDate.set(row.plan_date, text)
      }
    }

    const eveningDates = new Set(
      (reviewsRes.data ?? []).map((r: { review_date: string }) => r.review_date)
    )
    const morningCommittedDates = new Set<string>()
    for (const r of (commitsRes.data ?? []) as Array<{ plan_date?: string }>) {
      const planDate = String(r.plan_date || '').slice(0, 10)
      if (planDate && /^\d{4}-\d{2}-\d{2}$/.test(planDate)) {
        morningCommittedDates.add(planDate)
      }
    }

    const morningStarted = (dateStr: string): boolean => {
      if (morningCommittedDates.has(dateStr)) return true
      const tasks = tasksByDate.get(dateStr) ?? []
      if (tasks.length > 0) return true
      return (decisionTextByDate.get(dateStr) ?? '').trim().length > 0
    }

    const morningComplete = (dateStr: string): boolean => {
      return morningCommittedDates.has(dateStr)
    }

    const status: Record<string, ProgressStatus> = {}
    for (const dateStr of dateStrings) {
      if (dateStr > todayStr) {
        status[dateStr] = 'future'
      } else if (morningComplete(dateStr) && eveningDates.has(dateStr)) {
        status[dateStr] = 'full'
      } else if (morningComplete(dateStr)) {
        status[dateStr] = 'half'
      } else if (morningStarted(dateStr)) {
        status[dateStr] = 'partial'
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
