import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const DEFAULT_SETTINGS = {
  morning: true,
  morningTime: '09:00',
  evening: true,
  eveningTime: '18:00',
  weeklyInsights: true,
  monthlyInsights: true,
  quarterlyInsights: true,
  profileReminders: true,
}

/** GET: Load notification settings for the current user */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSessionFromRequest(req)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getServerSupabase()
    const { data, error } = await (db.from('user_notification_settings') as any)
      .select(
        'morning_enabled, morning_time, evening_enabled, evening_time, weekly_insights_enabled, monthly_insights_enabled, quarterly_insights_enabled, profile_reminders_enabled'
      )
      .eq('user_id', session.user.id)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ settings: DEFAULT_SETTINGS })
    }

    const row = data as {
      morning_enabled?: boolean
      morning_time?: string
      evening_enabled?: boolean
      evening_time?: string
      weekly_insights_enabled?: boolean
      monthly_insights_enabled?: boolean
      quarterly_insights_enabled?: boolean
      profile_reminders_enabled?: boolean
    } | null

    if (!row) {
      return NextResponse.json({ settings: DEFAULT_SETTINGS })
    }

    const timeStr = (t: string | null | undefined) =>
      t ? String(t).slice(0, 5) : undefined

    const settings = {
      morning: row.morning_enabled ?? true,
      morningTime: timeStr(row.morning_time) ?? '09:00',
      evening: row.evening_enabled ?? true,
      eveningTime: timeStr(row.evening_time) ?? '18:00',
      weeklyInsights: row.weekly_insights_enabled ?? true,
      monthlyInsights: row.monthly_insights_enabled ?? true,
      quarterlyInsights: row.quarterly_insights_enabled ?? true,
      profileReminders: row.profile_reminders_enabled ?? true,
    }

    return NextResponse.json({ settings })
  } catch (err) {
    console.error('[notification-settings] GET', err)
    return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 })
  }
}

/** POST: Save notification settings */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSessionFromRequest(req)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({})) as {
      morning?: boolean
      evening?: boolean
      weeklyInsights?: boolean
      monthlyInsights?: boolean
      quarterlyInsights?: boolean
      profileReminders?: boolean
    }

    const db = getServerSupabase()
    const { error } = await (db.from('user_notification_settings') as any).upsert(
      {
        user_id: session.user.id,
        morning_enabled: body.morning ?? true,
        morning_time: '09:00:00',
        evening_enabled: body.evening ?? true,
        evening_time: '18:00:00',
        weekly_insights_enabled: body.weeklyInsights ?? true,
        monthly_insights_enabled: body.monthlyInsights ?? true,
        quarterly_insights_enabled: body.quarterlyInsights ?? true,
        profile_reminders_enabled: body.profileReminders ?? true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )

    if (error) {
      console.error('[notification-settings] POST', error)
      return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[notification-settings] POST', err)
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 })
  }
}
