import { formatInTimeZone } from 'date-fns-tz'
import { getServerSupabase } from '@/lib/server-supabase'

type GoogleTokenRow = {
  refresh_token?: string | null
  access_token?: string | null
  expires_at?: string | null
  calendar_id?: string | null
}

type ReminderSettingsRow = {
  morning_enabled?: boolean | null
  morning_time?: string | null
  evening_enabled?: boolean | null
  evening_time?: string | null
  weekly_insights_enabled?: boolean | null
}

function hm(value: string | null | undefined, fallback: string): string {
  const v = String(value || '').slice(0, 5)
  return /^\d{2}:\d{2}$/.test(v) ? v : fallback
}

async function refreshGoogleAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresAt: string }> {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID || process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error('Missing GOOGLE_CALENDAR_CLIENT_ID/SECRET (or GOOGLE_CLIENT_ID/SECRET)')
  }
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  })
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const json = (await res.json().catch(() => ({}))) as {
    access_token?: string
    expires_in?: number
    error_description?: string
  }
  if (!res.ok || !json.access_token) {
    throw new Error(json.error_description || 'Failed to refresh Google access token')
  }
  const expiresInSec = Number(json.expires_in ?? 3600)
  const expiresAt = new Date(Date.now() + Math.max(300, expiresInSec) * 1000).toISOString()
  return { accessToken: json.access_token, expiresAt }
}

function buildRecurringEvent(params: {
  userId: string
  kind: 'morning' | 'evening' | 'weekly'
  timezone: string
  title: string
  description: string
  path: string
  hhmm: string
  rrule: string
}) {
  const [h, m] = params.hhmm.split(':')
  const ymd = formatInTimeZone(new Date(), params.timezone, 'yyyy-MM-dd')
  const start = `${ymd}T${h}:${m}:00`
  return {
    summary: params.title,
    description: `${params.description}\n\nhttps://wheeloffounders.com${params.path}?utm_source=calendar`,
    start: { dateTime: start, timeZone: params.timezone },
    end: { dateTime: start, timeZone: params.timezone },
    recurrence: [params.rrule],
    reminders: { useDefault: true },
    extendedProperties: {
      private: {
        wof_user_id: params.userId,
        wof_kind: params.kind,
      },
    },
  }
}

async function upsertEvent(
  accessToken: string,
  calendarId: string,
  userId: string,
  kind: 'morning' | 'evening' | 'weekly',
  eventPayload: Record<string, unknown>
) {
  const listUrl =
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events` +
    `?maxResults=10&singleEvents=true&privateExtendedProperty=${encodeURIComponent(`wof_user_id=${userId}`)}` +
    `&privateExtendedProperty=${encodeURIComponent(`wof_kind=${kind}`)}`
  const listRes = await fetch(listUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const listJson = (await listRes.json().catch(() => ({}))) as {
    items?: Array<{ id?: string }>
    error?: { message?: string }
  }
  if (!listRes.ok) {
    throw new Error(listJson.error?.message || `Calendar list failed (${listRes.status})`)
  }
  const existingId = listJson.items?.[0]?.id
  const base = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`

  if (existingId) {
    const patchRes = await fetch(`${base}/${encodeURIComponent(existingId)}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventPayload),
    })
    const patchJson = (await patchRes.json().catch(() => ({}))) as { error?: { message?: string } }
    if (!patchRes.ok) {
      throw new Error(patchJson.error?.message || `Calendar PATCH failed (${patchRes.status})`)
    }
    return
  }
  const postRes = await fetch(base, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(eventPayload),
  })
  const postJson = (await postRes.json().catch(() => ({}))) as { error?: { message?: string } }
  if (!postRes.ok) {
    throw new Error(postJson.error?.message || `Calendar POST failed (${postRes.status})`)
  }
}

/**
 * Creates/updates recurring Wheel of Founders events in the user's Google Calendar.
 * @returns `true` if a connection existed and sync ran; `false` if no stored refresh token.
 */
export async function syncRemindersToGoogleCalendar(userId: string): Promise<boolean> {
  const db = getServerSupabase()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- new table
  const { data: tokenRowData } = await (db.from('google_calendar_tokens') as any)
    .select('refresh_token, access_token, expires_at, calendar_id')
    .eq('user_id', userId)
    .maybeSingle()
  const tokenRow = (tokenRowData as GoogleTokenRow | null) ?? null
  if (!tokenRow?.refresh_token) return false

  const [{ data: settingsData }, { data: profileData }] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- generated types lag custom columns
    (db.from('user_notification_settings') as any)
      .select('morning_enabled, morning_time, evening_enabled, evening_time, weekly_insights_enabled')
      .eq('user_id', userId)
      .maybeSingle(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- generated types lag custom columns
    (db.from('user_profiles') as any).select('timezone').eq('id', userId).maybeSingle(),
  ])
  const settings = (settingsData as ReminderSettingsRow | null) ?? null
  const tz = String((profileData as { timezone?: string | null } | null)?.timezone || 'UTC')
  const calendarId = tokenRow.calendar_id || 'primary'

  let accessToken = tokenRow.access_token || null
  const expiresTs = tokenRow.expires_at ? new Date(tokenRow.expires_at).getTime() : 0
  if (!accessToken || !expiresTs || expiresTs <= Date.now() + 60_000) {
    const refreshed = await refreshGoogleAccessToken(String(tokenRow.refresh_token))
    accessToken = refreshed.accessToken
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- new table
    await (db.from('google_calendar_tokens') as any)
      .update({
        access_token: refreshed.accessToken,
        expires_at: refreshed.expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
  }

  if (!accessToken) return false

  const morningOn = (settings?.morning_enabled ?? true) === true
  const eveningOn = (settings?.evening_enabled ?? true) === true
  const weeklyOn = (settings?.weekly_insights_enabled ?? true) === true
  const morningTime = hm(settings?.morning_time, '09:00')
  const eveningTime = hm(settings?.evening_time, '20:00')

  if (morningOn) {
    await upsertEvent(
      accessToken,
      calendarId,
      userId,
      'morning',
      buildRecurringEvent({
        userId,
        kind: 'morning',
        timezone: tz,
        title: '🌅 Morning plan with Mrs. Deer',
        description: 'Set your top priorities and start the day with clarity.',
        path: '/morning',
        hhmm: morningTime,
        rrule: 'RRULE:FREQ=DAILY',
      })
    )
  }

  if (eveningOn) {
    await upsertEvent(
      accessToken,
      calendarId,
      userId,
      'evening',
      buildRecurringEvent({
        userId,
        kind: 'evening',
        timezone: tz,
        title: '🌙 Evening reflection with Mrs. Deer',
        description: 'Close your daily loop and capture wins, lessons, and patterns.',
        path: '/evening',
        hhmm: eveningTime,
        rrule: 'RRULE:FREQ=DAILY',
      })
    )
  }

  if (weeklyOn) {
    await upsertEvent(
      accessToken,
      calendarId,
      userId,
      'weekly',
      buildRecurringEvent({
        userId,
        kind: 'weekly',
        timezone: tz,
        title: 'Weekly Insight Ready',
        description: 'Your weekly founder insight is available.',
        path: '/weekly',
        hhmm: '09:00',
        rrule: 'RRULE:FREQ=WEEKLY;BYDAY=MO',
      })
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- new table
  await (db.from('google_calendar_tokens') as any)
    .update({ updated_at: new Date().toISOString() })
    .eq('user_id', userId)

  return true
}
