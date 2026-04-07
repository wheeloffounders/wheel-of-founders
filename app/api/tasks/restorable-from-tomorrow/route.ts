import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'
import { getPlanDateString } from '@/lib/effective-plan-date'
import { addDaysToYmdInTz, getUserTimezoneFromProfile } from '@/lib/timezone'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET: Count of incomplete tasks sitting on tomorrow that were moved from today (restorable).
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSessionFromRequest(req)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getServerSupabase() as any
    const { data: profile } = await db
      .from('user_profiles')
      .select('timezone')
      .eq('id', session.user.id)
      .maybeSingle()
    const userTimeZone = getUserTimezoneFromProfile((profile as { timezone?: string | null } | null) ?? null)
    const planDate = getPlanDateString(userTimeZone, new Date())
    const tomorrowYmd = addDaysToYmdInTz(planDate, 1, userTimeZone)

    const { data: rows, error } = await db
      .from('morning_tasks')
      .select('id, description, completed')
      .eq('user_id', session.user.id)
      .eq('plan_date', tomorrowYmd)
      .eq('postponed_from_plan_date', planDate)

    if (error) {
      console.error('[tasks/restorable-from-tomorrow]', error)
      return NextResponse.json({ error: 'Failed to load tasks' }, { status: 500 })
    }

    const list = (rows ?? []) as Array<{ id: string; description: string; completed?: boolean | null }>
    const incomplete = list.filter((t) => t.completed !== true)
    return NextResponse.json({
      count: incomplete.length,
      descriptions: incomplete.map((t) => t.description).slice(0, 8),
    })
  } catch (err) {
    console.error('[tasks/restorable-from-tomorrow]', err)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}
