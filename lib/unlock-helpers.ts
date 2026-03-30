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
