import type { SupabaseClient } from '@supabase/supabase-js'
import { sendEmailWithTracking } from '@/lib/email/sender'
import { renderEmailTemplate } from '@/lib/email/templates'
import { buildPersonalizedEmailContext } from '@/lib/email/personalization'
import { fetchRecentReminderVariationIds, logReminderVariationUsed } from '@/lib/email/reminder-variation-log'
import { pickReminderVariationId, buildReminderVariationEmailParts } from '@/lib/email/reminder-variations'

type Db = SupabaseClient

export async function sendMorningReminderShard(params: {
  db: Db
  userId: string
  /** Plan date for personalization (yyyy-MM-dd). */
  planDate: string
  /** Log key for email_logs (defaults to planDate; use a unique value for force-send to avoid already_sent). */
  sentDateKey?: string
  morningTime: string
  usedSmartMorning: boolean
  localNow: Date
  /** Bypass prefs / duplicate checks when retention is off; cron force-send only. */
  force?: boolean
}): Promise<{ sent: boolean; reason?: string; scheduledAt?: string; smart?: boolean }> {
  const { db, userId, planDate, sentDateKey, morningTime, usedSmartMorning, localNow, force } = params
  const logDateKey = sentDateKey ?? planDate
  const user = await db.auth.admin.getUserById(userId)
  const authUser = user.data.user
  const ctx = await buildPersonalizedEmailContext(userId, { planDate, authUser })
  const blockedMorning = await fetchRecentReminderVariationIds(db, userId, 'morning_reminder')
  const hasRecentTheme = Boolean(ctx.recentThemeSnippet && ctx.recentThemeSnippet.length >= 12)
  const hasRecentIntention = Boolean(ctx.todaysIntentionSnippet && ctx.todaysIntentionSnippet.length >= 8)
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
    { name: ctx.userName, email: authUser?.email, login_count: ctx.loginCount },
    morningTemplateData
  )
  const res = await sendEmailWithTracking({
    userId,
    emailType: 'morning_reminder',
    dateKey: logDateKey,
    templateData: morningTemplateData,
    ...rendered,
    force,
  })
  if (res.sent) {
    await logReminderVariationUsed(db, userId, 'morning_reminder', morningParts.variationId)
  }
  return {
    sent: res.sent,
    reason: res.reason,
    scheduledAt: morningTime,
    smart: usedSmartMorning,
  }
}

export async function sendEveningReminderShard(params: {
  db: Db
  userId: string
  planDate: string
  sentDateKey?: string
  eveningTime: string
  usedSmartEvening: boolean
  localNow: Date
  force?: boolean
}): Promise<{ sent: boolean; reason?: string; scheduledAt?: string; smart?: boolean }> {
  const { db, userId, planDate, sentDateKey, eveningTime, usedSmartEvening, localNow, force } = params
  const logDateKey = sentDateKey ?? planDate
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
    { name: ctx.userName, email: authUser?.email, login_count: ctx.loginCount },
    eveningTemplateData
  )
  const res = await sendEmailWithTracking({
    userId,
    emailType: 'evening_reminder',
    dateKey: logDateKey,
    templateData: eveningTemplateData,
    ...rendered,
    force,
  })
  if (res.sent) {
    await logReminderVariationUsed(db, userId, 'evening_reminder', eveningParts.variationId)
  }
  return {
    sent: res.sent,
    reason: res.reason,
    scheduledAt: eveningTime,
    smart: usedSmartEvening,
  }
}
