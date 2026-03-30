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
  emailMorningReminderTime: '09:00',
  emailEveningReminderTime: '20:00',
  emailFrequency: 'daily' as 'daily' | 'weekly_only' | 'achievements_only' | 'none',
  emailUnsubscribed: false,
}

/** GET: Load notification settings for the current user */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSessionFromRequest(req)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getServerSupabase()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- generated types lag notification settings columns
    const { data, error } = await (db.from('user_notification_settings') as any)
      .select(
        'morning_enabled, morning_time, evening_enabled, evening_time, weekly_insights_enabled, monthly_insights_enabled, quarterly_insights_enabled, profile_reminders_enabled, email_morning_reminder_time, email_evening_reminder_time, email_frequency, email_unsubscribed_at'
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
      email_morning_reminder_time?: string
      email_evening_reminder_time?: string
      email_frequency?: 'daily' | 'weekly_only' | 'achievements_only' | 'none'
      email_unsubscribed_at?: string | null
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
      emailMorningReminderTime: timeStr(row.email_morning_reminder_time) ?? '09:00',
      emailEveningReminderTime: timeStr(row.email_evening_reminder_time) ?? '20:00',
      emailFrequency: row.email_frequency ?? 'daily',
      emailUnsubscribed: Boolean(row.email_unsubscribed_at),
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
      morningTime?: string
      evening?: boolean
      eveningTime?: string
      weeklyInsights?: boolean
      /** Common mistake in manual tests — same as weeklyInsights */
      weeklyInsightsEnabled?: boolean
      weekly_insights_enabled?: boolean
      monthlyInsights?: boolean
      quarterlyInsights?: boolean
      profileReminders?: boolean
      emailMorningReminderTime?: string
      emailEveningReminderTime?: string
      emailFrequency?: 'daily' | 'weekly_only' | 'achievements_only' | 'none'
      emailUnsubscribed?: boolean
    }

    const frequency = body.emailFrequency ?? 'daily'
    const validFrequency = ['daily', 'weekly_only', 'achievements_only', 'none'].includes(frequency)
      ? frequency
      : 'daily'

    /** Normalize HH:MM (HTML time input or API) for Postgres `time` columns */
    const sliceHm = (v: string | undefined | null, fallback: string): string => {
      const raw = v != null ? String(v).trim() : ''
      const m = raw.match(/^(\d{1,2}):(\d{2})$/)
      if (!m) return fallback
      const h = Math.min(23, Math.max(0, parseInt(m[1], 10)))
      const mm = Math.min(59, Math.max(0, parseInt(m[2], 10)))
      if (!Number.isFinite(h) || !Number.isFinite(mm)) return fallback
      return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
    }

    const morningWall = sliceHm(body.morningTime ?? body.emailMorningReminderTime, '09:00')
    const eveningWall = sliceHm(body.eveningTime ?? body.emailEveningReminderTime, '20:00')
    const weeklyInsightsFlag =
      body.weeklyInsights ??
      body.weeklyInsightsEnabled ??
      body.weekly_insights_enabled ??
      true

    const debugLog =
      process.env.NODE_ENV === 'development' || process.env.WOF_DEBUG_NOTIFICATIONS === '1'

    if (debugLog) {
      console.info('[notification-settings] POST incoming', {
        userId: session.user.id,
        raw: {
          morningTime: body.morningTime,
          eveningTime: body.eveningTime,
          emailMorningReminderTime: body.emailMorningReminderTime,
          emailEveningReminderTime: body.emailEveningReminderTime,
          weeklyInsights: body.weeklyInsights,
          weeklyInsightsEnabled: body.weeklyInsightsEnabled,
        },
        resolved: { morningWall, eveningWall, weeklyInsights: weeklyInsightsFlag },
      })
    }

    const db = getServerSupabase()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- generated types lag notification settings columns
    const { error } = await (db.from('user_notification_settings') as any).upsert(
      {
        user_id: session.user.id,
        morning_enabled: body.morning ?? true,
        morning_time: `${morningWall}:00`,
        evening_enabled: body.evening ?? true,
        evening_time: `${eveningWall}:00`,
        weekly_insights_enabled: weeklyInsightsFlag,
        monthly_insights_enabled: body.monthlyInsights ?? true,
        quarterly_insights_enabled: body.quarterlyInsights ?? true,
        profile_reminders_enabled: body.profileReminders ?? true,
        email_morning_reminder_time: `${sliceHm(body.emailMorningReminderTime ?? body.morningTime, morningWall)}:00`,
        email_evening_reminder_time: `${sliceHm(body.emailEveningReminderTime ?? body.eveningTime, eveningWall)}:00`,
        email_frequency: validFrequency,
        email_unsubscribed_at: body.emailUnsubscribed ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )

    if (error) {
      console.error('[notification-settings] POST upsert failed', error)
      return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 })
    }

    if (debugLog) {
      console.info('[notification-settings] POST saved OK', {
        userId: session.user.id,
        morning_time: `${morningWall}:00`,
        evening_time: `${eveningWall}:00`,
        weekly_insights_enabled: weeklyInsightsFlag,
      })
    }

    return NextResponse.json({
      success: true,
      saved: {
        morningTime: morningWall,
        eveningTime: eveningWall,
        weeklyInsights: weeklyInsightsFlag,
      },
    })
  } catch (err) {
    console.error('[notification-settings] POST', err)
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 })
  }
}
