/**
 * Admin and environment checks for Wheel of Founders.
 * Note: For client components, use isDevelopment and requireDevOnly from @/lib/env instead.
 */
import { getServerSupabase } from '@/lib/server-supabase'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { isWhitelistAdminEmail } from '@/lib/admin-emails'

/** Check if running in development */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_APP_ENV === 'development'
}

/** Throws if not in development. Use for dev-only features (e.g. List Backend). */
export function requireDevOnly(): void {
  if (!isDevelopment()) {
    throw new Error('This feature is only available in development')
  }
}

/**
 * Admin if `user_profiles.is_admin` OR profile email OR session email matches {@link isWhitelistAdminEmail}.
 */
export async function isAdmin(userId: string): Promise<boolean> {
  const db = getServerSupabase()
  const { data } = await db
    .from('user_profiles')
    .select('is_admin, email')
    .eq('id', userId)
    .maybeSingle()
  const row = data as { is_admin?: boolean | null; email?: string | null } | null
  if (row?.is_admin === true) return true
  if (isWhitelistAdminEmail(row?.email)) return true
  return false
}

/** Prefer session email (auth) when profile row lags after deploy. */
export async function isUserAdmin(userId: string, sessionEmail?: string | null): Promise<boolean> {
  if (isWhitelistAdminEmail(sessionEmail)) return true
  return isAdmin(userId)
}

/**
 * API routes: optional `Authorization: Bearer ADMIN_SECRET`, else cookie/Bearer session + admin check.
 * Works on localhost, Vercel Preview, and production (no NODE_ENV gate).
 */
export async function authorizeAdminApiRequest(req: Request): Promise<boolean> {
  const secret = process.env.ADMIN_SECRET?.trim()
  if (secret) {
    const authHeader = req.headers.get('authorization')
    if (authHeader === `Bearer ${secret}`) return true
  }
  const session = await getServerSessionFromRequest(req)
  if (!session?.user?.id) return false
  return isUserAdmin(session.user.id, session.user.email)
}

/** Show refresh/regenerate button: dev mode OR admin user */
export async function canRegenerateInsights(userId: string | null): Promise<boolean> {
  if (isDevelopment()) return true
  if (!userId) return false
  return isAdmin(userId)
}
