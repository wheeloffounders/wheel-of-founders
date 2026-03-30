import type { SupabaseClient } from '@supabase/supabase-js'

/** `cron_state.key` for current UTC yyyy-Qn wave id */
export const QUARTERLY_INSIGHT_WAVE_KEY = 'quarterly_insight_iso_quarter'
export const QUARTERLY_INSIGHT_CURSOR_KEY = 'quarterly_insight_last_user'
export const QUARTERLY_INSIGHT_COMPLETE_KEY = 'quarterly_insight_batch_complete'

async function getValue(db: SupabaseClient, key: string): Promise<string | null> {
  const { data, error } = await db.from('cron_state').select('value').eq('key', key).maybeSingle()
  if (error) {
    console.warn('[quarterly-cron-batch-state] read', key, error.message)
    return null
  }
  return (data as { value?: string } | null)?.value ?? null
}

async function setValue(db: SupabaseClient, key: string, value: string): Promise<void> {
  const { error } = await db.from('cron_state').upsert(
    { key, value, updated_at: new Date().toISOString() },
    { onConflict: 'key' }
  )
  if (error) console.error('[quarterly-cron-batch-state] upsert', key, error.message)
}

async function deleteKeys(db: SupabaseClient, keys: string[]): Promise<void> {
  if (keys.length === 0) return
  const { error } = await db.from('cron_state').delete().in('key', keys)
  if (error) console.error('[quarterly-cron-batch-state] delete', error.message)
}

export async function getQuarterlyCronState(db: SupabaseClient, key: string): Promise<string | null> {
  return getValue(db, key)
}

export async function setQuarterlyCronState(db: SupabaseClient, key: string, value: string): Promise<void> {
  await setValue(db, key, value)
}

export async function resetQuarterlyCronState(db: SupabaseClient): Promise<void> {
  await deleteKeys(db, [
    QUARTERLY_INSIGHT_WAVE_KEY,
    QUARTERLY_INSIGHT_CURSOR_KEY,
    QUARTERLY_INSIGHT_COMPLETE_KEY,
  ])
}

export async function ensureQuarterlyInsightQuarterRollover(db: SupabaseClient, quarterId: string): Promise<void> {
  const stored = await getValue(db, QUARTERLY_INSIGHT_WAVE_KEY)
  if (stored === quarterId) return
  await deleteKeys(db, [QUARTERLY_INSIGHT_CURSOR_KEY, QUARTERLY_INSIGHT_COMPLETE_KEY])
  await setValue(db, QUARTERLY_INSIGHT_WAVE_KEY, quarterId)
}

export async function isQuarterlyInsightBatchCompleteForQuarter(
  db: SupabaseClient,
  quarterId: string
): Promise<boolean> {
  const v = await getValue(db, QUARTERLY_INSIGHT_COMPLETE_KEY)
  return v === quarterId
}

export async function markQuarterlyInsightBatchComplete(db: SupabaseClient, quarterId: string): Promise<void> {
  await setValue(db, QUARTERLY_INSIGHT_COMPLETE_KEY, quarterId)
  await deleteKeys(db, [QUARTERLY_INSIGHT_CURSOR_KEY])
}

export async function getQuarterlyInsightCursor(db: SupabaseClient): Promise<string | null> {
  return getValue(db, QUARTERLY_INSIGHT_CURSOR_KEY)
}

export async function setQuarterlyInsightCursor(db: SupabaseClient, userId: string): Promise<void> {
  await setValue(db, QUARTERLY_INSIGHT_CURSOR_KEY, userId)
}
