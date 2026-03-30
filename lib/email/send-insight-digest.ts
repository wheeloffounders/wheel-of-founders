import type { SupabaseClient } from '@supabase/supabase-js'
import { formatInTimeZone } from 'date-fns-tz'
import { sendEmailWithTracking } from '@/lib/email/sender'
import { renderEmailTemplate } from '@/lib/email/templates'
import { buildPersonalizedEmailContext } from '@/lib/email/personalization'
import { fetchWeeklyInsightEmailStats } from '@/lib/email/weekly-insight-email-stats'
import { journeyWeekNumberFromDaysWithEntries } from '@/lib/email/weekly-journey-messages'
import type { InsightsBundlePart } from '@/lib/email/templates/insightsBundle'
import type { SendSkipReason } from '@/lib/email/triggers'

const INSIGHT_EMAIL_TYPES = [
  'weekly_insight',
  'monthly_insight',
  'quarterly_insight_first',
  'founder_archetype_full',
  'insights_bundle',
] as const

function isoToLocalYmd(iso: string, timeZone: string): string {
  return formatInTimeZone(new Date(iso), timeZone, 'yyyy-MM-dd')
}

function ymdPlusDaysUtc(ymd: string, delta: number): string {
  const d = new Date(`${ymd}T12:00:00.000Z`)
  d.setUTCDate(d.getUTCDate() + delta)
  return d.toISOString().slice(0, 10)
}

function resolveWeeklyInsightPeriod(
  weeklyWeekStart: string | null | undefined,
  weeklyWeekEnd: string | null | undefined,
  localYmd: string
): { weekStart: string; weekEnd: string } {
  if (weeklyWeekStart && weeklyWeekEnd) {
    return { weekStart: weeklyWeekStart, weekEnd: weeklyWeekEnd }
  }
  if (weeklyWeekStart) {
    return { weekStart: weeklyWeekStart, weekEnd: ymdPlusDaysUtc(weeklyWeekStart, 6) }
  }
  return { weekStart: localYmd, weekEnd: localYmd }
}

async function anyInsightEmailSentOnLocalDay(
  db: SupabaseClient,
  userId: string,
  timeZone: string,
  localYmd: string
): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- email_logs typing gap
  const { data } = await (db.from('email_logs') as any)
    .select('sent_at, email_type')
    .eq('user_id', userId)
    .in('email_type', [...INSIGHT_EMAIL_TYPES])
    .order('sent_at', { ascending: false })
    .limit(40)
  for (const row of (data ?? []) as Array<{ sent_at?: string; email_type?: string }>) {
    const at = row.sent_at
    if (!at) continue
    if (isoToLocalYmd(at, timeZone) === localYmd) return true
  }
  return false
}

export type SendInsightDigestParams = {
  userId: string
  timeZone: string
  db: SupabaseClient
  now?: Date
  /** Prefer cron-generated text when available */
  weeklyInsightText?: string | null
  monthlyInsightText?: string | null
  quarterlyInsightText?: string | null
  /** For single weekly email date_key (year-Www) and stats window */
  weeklyWeekStart?: string | null
  /** Inclusive end of insight period (YYYY-MM-DD); defaults to weekStart+6 or send day */
  weeklyWeekEnd?: string | null
  /** For single monthly email date_key — previous calendar month `yyyy-MM` (insight generated on 1st) */
  monthlyPeriodYyyymm?: string | null
}

/**
 * Sends one combined email when 2+ insight bodies are available for the user's local day;
 * otherwise sends the existing single weekly or monthly template.
 * Call after writing weekly_insights / insight_history so DB can fill sibling slots.
 */
export async function sendInsightDigestEmail(
  params: SendInsightDigestParams
): Promise<{ sent: boolean; reason?: SendSkipReason | 'nothing_to_send' | 'already_sent_today' }> {
  const {
    userId,
    timeZone,
    db,
    now = new Date(),
    weeklyInsightText: weeklyOverride,
    monthlyInsightText: monthlyOverride,
    quarterlyInsightText: quarterlyOverride,
    weeklyWeekStart,
    weeklyWeekEnd,
    monthlyPeriodYyyymm,
  } = params

  const localYmd = formatInTimeZone(now, timeZone, 'yyyy-MM-dd')

  if (await anyInsightEmailSentOnLocalDay(db, userId, timeZone, localYmd)) {
    return { sent: false, reason: 'already_sent_today' }
  }

  let weeklyText = (weeklyOverride ?? '').trim()
  let monthlyText = (monthlyOverride ?? '').trim()
  let quarterlyText = (quarterlyOverride ?? '').trim()

  if (!weeklyText) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: wRows } = await (db.from('weekly_insights') as any)
      .select('insight_text, generated_at')
      .eq('user_id', userId)
      .order('generated_at', { ascending: false })
      .limit(8)
    for (const row of (wRows ?? []) as Array<{ insight_text?: string; generated_at?: string }>) {
      const ga = row.generated_at
      const t = String(row.insight_text ?? '').trim()
      if (!ga || !t) continue
      if (isoToLocalYmd(ga, timeZone) === localYmd) {
        weeklyText = t
        break
      }
    }
  }

  if (!monthlyText || !quarterlyText) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: hRows } = await (db.from('insight_history') as any)
      .select('insight_type, insight_text, created_at')
      .eq('user_id', userId)
      .in('insight_type', ['monthly', 'quarterly'])
      .order('created_at', { ascending: false })
      .limit(24)
    for (const row of (hRows ?? []) as Array<{
      insight_type?: string
      insight_text?: string
      created_at?: string
    }>) {
      const ca = row.created_at
      const t = String(row.insight_text ?? '').trim()
      if (!ca || !t) continue
      if (isoToLocalYmd(ca, timeZone) !== localYmd) continue
      if (row.insight_type === 'monthly' && !monthlyText) monthlyText = t
      if (row.insight_type === 'quarterly' && !quarterlyText) quarterlyText = t
    }
  }

  const parts: InsightsBundlePart[] = []
  if (weeklyText) {
    parts.push({
      key: 'weekly',
      heading: "Here's what I noticed this week",
      preview: weeklyText,
      ctaLabel: 'Read Weekly Insight →',
      ctaPath: '/weekly',
      utmCampaign: 'weekly_insight',
    })
  }
  if (monthlyText) {
    parts.push({
      key: 'monthly',
      heading: 'Looking at the bigger picture of your month',
      preview: monthlyText,
      ctaLabel: 'Read Monthly Insight →',
      ctaPath: '/monthly-insight',
      utmCampaign: 'monthly_insight',
    })
  }
  if (quarterlyText) {
    parts.push({
      key: 'quarterly',
      heading: 'Your quarter in focus',
      preview: quarterlyText,
      ctaLabel: 'Read Quarterly Insight →',
      ctaPath: '/quarterly',
      utmCampaign: 'quarterly_insight',
    })
  }

  if (parts.length === 0) {
    return { sent: false, reason: 'nothing_to_send' }
  }

  const user = await db.auth.admin.getUserById(userId)
  const templateUser = {
    name: user.data.user?.user_metadata?.full_name || user.data.user?.user_metadata?.name || user.data.user?.email,
    email: user.data.user?.email,
  }
  const ctx = await buildPersonalizedEmailContext(userId)

  if (parts.length >= 2) {
    const rendered = renderEmailTemplate('insights_bundle', templateUser, {
      ...ctx,
      insightsBundleParts: parts,
    })
    return sendEmailWithTracking({
      userId,
      emailType: 'insights_bundle',
      dateKey: `digest-${localYmd}`,
      templateData: { ...ctx, insightsBundleParts: parts },
      ...rendered,
    })
  }

  const only = parts[0]!
  if (only.key === 'weekly') {
    const weekDate = weeklyWeekStart ? new Date(weeklyWeekStart + 'T12:00:00') : new Date()
    const year = weekDate.getUTCFullYear()
    const jan1 = new Date(Date.UTC(year, 0, 1))
    const isoWeekNumber = Math.ceil(
      (((weekDate.getTime() - jan1.getTime()) / 86400000) + jan1.getUTCDay() + 1) / 7
    )
    const dateKey = `${year}-W${String(Math.max(1, isoWeekNumber)).padStart(2, '0')}`
    const insightPeriod = resolveWeeklyInsightPeriod(weeklyWeekStart, weeklyWeekEnd, localYmd)
    let emailStats: Awaited<ReturnType<typeof fetchWeeklyInsightEmailStats>> | null = null
    try {
      emailStats = await fetchWeeklyInsightEmailStats(userId, db, insightPeriod)
    } catch {
      emailStats = null
    }
    const journeyWeekNumber = emailStats
      ? emailStats.weeklyJourneyWeekNumber
      : journeyWeekNumberFromDaysWithEntries(ctx.streak)
    const weeklyTemplateData = {
      ...ctx,
      weeklyInsightText: weeklyText,
      weeklyJourneyWeekNumber: journeyWeekNumber,
      daysWithEntries: emailStats?.daysWithEntries,
      tasksCompleted: emailStats?.tasksCompleted ?? 0,
      decisionsMade: emailStats?.decisionsMade ?? 0,
      weeklyInsightStatsScope: emailStats?.statsScope ?? 'cumulative_to_date',
    }
    const rendered = renderEmailTemplate('weekly_insight', templateUser, weeklyTemplateData)
    return sendEmailWithTracking({
      userId,
      emailType: 'weekly_insight',
      dateKey,
      templateData: weeklyTemplateData,
      ...rendered,
    })
  }

  if (only.key === 'monthly') {
    const dateKey =
      monthlyPeriodYyyymm && /^\d{4}-\d{2}$/.test(monthlyPeriodYyyymm)
        ? monthlyPeriodYyyymm
        : localYmd.slice(0, 7)
    const rendered = renderEmailTemplate('monthly_insight', templateUser, {
      ...ctx,
      monthlyInsightText: monthlyText,
    })
    return sendEmailWithTracking({
      userId,
      emailType: 'monthly_insight',
      dateKey,
      templateData: { ...ctx, monthlyInsightText: monthlyText },
      ...rendered,
    })
  }

  const rendered = renderEmailTemplate('insights_bundle', templateUser, {
    ...ctx,
    insightsBundleParts: parts,
  })
  return sendEmailWithTracking({
    userId,
    emailType: 'insights_bundle',
    dateKey: `digest-${localYmd}-quarterly`,
    templateData: { ...ctx, insightsBundleParts: parts },
    ...rendered,
  })
}
