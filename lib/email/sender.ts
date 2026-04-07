import { getServerSupabase } from '@/lib/server-supabase'
import { getUserEmailPreferencesV1 } from './preferences-v1'
import { sendTransactionalEmail } from './transactional'
import type { RetentionEmailType, SendSkipReason } from './triggers'
import { EMAIL_LOG_ID_TOKEN } from './templates/layout'
import { getVariantForUser } from './ab-testing'
import { buildPersonalizedEmailContext } from './personalization'
import { unsubscribeUrl } from './templates/layout'
import { getActiveEmailCapture } from '@/lib/email/email-capture-context'

export interface SendEmailWithTrackingOptions {
  userId: string
  emailType: RetentionEmailType
  dateKey: string
  subject: string
  html: string
  text: string
  templateData?: Record<string, unknown>
  force?: boolean
}

const ALLOWED_TYPES_BY_FREQUENCY: Record<string, Set<RetentionEmailType>> = {
  daily: new Set([
    'welcome',
    'morning_reminder',
    'evening_reminder',
    'first_full_loop',
    'weekly_insight',
    'monthly_insight',
    'quarterly_insight_first',
    'insights_bundle',
    'badge_earned',
    'streak_milestone',
    'feature_unlock',
    'founder_archetype_full',
    'inactivity_reminder',
  ]),
  weekly_only: new Set([
    'welcome',
    'weekly_insight',
    'monthly_insight',
    'quarterly_insight_first',
    'insights_bundle',
    'founder_archetype_full',
    'inactivity_reminder',
  ]),
  achievements_only: new Set([
    'welcome',
    'weekly_insight',
    'monthly_insight',
    'quarterly_insight_first',
    'insights_bundle',
    'badge_earned',
    'streak_milestone',
    'feature_unlock',
    'founder_archetype_full',
    'inactivity_reminder',
  ]),
  none: new Set(['welcome', 'inactivity_reminder']),
}

export async function sendEmailWithTracking(
  options: SendEmailWithTrackingOptions
): Promise<{ sent: boolean; reason?: SendSkipReason; messageId?: string; emailLogId?: string }> {
  const { userId, emailType, dateKey, subject, html, text, templateData, force } = options
  const db = getServerSupabase()

  if (process.env.NODE_ENV === 'development') {
    const capture = getActiveEmailCapture()
    if (capture) {
      capture({ userId, emailType, dateKey, subject, html, text, templateData })
      return { sent: false, reason: 'captured' }
    }
  }

  if (process.env.EMAIL_RETENTION_V1 !== 'true' && !force) {
    return { sent: false, reason: 'feature_flag_off' }
  }

  const prefs = await getUserEmailPreferencesV1(userId)
  if (prefs.unsubscribedAt && !force) {
    return { sent: false, reason: 'unsubscribed' }
  }

  if (!force) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- custom email_logs columns pending generated typing
    const { data: bounced } = await (db.from('email_logs') as any)
      .select('id')
      .eq('user_id', userId)
      .eq('bounced', true)
      .limit(1)
      .maybeSingle()
    if (bounced) return { sent: false, reason: 'frequency_blocked' }

    const allowed = ALLOWED_TYPES_BY_FREQUENCY[prefs.frequency]
    if (!allowed?.has(emailType)) {
      return { sent: false, reason: 'frequency_blocked' }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- email_logs typing gap in generated schema
  const { data: existing } = await (db.from('email_logs') as any)
    .select('id')
    .eq('user_id', userId)
    .eq('email_type', emailType)
    .eq('date_key', dateKey)
    .maybeSingle()
  if (existing) return { sent: false, reason: 'already_sent' }

  const userRes = await db.auth.admin.getUserById(userId)
  const toEmail = userRes.data.user?.email
  if (!toEmail) return { sent: false, reason: 'no_email' }

  const emailLogId = crypto.randomUUID()
  let finalSubject = subject
  let finalHtml = html
  let finalText = text
  let abTestId: string | null = null
  let abVariant: 'A' | 'B' | null = null

  const ab = await getVariantForUser(userId, emailType)
  if (ab) {
    abTestId = ab.testId
    abVariant = ab.variant
    finalSubject = ab.subject || finalSubject
    if (ab.content && ab.content.trim()) {
      finalHtml = `${finalHtml}<p>${ab.content}</p>`
      finalText = `${finalText}\n\n${ab.content}`
    }
  }

  // Personalization fallback for key templates when render-time data was sparse.
  if (
    emailType === 'morning_reminder' ||
    emailType === 'evening_reminder' ||
    emailType === 'weekly_insight' ||
    emailType === 'monthly_insight' ||
    emailType === 'insights_bundle'
  ) {
    const ctx = await buildPersonalizedEmailContext(userId)
    if (!templateData?.growthEdge && ctx.growthEdge) {
      finalText = `${finalText}\n\nTip: ${ctx.growthEdge}`
    }
    if (emailType === 'evening_reminder' && !templateData?.recentWin && ctx.recentWin) {
      finalText = `${finalText}\n\nMrs. Deer noticed: "${ctx.recentWin}"`
    }
    if (
      emailType === 'weekly_insight' &&
      templateData?.weeklyInsightVariant !== 'first_unlock' &&
      !templateData?.weeklyInsight &&
      !templateData?.weeklyInsightText &&
      ctx.weeklyInsight
    ) {
      finalText = `${finalText}\n\n${ctx.weeklyInsight}`
    }
    if (
      emailType === 'monthly_insight' &&
      templateData?.monthlyInsightVariant !== 'first_unlock' &&
      !templateData?.monthlyInsight &&
      ctx.weeklyInsight
    ) {
      finalText = `${finalText}\n\n${ctx.weeklyInsight}`
    }
  }

  const compiledSubject = finalSubject.replaceAll(EMAIL_LOG_ID_TOKEN, emailLogId)
  const compiledHtml = finalHtml.replaceAll(EMAIL_LOG_ID_TOKEN, emailLogId)
  const compiledText = finalText.replaceAll(EMAIL_LOG_ID_TOKEN, emailLogId)

  const sendRes = await sendTransactionalEmail({
    to: toEmail,
    toName: userRes.data.user?.user_metadata?.full_name || userRes.data.user?.user_metadata?.name,
    subject: compiledSubject,
    html: compiledHtml,
    text: compiledText,
    headers: {
      'List-Unsubscribe': `<${unsubscribeUrl(Buffer.from(userId).toString('base64url'))}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  })

  if (!sendRes.ok) {
    return { sent: false, reason: 'send_failed' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- email_logs typing gap in generated schema
  await (db.from('email_logs') as any).insert({
    id: emailLogId,
    user_id: userId,
    type: emailType, // legacy compatibility
    email_type: emailType,
    date_key: dateKey,
    ab_test_id: abTestId,
    ab_variant: abVariant,
    sent_at: new Date().toISOString(),
    message_id: sendRes.messageId || null,
  })

  if (sendRes.messageId) {
    try {
      await (db.from('communication_logs') as any).insert({
        user_id: userId,
        email_type: emailType,
        subject: compiledSubject.slice(0, 500),
        resend_id: sendRes.messageId,
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
    } catch (e) {
      console.warn('[sender] communication_logs insert failed', e)
    }
  }

  return { sent: true, messageId: sendRes.messageId, emailLogId }
}

