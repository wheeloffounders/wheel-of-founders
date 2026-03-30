import type { SupabaseClient } from '@supabase/supabase-js'

/** `cron_state.key` for current UTC yyyy-MM wave id */
export const MONTHLY_INSIGHT_WAVE_KEY = 'monthly_insight_iso_month'
export const MONTHLY_INSIGHT_CURSOR_KEY = 'monthly_insight_last_user'
export const MONTHLY_INSIGHT_COMPLETE_KEY = 'monthly_insight_batch_complete'

async function getValue(db: SupabaseClient, key: string): Promise<string | null> {
  const { data, error } = await db.from('cron_state').select('value').eq('key', key).maybeSingle()
  if (error) {
    console.warn('[monthly-cron-batch-state] read', key, error.message)
    return null
  }
  return (data as { value?: string } | null)?.value ?? null
}

async function setValue(db: SupabaseClient, key: string, value: string): Promise<void> {
  const { error } = await db.from('cron_state').upsert(
    { key, value, updated_at: new Date().toISOString() },
    { onConflict: 'key' }
  )
  if (error) console.error('[monthly-cron-batch-state] upsert', key, error.message)
}

async function deleteKeys(db: SupabaseClient, keys: string[]): Promise<void> {
  if (keys.length === 0) return
  const { error } = await db.from('cron_state').delete().in('key', keys)
  if (error) console.error('[monthly-cron-batch-state] delete', error.message)
}

export async function getMonthlyCronState(db: SupabaseClient, key: string): Promise<string | null> {
  return getValue(db, key)
}

export async function setMonthlyCronState(db: SupabaseClient, key: string, value: string): Promise<void> {
  await setValue(db, key, value)
}

export async function resetMonthlyCronState(db: SupabaseClient): Promise<void> {
  await deleteKeys(db, [
    MONTHLY_INSIGHT_WAVE_KEY,
    MONTHLY_INSIGHT_CURSOR_KEY,
    MONTHLY_INSIGHT_COMPLETE_KEY,
  ])
}

export async function ensureMonthlyInsightMonthRollover(db: SupabaseClient, monthId: string): Promise<void> {
  const stored = await getValue(db, MONTHLY_INSIGHT_WAVE_KEY)
  if (stored === monthId) return
  await deleteKeys(db, [MONTHLY_INSIGHT_CURSOR_KEY, MONTHLY_INSIGHT_COMPLETE_KEY])
  await setValue(db, MONTHLY_INSIGHT_WAVE_KEY, monthId)
}

export async function isMonthlyInsightBatchCompleteForMonth(
  db: SupabaseClient,
  monthId: string
): Promise<boolean> {
  const v = await getValue(db, MONTHLY_INSIGHT_COMPLETE_KEY)
  return v === monthId
}

export async function markMonthlyInsightBatchComplete(db: SupabaseClient, monthId: string): Promise<void> {
  await setValue(db, MONTHLY_INSIGHT_COMPLETE_KEY, monthId)
  await deleteKeys(db, [MONTHLY_INSIGHT_CURSOR_KEY])
}

export async function getMonthlyInsightCursor(db: SupabaseClient): Promise<string | null> {
  return getValue(db, MONTHLY_INSIGHT_CURSOR_KEY)
}

export async function setMonthlyInsightCursor(db: SupabaseClient, userId: string): Promise<void> {
  await setValue(db, MONTHLY_INSIGHT_CURSOR_KEY, userId)
}
