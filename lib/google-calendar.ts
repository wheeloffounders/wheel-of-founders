// Verified Sync Logic - Versioned ID + Summary Cleanup + Timezone Explicit - 2026-04-09 17:59 HKT
import { createHash } from 'node:crypto'
import { addMinutes } from 'date-fns'
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz'
import { getUpcomingMondayAnchorInTimeZone } from '@/lib/calendar/upcoming-anchor'
import { isValidIanaTimeZone } from '@/lib/iana-timezone'
import { getLogTimestamp } from '@/lib/server-log-timestamp'
import { getServerSupabase } from '@/lib/server-supabase'

/** Default when profile timezone is missing, UTC-shaped, or invalid (product default). */
const DEFAULT_USER_TIMEZONE = 'Asia/Hong_Kong'

export type SyncGoogleCalendarOptions = {
  /** IANA id from client (browser); wins over profile when valid and not plain UTC */
  requestTimeZone?: string | null
}

function resolveUserTimezoneForSync(
  userId: string,
  requestTimeZone: string | null | undefined,
  profileTimeZone: string | null | undefined
): string {
  const pick = (z: string | null | undefined, source: string): string | null => {
    const s = String(z ?? '').trim()
    if (!s) return null
    if (s.toUpperCase() === 'UTC') {
      return null
    }
    if (!isValidIanaTimeZone(s)) {
      return null
    }
    return s
  }

  const fromReq = pick(requestTimeZone, 'request')
  if (fromReq) return fromReq
  const fromProfile = pick(profileTimeZone, 'profile')
  if (fromProfile) return fromProfile
  return DEFAULT_USER_TIMEZONE
}

/**
 * Google Calendar custom `id` must be base32hex-like: only `0-9` and `a-f` (hex) are valid.
 * Stable per user + kind so re-sync replaces the same logical event after cleanup.
 */
function googleStableEventId(kind: 'morning' | 'evening' | 'weekly', userId: string): string {
  return createHash('sha256')
    .update(`wof:gcal:v3:${kind}:${userId}`)
    .digest('hex')
    .slice(0, 32)
}

/** Versioned event id to bypass stale Google custom-id index locks. */
function googleVersionedEventId(
  kind: 'morning' | 'evening' | 'weekly',
  userId: string,
  version: string
): string {
  return createHash('sha256')
    .update(`wof:gcal:v4:${kind}:${userId}:${version}`)
    .digest('hex')
    .slice(0, 32)
}

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

/**
 * Wall-clock anchor: interpret `anchorYmd` + `hh:mm` in IANA `tz`, never `new Date(iso)` on the server
 * (that would apply the machine timezone). Use fromZonedTime + formatInTimeZone for RFC3339 local strings without `Z`.
 */
function wallClockStartEnd(
  anchorYmd: string,
  hhmm: string,
  tz: string,
  durationMinutes: number,
  label: string
): { startDateTime: string; endDateTime: string } {
  const parts = hhmm.split(':')
  const h = String(parts[0] ?? '09').padStart(2, '0')
  const m = String(parts[1] ?? '00').padStart(2, '0')
  const localWall = `${anchorYmd}T${h}:${m}:00`
  const startInstant = fromZonedTime(localWall, tz)
  const endInstant = addMinutes(startInstant, durationMinutes)
  const startDateTime = formatInTimeZone(startInstant, tz, "yyyy-MM-dd'T'HH:mm:ss")
  const endDateTime = formatInTimeZone(endInstant, tz, "yyyy-MM-dd'T'HH:mm:ss")
  return { startDateTime, endDateTime }
}

function buildRecurringEventBody(params: {
  userId: string
  kind: 'morning' | 'evening' | 'weekly'
  timezone: string
  title: string
  description: string
  path: string
  anchorYmd: string
  hhmm: string
  rrule: string
  durationMinutes: number
  debugLabel: string
}) {
  const { startDateTime, endDateTime } = wallClockStartEnd(
    params.anchorYmd,
    params.hhmm,
    params.timezone,
    params.durationMinutes,
    params.debugLabel
  )
  const tz = params.timezone
  return {
    summary: params.title,
    description: `${params.description}\n\nhttps://wheeloffounders.com${params.path}?utm_source=calendar`,
    start: { dateTime: startDateTime, timeZone: tz },
    end: { dateTime: endDateTime, timeZone: tz },
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

/** Paginate and delete every event we created (private extended property). */
async function deleteAllWofEvents(accessToken: string, calendarId: string, userId: string): Promise<void> {
  const base = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`
  let pageToken: string | undefined
  let deleted = 0
  do {
    const u = new URL(base)
    u.searchParams.set('privateExtendedProperty', `wof_user_id=${userId}`)
    u.searchParams.set('maxResults', '250')
    u.searchParams.set('singleEvents', 'false')
    if (pageToken) u.searchParams.set('pageToken', pageToken)
    const listRes = await fetch(u.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const listJson = (await listRes.json().catch(() => ({}))) as {
      items?: Array<{ id?: string }>
      nextPageToken?: string
      error?: { message?: string }
    }
    if (!listRes.ok) {
      throw new Error(listJson.error?.message || `Calendar list (cleanup) failed (${listRes.status})`)
    }
    const items = listJson.items ?? []
    for (const ev of items) {
      const id = ev.id
      if (!id) continue
      const delRes = await fetch(`${base}/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!delRes.ok && delRes.status !== 404) {
        const errBody = (await delRes.json().catch(() => ({}))) as { error?: { message?: string } }
        throw new Error(errBody.error?.message || `DELETE event failed (${delRes.status})`)
      }
      deleted += 1
    }
    pageToken = listJson.nextPageToken
  } while (pageToken)

  console.log(`${getLogTimestamp()} [google-calendar] cleanup deleted ${deleted} prior WOF event(s) for user ${userId}`)
}

/**
 * Fallback cleanup by title text (actual ids from list response), useful when prior rows
 * were created with versioned ids we no longer know upfront.
 */
async function deleteWofEventsBySummaries(
  accessToken: string,
  calendarId: string,
  summaries: string[]
): Promise<void> {
  const base = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`
  let deleted = 0
  for (const summary of summaries) {
    const u = new URL(base)
    u.searchParams.set('singleEvents', 'false')
    u.searchParams.set('maxResults', '250')
    u.searchParams.set('q', summary)
    const listRes = await fetch(u.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const listJson = (await listRes.json().catch(() => ({}))) as {
      items?: Array<{ id?: string; summary?: string }>
      error?: { message?: string }
    }
    if (!listRes.ok) {
      throw new Error(listJson.error?.message || `Calendar list by summary failed (${listRes.status})`)
    }
    for (const ev of listJson.items ?? []) {
      const id = ev.id
      if (!id) continue
      const delRes = await fetch(`${base}/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!delRes.ok && delRes.status !== 404) {
        const errBody = (await delRes.json().catch(() => ({}))) as { error?: { message?: string } }
        throw new Error(errBody.error?.message || `DELETE summary-matched event failed (${delRes.status})`)
      }
      deleted += 1
    }
  }
  console.log(`${getLogTimestamp()} [google-calendar] summary cleanup deleted ${deleted} event(s)`)
}

/**
 * Deletes master events at our deterministic IDs (`googleStableEventId`), in case list-by-property
 * missed them (e.g. missing extended props on an older row).
 */
async function deleteStableWofEventIds(accessToken: string, calendarId: string, userId: string): Promise<void> {
  const base = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`
  const kinds: Array<'morning' | 'evening' | 'weekly'> = ['morning', 'evening', 'weekly']
  let removed = 0
  const isAlreadyDeletedMessage = (msg: string | undefined): boolean =>
    String(msg ?? '').toLowerCase().includes('resource has been deleted')
  for (const kind of kinds) {
    const id = googleStableEventId(kind, userId)
    const delRes = await fetch(`${base}/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (delRes.ok) removed += 1
    if (!delRes.ok && delRes.status !== 404) {
      const errBody = (await delRes.json().catch(() => ({}))) as { error?: { message?: string } }
      if (isAlreadyDeletedMessage(errBody.error?.message)) {
        continue
      }
      throw new Error(errBody.error?.message || `DELETE stable event ${id} failed (${delRes.status})`)
    }
  }
  console.log(`${getLogTimestamp()} [google-calendar] stable-id cleanup removed ${removed} event(s) for user ${userId}`)
}

/** Let Google’s backend settle after DELETE before reusing the same custom `id` on POST. */
const GOOGLE_EVENT_CREATE_AFTER_DELETE_MS = 500
/** Extra wait when Google still reports id conflict after a delete. */
const GOOGLE_EVENT_ID_CONFLICT_RETRY_WAIT_MS = 2000

/**
 * Force a clean slate for this stable `id`: DELETE (ignore 404), brief delay, then POST.
 * Avoids 409 "The requested identifier already exists" when an old row still held the id.
 */
async function upsertRecurringEvent(
  accessToken: string,
  calendarId: string,
  _userId: string,
  _kind: 'morning' | 'evening' | 'weekly',
  eventId: string,
  eventPayload: Record<string, unknown>
): Promise<void> {
  const encodedCal = encodeURIComponent(calendarId)
  const encodedId = encodeURIComponent(eventId)
  const eventUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodedCal}/events/${encodedId}`
  const insertUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodedCal}/events`
  const isAlreadyDeletedMessage = (msg: string | undefined): boolean =>
    String(msg ?? '').toLowerCase().includes('resource has been deleted')
  const isIdentifierConflict = (msg: string | undefined): boolean =>
    String(msg ?? '').toLowerCase().includes('the requested identifier already exists')

  const deleteIfPresent = async (): Promise<void> => {
    const delRes = await fetch(eventUrl, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!delRes.ok && delRes.status !== 404) {
      const errBody = (await delRes.json().catch(() => ({}))) as { error?: { message?: string } }
      if (isAlreadyDeletedMessage(errBody.error?.message)) {
        return
      }
      throw new Error(errBody.error?.message || `Calendar DELETE failed (${delRes.status})`)
    }
  }

  const postCreate = async (): Promise<{ ok: boolean; message?: string; status: number }> => {
    const body = { id: eventId, ...eventPayload }
    const postRes = await fetch(insertUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    const postJson = (await postRes.json().catch(() => ({}))) as { error?: { message?: string; code?: number } }
    if (postRes.ok) return { ok: true, status: postRes.status }
    return { ok: false, status: postRes.status, message: postJson.error?.message || `Calendar POST failed (${postRes.status})` }
  }

  await deleteIfPresent()

  await new Promise<void>((resolve) => setTimeout(resolve, GOOGLE_EVENT_CREATE_AFTER_DELETE_MS))

  const firstCreate = await postCreate()
  if (firstCreate.ok) return

  if (firstCreate.status === 409 && isIdentifierConflict(firstCreate.message)) {
    await new Promise<void>((resolve) => setTimeout(resolve, GOOGLE_EVENT_ID_CONFLICT_RETRY_WAIT_MS))
    await deleteIfPresent()
    await new Promise<void>((resolve) => setTimeout(resolve, GOOGLE_EVENT_CREATE_AFTER_DELETE_MS))
    const secondCreate = await postCreate()
    if (secondCreate.ok) return
    throw new Error(secondCreate.message || `Calendar POST failed (${secondCreate.status})`)
  }

  throw new Error(firstCreate.message || `Calendar POST failed (${firstCreate.status})`)
}

/**
 * Syncs Wheel of Founders events in Google Calendar: deletes prior WOF-tagged events + stable-ID rows,
 * then for each reminder DELETEs that stable id (404 OK), waits, and POSTs a fresh recurring series.
 */
export async function syncRemindersToGoogleCalendar(
  userId: string,
  options?: SyncGoogleCalendarOptions
): Promise<boolean> {
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
  const tz = resolveUserTimezoneForSync(
    userId,
    options?.requestTimeZone,
    (profileData as { timezone?: string | null } | null)?.timezone
  )
  const calendarId = tokenRow.calendar_id || 'primary'

  console.log(`${getLogTimestamp()} [google-calendar] syncRemindersToGoogleCalendar`, {
    userId,
    timezone: tz,
    morning: hm(settings?.morning_time, '09:00'),
    evening: hm(settings?.evening_time, '20:00'),
    rawMorning: settings?.morning_time,
    rawEvening: settings?.evening_time,
  })

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

  // Version seed changes each sync; IDs remain valid custom ids (hex chars only).
  const idVersion = createHash('sha256')
    .update(`${Date.now()}:${userId}`)
    .digest('hex')
    .slice(0, 4)

  await deleteAllWofEvents(accessToken, calendarId, userId)
  await deleteWofEventsBySummaries(accessToken, calendarId, [
    'Morning plan with Mrs. Deer',
    'Evening reflection with Mrs. Deer',
    'Weekly Insight Ready',
  ])
  /** Same `googleStableEventId` values as upsert — catches masters the property-list missed. */
  await deleteStableWofEventIds(accessToken, calendarId, userId)

  const morningOn = (settings?.morning_enabled ?? true) === true
  const eveningOn = (settings?.evening_enabled ?? true) === true
  const weeklyOn = (settings?.weekly_insights_enabled ?? true) === true
  const morningTime = hm(settings?.morning_time, '09:00')
  const eveningTime = hm(settings?.evening_time, '20:00')

  const todayYmd = formatInTimeZone(new Date(), tz, 'yyyy-MM-dd')
  const mondayAnchor = getUpcomingMondayAnchorInTimeZone(tz, new Date())
  const weeklyAnchorYmd = formatInTimeZone(mondayAnchor, tz, 'yyyy-MM-dd')

  if (morningOn) {
    const id = googleVersionedEventId('morning', userId, idVersion)
    const payload = buildRecurringEventBody({
      userId,
      kind: 'morning',
      timezone: tz,
      title: '🌅 Morning plan with Mrs. Deer',
      description: 'Set your top priorities and start the day with clarity.',
      path: '/morning',
      anchorYmd: todayYmd,
      hhmm: morningTime,
      rrule: 'RRULE:FREQ=DAILY',
      durationMinutes: 60,
      debugLabel: 'morning',
    })
    await upsertRecurringEvent(accessToken, calendarId, userId, 'morning', id, payload)
  }

  if (eveningOn) {
    const id = googleVersionedEventId('evening', userId, idVersion)
    const payload = buildRecurringEventBody({
      userId,
      kind: 'evening',
      timezone: tz,
      title: '🌙 Evening reflection with Mrs. Deer',
      description: 'Close your daily loop and capture wins, lessons, and patterns.',
      path: '/evening',
      anchorYmd: todayYmd,
      hhmm: eveningTime,
      rrule: 'RRULE:FREQ=DAILY',
      durationMinutes: 60,
      debugLabel: 'evening',
    })
    await upsertRecurringEvent(accessToken, calendarId, userId, 'evening', id, payload)
  }

  if (weeklyOn) {
    const id = googleVersionedEventId('weekly', userId, idVersion)
    const payload = buildRecurringEventBody({
      userId,
      kind: 'weekly',
      timezone: tz,
      title: 'Weekly Insight Ready',
      description: 'Your weekly founder insight is available.',
      path: '/weekly',
      anchorYmd: weeklyAnchorYmd,
      hhmm: '09:00',
      rrule: 'RRULE:FREQ=WEEKLY;BYDAY=MO',
      durationMinutes: 60,
      debugLabel: 'weekly',
    })
    await upsertRecurringEvent(accessToken, calendarId, userId, 'weekly', id, payload)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- new table
  await (db.from('google_calendar_tokens') as any)
    .update({ updated_at: new Date().toISOString() })
    .eq('user_id', userId)

  return true
}
