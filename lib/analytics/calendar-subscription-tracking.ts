import type { SupabaseClient } from '@supabase/supabase-js'

export type CalendarSubscriptionSource =
  | 'google'
  | 'apple'
  | 'outlook'
  | 'webcal'
  | 'issued'
  | 'unknown'

/**
 * Deactivate all subscription rows for a user (e.g. token regenerate).
 */
export async function deactivateCalendarSubscriptionsForUser(
  db: SupabaseClient,
  userId: string
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- new tables
  await (db.from('calendar_subscriptions') as any)
    .update({ is_active: false })
    .eq('user_id', userId)
    .eq('is_active', true)
}

/**
 * Insert an active row if none exists for this token (does not overwrite `source` on existing rows).
 */
export async function ensureCalendarSubscriptionRow(
  db: SupabaseClient,
  params: {
    userId: string
    token: string
    source: CalendarSubscriptionSource
  }
): Promise<void> {
  const token = params.token.trim()
  if (!token) return
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subTable = db.from('calendar_subscriptions') as any
  const { data: existing } = await subTable.select('id').eq('subscription_token', token).maybeSingle()
  if (existing?.id) return
  await subTable.insert({
    user_id: params.userId,
    subscription_token: token,
    source: params.source,
    is_active: true,
  })
}

/**
 * Create or update the row for this token (active). Used when minting a token or user picks a provider.
 */
export async function upsertCalendarSubscriptionByToken(
  db: SupabaseClient,
  params: { userId: string; token: string; source: CalendarSubscriptionSource }
): Promise<void> {
  const token = params.token.trim()
  if (!token) return
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subTable = db.from('calendar_subscriptions') as any
  const { data: row } = await subTable.select('id').eq('subscription_token', token).maybeSingle()
  if (row?.id) {
    const { error } = await subTable
      .update({
        source: params.source,
        is_active: true,
        user_id: params.userId,
      })
      .eq('subscription_token', token)
    if (error) console.error('[calendar_subscriptions] update failed', error)
    return
  }
  const { error } = await subTable.insert({
    user_id: params.userId,
    subscription_token: token,
    source: params.source,
    is_active: true,
  })
  if (error) console.error('[calendar_subscriptions] insert failed', error)
}

export async function recordCalendarFeedRequest(
  db: SupabaseClient,
  params: {
    userId: string
    token: string
    userAgent: string | null
    ip: string | null
  }
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db.from('calendar_feed_requests') as any).insert({
    user_id: params.userId,
    subscription_token: params.token.trim() || null,
    user_agent: params.userAgent,
    ip: params.ip,
  })
  if (error) {
    console.error('[calendar_feed_requests] insert failed', error)
  }
}

export async function touchCalendarSubscriptionLastSync(
  db: SupabaseClient,
  token: string
): Promise<void> {
  const now = new Date().toISOString()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db.from('calendar_subscriptions') as any)
    .update({ last_synced_at: now })
    .eq('subscription_token', token.trim())
    .eq('is_active', true)
  if (error) {
    console.error('[calendar_subscriptions] last_sync update failed', error)
  }
}
