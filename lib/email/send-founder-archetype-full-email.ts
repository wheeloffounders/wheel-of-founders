import { getServerSupabase } from '@/lib/server-supabase'
import { renderEmailTemplate } from '@/lib/email/templates'
import { sendEmailWithTracking } from '@/lib/email/sender'
import { ARCHETYPE_FULL_MIN_DAYS } from '@/lib/founder-dna/archetype-timing'
import { buildPersonalizedEmailContext } from '@/lib/email/personalization'

const DATE_KEY = 'founder_archetype_full_unlock'

/**
 * Warm milestone email when full archetype unlocks (31+ days). Preview at 21 days has no email.
 */
export async function sendFounderArchetypeFullEmail(userId: string, daysWithEntries: number): Promise<void> {
  const db = getServerSupabase()
  try {
    const userRes = await db.auth.admin.getUserById(userId)
    const u = userRes.data.user
    const ctx = await buildPersonalizedEmailContext(userId)
    const templateUser = {
      name: u?.user_metadata?.full_name || u?.user_metadata?.name || u?.email,
      email: u?.email,
      login_count: ctx.loginCount,
    }
    const rendered = renderEmailTemplate('founder_archetype_full', templateUser, {
      daysWithEntries: Math.max(ARCHETYPE_FULL_MIN_DAYS, daysWithEntries),
    })
    await sendEmailWithTracking({
      userId,
      emailType: 'founder_archetype_full',
      dateKey: DATE_KEY,
      templateData: { daysWithEntries },
      ...rendered,
    })
  } catch {
    // non-blocking
  }
}
