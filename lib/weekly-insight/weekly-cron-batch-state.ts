import type { SupabaseClient } from '@supabase/supabase-js'

const KEY_ISO_WEEK = 'weekly_insight_iso_week'
const KEY_LAST_USER = 'weekly_insight_last_user'
const KEY_BATCH_COMPLETE = 'weekly_insight_batch_complete'

async function getValue(db: SupabaseClient, key: string): Promise<string | null> {
  const { data, error } = await db.from('cron_state').select('value').eq('key', key).maybeSingle()
  if (error) {
    console.warn('[weekly-cron-batch-state] read', key, error.message)
    return null
  }
  return (data as { value?: string } | null)?.value ?? null
}

async function setValue(db: SupabaseClient, key: string, value: string): Promise<void> {
  const { error } = await db.from('cron_state').upsert(
    { key, value, updated_at: new Date().toISOString() },
    { onConflict: 'key' }
  )
  if (error) console.error('[weekly-cron-batch-state] upsert', key, error.message)
}

async function deleteKeys(db: SupabaseClient, keys: string[]): Promise<void> {
  if (keys.length === 0) return
  const { error } = await db.from('cron_state').delete().in('key', keys)
  if (error) console.error('[weekly-cron-batch-state] delete', error.message)
}

/** When UTC ISO week changes, drop cursor + completion so a new wave can start. */
export async function ensureWeeklyInsightWeekRollover(db: SupabaseClient, weekId: string): Promise<void> {
  const stored = await getValue(db, KEY_ISO_WEEK)
  if (stored === weekId) return
  await deleteKeys(db, [KEY_LAST_USER, KEY_BATCH_COMPLETE])
  await setValue(db, KEY_ISO_WEEK, weekId)
}

export async function isWeeklyInsightBatchCompleteForWeek(
  db: SupabaseClient,
  weekId: string
): Promise<boolean> {
  const v = await getValue(db, KEY_BATCH_COMPLETE)
  return v === weekId
}

export async function markWeeklyInsightBatchComplete(db: SupabaseClient, weekId: string): Promise<void> {
  await setValue(db, KEY_BATCH_COMPLETE, weekId)
  await deleteKeys(db, [KEY_LAST_USER])
}

export async function getWeeklyInsightCursor(db: SupabaseClient): Promise<string | null> {
  return getValue(db, KEY_LAST_USER)
}

export async function setWeeklyInsightCursor(db: SupabaseClient, userId: string): Promise<void> {
  await setValue(db, KEY_LAST_USER, userId)
}

export const weeklyCronBatchKeys = {
  KEY_ISO_WEEK,
  KEY_LAST_USER,
  KEY_BATCH_COMPLETE,
}
