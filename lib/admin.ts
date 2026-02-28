/**
 * Admin and environment checks for Wheel of Founders.
 */
import { getServerSupabase } from '@/lib/server-supabase'

/** Check if running in development */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_APP_ENV === 'development'
}

/** Check if user is admin (from user_profiles.is_admin) */
export async function isAdmin(userId: string): Promise<boolean> {
  const db = getServerSupabase()
  const { data } = await db
    .from('user_profiles')
    .select('is_admin')
    .eq('id', userId)
    .maybeSingle()
  return (data as { is_admin?: boolean } | null)?.is_admin === true
}

/** Show refresh/regenerate button: dev mode OR admin user */
export async function canRegenerateInsights(userId: string | null): Promise<boolean> {
  if (isDevelopment()) return true
  if (!userId) return false
  return isAdmin(userId)
}
