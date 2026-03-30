import type { SupabaseClient } from '@supabase/supabase-js'

export type ReminderVariationEmailType = 'morning_reminder' | 'evening_reminder'

export async function fetchRecentReminderVariationIds(
  db: SupabaseClient,
  userId: string,
  emailType: ReminderVariationEmailType,
  days = 30
): Promise<Set<number>> {
  const since = new Date(Date.now() - days * 864e5).toISOString()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- new table until types regenerated
  const { data, error } = await (db.from('user_email_variation_log') as any)
    .select('variation_id')
    .eq('user_id', userId)
    .eq('email_type', emailType)
    .gte('sent_at', since)
  if (error) {
    console.warn('[reminder-variation-log] fetch failed', error.message)
    return new Set()
  }
  return new Set(
    ((data || []) as Array<{ variation_id?: number }>)
      .map((r) => r.variation_id)
      .filter((n): n is number => typeof n === 'number' && n >= 1 && n <= 20)
  )
}

export async function logReminderVariationUsed(
  db: SupabaseClient,
  userId: string,
  emailType: ReminderVariationEmailType,
  variationId: number
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db.from('user_email_variation_log') as any).insert({
    user_id: userId,
    email_type: emailType,
    variation_id: variationId,
  })
  if (error) {
    console.warn('[reminder-variation-log] insert failed', error.message)
  }
}
