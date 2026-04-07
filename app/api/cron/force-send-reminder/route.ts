import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/server-supabase'
import { authorizeCronRequest } from '@/lib/cron-auth'
import { getOptimizedReminderTimes } from '@/lib/email/send-time-optimizer'
import { sendEveningReminderShard, sendMorningReminderShard } from '@/lib/email/send-reminder-cron-shards'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function dateInTimezone(now: Date, tz: string): Date {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
    .formatToParts(now)
    .reduce<Record<string, string>>((acc, p) => {
      if (p.type !== 'literal') acc[p.type] = p.value
      return acc
    }, {})

  return new Date(
    `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}Z`
  )
}

function getEffectivePlanDateInTimezone(now: Date, timezone: string): string {
  const local = dateInTimezone(now, timezone)
  if (local.getUTCHours() < 4) {
    local.setUTCDate(local.getUTCDate() - 1)
  }
  return local.toISOString().slice(0, 10)
}

/**
 * POST: Send morning or evening reminder immediately (bypasses local time window and cron gates
 * inside `sendEmailWithTracking` when `force: true`). Secured by CRON_SECRET only.
 *
 * Body: { "userId": "uuid", "kind": "morning" | "evening" }
 * Uses a unique `sentDateKey` so this does not collide with normal cron `already_sent` rows.
 */
export async function POST(req: NextRequest) {
  const auth = authorizeCronRequest(req)
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized', reason: auth.reason }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as {
    userId?: string
    kind?: string
  }
  const userId = body.userId
  const kind = body.kind
  if (!userId || (kind !== 'morning' && kind !== 'evening')) {
    return NextResponse.json({ error: 'userId and kind (morning|evening) required' }, { status: 400 })
  }

  const db = getServerSupabase()
  const now = new Date()

  const { data: settingsRow } = await (db.from('user_notification_settings') as any)
    .select('email_morning_reminder_time, email_evening_reminder_time, email_frequency')
    .eq('user_id', userId)
    .maybeSingle()

  const { data: profileRow } = await (db.from('user_profiles') as any)
    .select('timezone, best_send_hour, best_send_confidence')
    .eq('id', userId)
    .maybeSingle()

  const timezone = (profileRow as { timezone?: string | null } | null)?.timezone || 'UTC'
  const planDate = getEffectivePlanDateInTimezone(now, timezone)
  const localNow = dateInTimezone(now, timezone)

  const row = (settingsRow || {}) as {
    email_morning_reminder_time?: string | null
    email_evening_reminder_time?: string | null
  }
  const optimized = getOptimizedReminderTimes({
    morningFallback: String(row.email_morning_reminder_time || '09:00').slice(0, 5),
    eveningFallback: String(row.email_evening_reminder_time || '20:00').slice(0, 5),
    bestSendHour: (profileRow as { best_send_hour?: number | null } | null)?.best_send_hour,
    bestSendConfidence: (profileRow as { best_send_confidence?: number | null } | null)?.best_send_confidence,
  })

  const sentDateKey = `${planDate}-force-${kind}-${Date.now()}`

  if (kind === 'morning') {
    const res = await sendMorningReminderShard({
      db,
      userId,
      planDate,
      sentDateKey,
      morningTime: optimized.morningTime,
      usedSmartMorning: optimized.usedSmartMorning,
      localNow,
      force: true,
    })
    return NextResponse.json({ success: true, kind: 'morning', planDate, sentDateKey, ...res })
  }

  const res = await sendEveningReminderShard({
    db,
    userId,
    planDate,
    sentDateKey,
    eveningTime: optimized.eveningTime,
    usedSmartEvening: optimized.usedSmartEvening,
    localNow,
    force: true,
  })
  return NextResponse.json({ success: true, kind: 'evening', planDate, sentDateKey, ...res })
}
