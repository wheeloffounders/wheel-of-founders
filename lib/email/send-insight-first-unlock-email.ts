import { getServerSupabase } from '@/lib/server-supabase'
import { renderEmailTemplate } from '@/lib/email/templates'
import { sendEmailWithTracking } from '@/lib/email/sender'

export type InsightFirstUnlockKind = 'weekly' | 'monthly' | 'quarterly'

/** Stable date keys so one first-unlock email per user per insight type (separate from cron period keys). */
const DATE_KEYS: Record<InsightFirstUnlockKind, string> = {
  weekly: 'weekly_insight_first_unlock',
  monthly: 'monthly_insight_first_unlock',
  quarterly: 'quarterly_insight_first_unlock',
}

/**
 * Warm milestone email at progressive unlock: celebration + CTA to read (content may be filled on the page / later by cron).
 */
export async function sendInsightFirstUnlockEmail(params: {
  userId: string
  kind: InsightFirstUnlockKind
  daysWithEntries: number
}): Promise<void> {
  const { userId, kind, daysWithEntries } = params
  const db = getServerSupabase()
  try {
    const userRes = await db.auth.admin.getUserById(userId)
    const u = userRes.data.user
    const templateUser = {
      name: u?.user_metadata?.full_name || u?.user_metadata?.name || u?.email,
      email: u?.email,
    }

    if (kind === 'quarterly') {
      const rendered = renderEmailTemplate('quarterly_insight_first', templateUser, {
        firstUnlockDaysWithEntries: daysWithEntries,
      })
      await sendEmailWithTracking({
        userId,
        emailType: 'quarterly_insight_first',
        dateKey: DATE_KEYS.quarterly,
        templateData: { firstUnlockDaysWithEntries: daysWithEntries },
        ...rendered,
      })
      return
    }

    if (kind === 'monthly') {
      const rendered = renderEmailTemplate('monthly_insight', templateUser, {
        monthlyInsightVariant: 'first_unlock',
        firstUnlockDaysWithEntries: daysWithEntries,
      })
      await sendEmailWithTracking({
        userId,
        emailType: 'monthly_insight',
        dateKey: DATE_KEYS.monthly,
        templateData: {
          monthlyInsightVariant: 'first_unlock',
          firstUnlockDaysWithEntries: daysWithEntries,
        },
        ...rendered,
      })
      return
    }

    const rendered = renderEmailTemplate('weekly_insight', templateUser, {
      weeklyInsightVariant: 'first_unlock',
      firstUnlockDaysWithEntries: daysWithEntries,
    })
    await sendEmailWithTracking({
      userId,
      emailType: 'weekly_insight',
      dateKey: DATE_KEYS.weekly,
      templateData: {
        weeklyInsightVariant: 'first_unlock',
        firstUnlockDaysWithEntries: daysWithEntries,
      },
      ...rendered,
    })
  } catch {
    // non-blocking (matches feature unlock emails in journey payload)
  }
}
