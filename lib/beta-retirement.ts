import { getServerSupabase } from '@/lib/server-supabase'

const MS_7D = 7 * 24 * 60 * 60 * 1000

/**
 * Legacy beta users: first session after migration sets a 7-day Pro trial window
 * and clears unlimited beta tier semantics (tier → free, flags normalized).
 * Idempotent when `is_beta_retired` is already true.
 * @returns true if an update was applied
 */
export async function applyLegacyBetaRetirementIfNeeded(userId: string): Promise<boolean> {
  const db = getServerSupabase()
  const { data: row, error } = await db
    .from('user_profiles')
    .select('is_beta_retired')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    console.error('[beta-retirement] select failed', error.message)
    return false
  }
  if (!row) return false

  const retired = (row as { is_beta_retired?: boolean | null }).is_beta_retired
  if (retired !== false) return false

  const now = new Date()
  const nowIso = now.toISOString()
  const trialEnds = new Date(now.getTime() + MS_7D).toISOString()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- user_profiles row shape not in generated types
  const { error: upErr } = await (db.from('user_profiles') as any).update({
    trial_starts_at: nowIso,
    trial_ends_at: trialEnds,
    is_beta_retired: true,
    is_beta: false,
    tier: 'free',
    pro_features_enabled: false,
    updated_at: nowIso,
  }).eq('id', userId)

  if (upErr) {
    console.error('[beta-retirement] update failed', upErr.message)
    return false
  }
  return true
}
