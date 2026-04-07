import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/server-supabase'
import { getOptimizedReminderTimes } from '@/lib/email/send-time-optimizer'
import { authorizeCronRequest } from '@/lib/cron-auth'
import { describeSilentReminderSkip } from '@/lib/email/reminder-skip-reason'
import { sendEveningReminderShard, sendMorningReminderShard } from '@/lib/email/send-reminder-cron-shards'
import { isEmailRetentionV1Enabled } from '@/lib/email/retention-flag'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Daily morning / evening reminder emails (5‑minute local windows).
 *
 * Gates (see loop): retention off only if `EMAIL_RETENTION_V1=false`, unsubscribe, bounce list, then
 * **`user_profiles.last_email_open_at`** — if set and older than 90 days, skip (new users with NULL
 * are not skipped). Evening nudge does **not** require morning tasks complete.
 */

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

function isWithinWindow(localNow: Date, hhmm: string, minutes = 5): boolean {
  const [h, m] = hhmm.split(':').map((v) => Number(v))
  if (!Number.isFinite(h) || !Number.isFinite(m)) return false
  const target = h * 60 + m
  const nowMin = localNow.getUTCHours() * 60 + localNow.getUTCMinutes()
  return Math.abs(nowMin - target) <= minutes
}

type ReminderResult = {
  userId: string
  type?: string
  sent: boolean
  reason?: string
  scheduledAt?: string
  smart?: boolean
  silentCode?: string
  silentDetail?: string
}

function logDebug(userId: string, debugUserId: string | null, msg: string, extra?: Record<string, unknown>) {
  if (!debugUserId || userId !== debugUserId) return
  console.log(`[cron/send-email-reminders] User ID: ${userId} | ${msg}`, extra ?? '')
}

export async function GET(req: NextRequest) {
  try {
    const auth = authorizeCronRequest(req)
    if (!auth.ok) return NextResponse.json({ error: 'Unauthorized', reason: auth.reason }, { status: 401 })

    const debugUserId = req.nextUrl.searchParams.get('debugUserId')
    const verboseSilent = req.nextUrl.searchParams.get('verboseSilent') === '1'

    if (!isEmailRetentionV1Enabled()) {
      return NextResponse.json({ success: true, sent: 0, skipped: 0, reason: 'feature_flag_off' })
    }

    const db = getServerSupabase()
    const now = new Date()

    const [{ data: settingsRows }, { data: profileRows }, { data: bouncedRows }] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- table fields not yet in generated types
      (db.from('user_notification_settings') as any)
        .select('user_id, email_morning_reminder_time, email_evening_reminder_time, email_frequency, email_unsubscribed_at')
        .neq('email_frequency', 'none'),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- lightweight row projection
      (db.from('user_profiles') as any)
        .select('id, timezone, best_send_hour, best_send_confidence'),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- custom email_logs columns pending generated typing
      (db.from('email_logs') as any)
        .select('user_id')
        .eq('bounced', true),
    ])

    const profileByUser = new Map<
      string,
      { timezone: string; best_send_hour?: number | null; best_send_confidence?: number | null }
    >()
    for (const p of (profileRows || []) as Array<{
      id: string
      timezone?: string | null
      best_send_hour?: number | null
      best_send_confidence?: number | null
    }>) {
      profileByUser.set(p.id, {
        timezone: p.timezone || 'UTC',
        best_send_hour: p.best_send_hour,
        best_send_confidence: p.best_send_confidence,
      })
    }
    const bouncedUsers = new Set(
      ((bouncedRows || []) as Array<{ user_id?: string | null }>)
        .map((r) => r.user_id)
        .filter((v): v is string => Boolean(v))
    )

    let sent = 0
    let skipped = 0
    const results: ReminderResult[] = []

    for (const row of (settingsRows || []) as Array<{
      user_id: string
      email_morning_reminder_time?: string | null
      email_evening_reminder_time?: string | null
      email_frequency?: string | null
      email_unsubscribed_at?: string | null
    }>) {
      const userId = row.user_id
      const profile = profileByUser.get(userId)
      const timezone = profile?.timezone || 'UTC'
      if (row.email_unsubscribed_at) {
        skipped++
        logDebug(userId, debugUserId, 'Skip Reason: unsubscribed')
        results.push({ userId, sent: false, reason: 'unsubscribed' })
        continue
      }
      if (bouncedUsers.has(userId)) {
        skipped++
        logDebug(userId, debugUserId, 'Skip Reason: bounced')
        results.push({ userId, sent: false, reason: 'bounced' })
        continue
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- custom profile columns pending generated typing
      const { data: profileEngagement } = await (db.from('user_profiles') as any)
        .select('last_email_open_at')
        .eq('id', userId)
        .maybeSingle()
      const lastOpenAt =
        (profileEngagement as { last_email_open_at?: string | null } | null)?.last_email_open_at || null
      if (!lastOpenAt || Date.now() - new Date(lastOpenAt).getTime() > 90 * 24 * 60 * 60 * 1000) {
        skipped++
        logDebug(userId, debugUserId, 'Skip Reason: no recent email open (last_email_open_at within 90d required)', {
          lastOpenAt,
        })
        results.push({ userId, sent: false, reason: 'unengaged_90d' })
        continue
      }

      const localNow = dateInTimezone(now, timezone)
      const planDate = getEffectivePlanDateInTimezone(now, timezone)

      const [tasksRes, eveningRes] = await Promise.all([
        db
          .from('morning_tasks')
          .select('completed')
          .eq('user_id', userId)
          .eq('plan_date', planDate),
        db
          .from('evening_reviews')
          .select('id')
          .eq('user_id', userId)
          .eq('review_date', planDate)
          .maybeSingle(),
      ])

      const tasks = (tasksRes.data ?? []) as Array<{ completed?: boolean | null }>
      const morningCompleted = tasks.length > 0 && tasks.every((t) => t.completed === true)
      const eveningCompleted = Boolean(eveningRes.data)

      const optimized = getOptimizedReminderTimes({
        morningFallback: String(row.email_morning_reminder_time || '09:00').slice(0, 5),
        eveningFallback: String(row.email_evening_reminder_time || '20:00').slice(0, 5),
        bestSendHour: profile?.best_send_hour,
        bestSendConfidence: profile?.best_send_confidence,
      })
      const morningTime = optimized.morningTime
      const eveningTime = optimized.eveningTime

      const iteration: ReminderResult[] = []

      if (isWithinWindow(localNow, morningTime) && !morningCompleted) {
        const res = await sendMorningReminderShard({
          db,
          userId,
          planDate,
          morningTime,
          usedSmartMorning: optimized.usedSmartMorning,
          localNow,
        })
        if (res.sent) {
          sent++
        } else skipped++
        iteration.push({
          userId,
          type: 'morning_reminder',
          sent: res.sent,
          reason: res.reason,
          scheduledAt: morningTime,
          smart: res.smart,
        })
      }

      if (isWithinWindow(localNow, eveningTime) && !eveningCompleted) {
        const res = await sendEveningReminderShard({
          db,
          userId,
          planDate,
          eveningTime,
          usedSmartEvening: optimized.usedSmartEvening,
          localNow,
        })
        if (res.sent) {
          sent++
        } else skipped++
        iteration.push({
          userId,
          type: 'evening_reminder',
          sent: res.sent,
          reason: res.reason,
          scheduledAt: eveningTime,
          smart: res.smart,
        })
      }

      if (iteration.length === 0) {
        const silent = describeSilentReminderSkip({
          localNow,
          morningTime,
          eveningTime,
          morningCompleted,
          eveningCompleted,
          timezone,
          isWithinWindow,
        })
        const row: ReminderResult = {
          userId,
          sent: false,
          reason: 'silent_skip',
          silentCode: silent.code,
          silentDetail: silent.detail,
        }
        results.push(row)
        if (verboseSilent || (debugUserId && userId === debugUserId)) {
          console.log(
            `[cron/send-email-reminders] User ID: ${userId} | Skip Reason: ${silent.code} — ${silent.detail}`
          )
        }
      } else {
        results.push(...iteration)
        if (debugUserId && userId === debugUserId) {
          console.log(`[cron/send-email-reminders] User ID: ${userId} | attempts`, iteration)
        }
      }
    }

    return NextResponse.json({
      success: true,
      sent,
      skipped,
      processed: results.length,
      results: results.slice(0, 100),
      hint:
        'Add ?debugUserId=<uuid> for console logs for one user; ?verboseSilent=1 logs every silent_skip (noisy).',
    })
  } catch (err) {
    console.error('[cron/send-email-reminders] error', err)
    return NextResponse.json({ error: 'Failed to send email reminders' }, { status: 500 })
  }
}
