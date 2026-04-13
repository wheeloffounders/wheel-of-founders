import type { SupabaseClient } from '@supabase/supabase-js'
import type { UserUnlockInsert, UserUnlockType } from '@/types/supabase'

export async function insertUserUnlock(
  db: SupabaseClient,
  userId: string,
  unlockName: string,
  unlockType: UserUnlockType = 'feature',
  unlockedAt?: string
) {
  const row: UserUnlockInsert = {
    user_id: userId,
    unlock_type: unlockType,
    unlock_name: unlockName,
    unlocked_at: unlockedAt ?? new Date().toISOString(),
  }
  return db.from('user_unlocks').insert(row)
}

/**
 * Ensures `user_unlocks` has rows for archetype features when the profile already grants them.
 * Inserts only missing names (duplicate key → caller may ignore insert errors).
 */
export async function ensureArchetypeUserUnlockRows(
  db: SupabaseClient,
  userId: string,
  opts: { needPreview: boolean; needFull: boolean }
): Promise<boolean> {
  const { data: rows, error } = await db.from('user_unlocks').select('unlock_name').eq('user_id', userId)
  if (error) {
    console.error('[ensureArchetypeUserUnlockRows] select failed', error)
    return false
  }
  const existing = new Set<string>()
  for (const r of rows ?? []) {
    const name = (r as { unlock_name?: string | null }).unlock_name
    if (typeof name === 'string' && name) existing.add(name)
  }
  const nowIso = new Date().toISOString()
  let inserted = false

  if (opts.needPreview && !existing.has('founder_archetype')) {
    const res = await insertUserUnlock(db, userId, 'founder_archetype', 'feature', nowIso)
    if (!res.error) inserted = true
  }
  if (opts.needFull && !existing.has('founder_archetype_full')) {
    const res = await insertUserUnlock(db, userId, 'founder_archetype_full', 'feature', nowIso)
    if (!res.error) inserted = true
  }
  return inserted
}
