import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/server-supabase'
import { sendEmailWithTracking } from '@/lib/email/sender'
import { renderEmailTemplate } from '@/lib/email/templates'
import { buildPersonalizedEmailContext } from '@/lib/email/personalization'
import { fetchRecentReminderVariationIds, logReminderVariationUsed } from '@/lib/email/reminder-variation-log'
import { pickReminderVariationId, buildReminderVariationEmailParts } from '@/lib/email/reminder-variations'
import { getOptimizedReminderTimes } from '@/lib/email/send-time-optimizer'
import { authorizeCronRequest } from '@/lib/cron-auth'

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

function isWithinWindow(localNow: Date, hhmm: string, minutes = 5): boolean {
  const [h, m] = hhmm.split(':').map((v) => Number(v))
  if (!Number.isFinite(h) || !Number.isFinite(m)) return false
  const target = h * 60 + m
  const nowMin = localNow.getUTCHours() * 60 + localNow.getUTCMinutes()
  return Math.abs(nowMin - target) <= minutes
}

export async function GET(req: NextRequest) {
  try {
    const auth = authorizeCronRequest(req)
    if (!auth.ok) return NextResponse.json({ error: 'Unauthorized', reason: auth.reason }, { status: 401 })

    if (process.env.EMAIL_RETENTION_V1 !== 'true') {
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
    const results: Array<{
      userId: string
      type?: string
      sent: boolean
      reason?: string
      scheduledAt?: string
      smart?: boolean
    }> = []

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
        results.push({ userId, sent: false, reason: 'unsubscribed' })
        continue
      }
      if (bouncedUsers.has(userId)) {
        skipped++
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

      if (isWithinWindow(localNow, morningTime) && !morningCompleted) {
        const user = await db.auth.admin.getUserById(userId)
        const authUser = user.data.user
        const ctx = await buildPersonalizedEmailContext(userId, { planDate, authUser })
        const blockedMorning = await fetchRecentReminderVariationIds(db, userId, 'morning_reminder')
        const hasRecentTheme = Boolean(ctx.recentThemeSnippet && ctx.recentThemeSnippet.length >= 12)
        const hasRecentIntention = Boolean(
          ctx.todaysIntentionSnippet && ctx.todaysIntentionSnippet.length >= 8
        )
        const morningVariationId = pickReminderVariationId({
          kind: 'morning',
          streak: ctx.streak,
          hasRecentTheme,
          hasRecentIntention,
          dayOfWeek: localNow.getUTCDay(),
          blocked: blockedMorning,
          random: Math.random,
        })
        const morningParts = buildReminderVariationEmailParts({
          kind: 'morning',
          variationId: morningVariationId,
          params: {
            displayName: ctx.userName,
            streak: ctx.streak,
            recentTheme: ctx.recentThemeSnippet,
            recentIntention: ctx.todaysIntentionSnippet,
          },
        })
        const morningTemplateData = {
          ...(ctx as unknown as Record<string, unknown>),
          reminderVariationId: morningParts.variationId,
          reminderSubject: morningParts.subject,
          reminderPreheader: morningParts.preheader,
          reminderOpeningHtml: `<p style="margin:0 0 16px 0;line-height:1.65;">${morningParts.openingParagraph}</p>`,
          reminderOpeningPlain: morningParts.openingParagraph,
        }
        const rendered = renderEmailTemplate(
          'morning_reminder',
          { name: ctx.userName, email: authUser?.email },
          morningTemplateData
        )
        const res = await sendEmailWithTracking({
          userId,
          emailType: 'morning_reminder',
          dateKey: planDate,
          templateData: morningTemplateData,
          ...rendered,
        })
        if (res.sent) {
          sent++
          await logReminderVariationUsed(db, userId, 'morning_reminder', morningParts.variationId)
        } else skipped++
        results.push({
          userId,
          type: 'morning_reminder',
          sent: res.sent,
          reason: res.reason,
          // debug fields are intentionally lightweight for cron auditability
          scheduledAt: morningTime,
          smart: optimized.usedSmartMorning,
        })
      }

      if (isWithinWindow(localNow, eveningTime) && morningCompleted && !eveningCompleted) {
        const user = await db.auth.admin.getUserById(userId)
        const authUser = user.data.user
        const ctx = await buildPersonalizedEmailContext(userId, { planDate, authUser })
        const blockedEvening = await fetchRecentReminderVariationIds(db, userId, 'evening_reminder')
        const hasRecentTheme = Boolean(ctx.recentThemeSnippet && ctx.recentThemeSnippet.length >= 12)
        const hasRecentIntention = Boolean(ctx.todaysIntentionSnippet && ctx.todaysIntentionSnippet.length >= 8)
        const eveningVariationId = pickReminderVariationId({
          kind: 'evening',
          streak: ctx.streak,
          hasRecentTheme,
          hasRecentIntention,
          dayOfWeek: localNow.getUTCDay(),
          blocked: blockedEvening,
          random: Math.random,
        })
        const eveningParts = buildReminderVariationEmailParts({
          kind: 'evening',
          variationId: eveningVariationId,
          params: {
            displayName: ctx.userName,
            streak: ctx.streak,
            recentTheme: ctx.recentThemeSnippet,
            recentIntention: ctx.todaysIntentionSnippet,
          },
        })
        const eveningTemplateData = {
          ...(ctx as unknown as Record<string, unknown>),
          reminderVariationId: eveningParts.variationId,
          reminderSubject: eveningParts.subject,
          reminderPreheader: eveningParts.preheader,
          reminderOpeningHtml: `<p style="margin:0 0 16px 0;line-height:1.65;">${eveningParts.openingParagraph}</p>`,
          reminderOpeningPlain: eveningParts.openingParagraph,
        }
        const rendered = renderEmailTemplate(
          'evening_reminder',
          { name: ctx.userName, email: authUser?.email },
          eveningTemplateData
        )
        const res = await sendEmailWithTracking({
          userId,
          emailType: 'evening_reminder',
          dateKey: planDate,
          templateData: eveningTemplateData,
          ...rendered,
        })
        if (res.sent) {
          sent++
          await logReminderVariationUsed(db, userId, 'evening_reminder', eveningParts.variationId)
        } else skipped++
        results.push({
          userId,
          type: 'evening_reminder',
          sent: res.sent,
          reason: res.reason,
          scheduledAt: eveningTime,
          smart: optimized.usedSmartEvening,
        })
      }
    }

    return NextResponse.json({ success: true, sent, skipped, processed: results.length, results: results.slice(0, 100) })
  } catch (err) {
    console.error('[cron/send-email-reminders] error', err)
    return NextResponse.json({ error: 'Failed to send email reminders' }, { status: 500 })
  }
}

