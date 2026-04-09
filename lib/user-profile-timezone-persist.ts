import { getServerSupabase } from '@/lib/server-supabase'
import { isValidIanaTimeZone } from '@/lib/iana-timezone'

type Db = ReturnType<typeof getServerSupabase>

/**
 * Updates `user_profiles.timezone` when the client sends a valid IANA id
 * (e.g. from `Intl.DateTimeFormat().resolvedOptions().timeZone`).
 */
export async function persistUserProfileTimeZoneIfValid(
  db: Db,
  userId: string,
  timeZone: string | undefined | null
): Promise<boolean> {
  const raw = String(timeZone ?? '').trim()
  if (!raw || !isValidIanaTimeZone(raw)) return false
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- generated types lag user_profiles
  const { error } = await (db.from('user_profiles') as any)
    .update({
      timezone: raw,
      timezone_detected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
  return !error
}
