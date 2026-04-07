import { supabase } from './supabase'
import type { Session } from '@supabase/supabase-js'
import { isWhitelistAdminEmail } from '@/lib/admin-emails'

export interface SessionWithProfile extends Session {
  user: Session['user'] & {
    tier: string
    pro_features_enabled: boolean
    is_admin?: boolean
    admin_role?: string | null
  }
}

/**
 * Detect and store user's timezone
 * Call this after login/signup or when timezone is not set
 */
export async function detectAndStoreTimezone(userId: string): Promise<void> {
  try {
    // Detect from browser
    const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone

    // Check if timezone already exists
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('timezone, timezone_detected_at')
      .eq('id', userId)
      .maybeSingle()

    // Only update if timezone hasn't been set or manually changed
    if (!profile?.timezone || !profile?.timezone_detected_at) {
      await supabase
        .from('user_profiles')
        .upsert(
          {
            id: userId,
            timezone: detectedTimezone,
            timezone_detected_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        )
    }
  } catch (error) {
    console.error('Error detecting/storing timezone:', error)
    // Don't throw - timezone detection is non-critical
  }
}

export async function getUserSession(): Promise<SessionWithProfile | null> {
  // Validate JWT with Auth (not just local storage). Stale getSession() + expired token
  // yields a user id in JS but auth.uid() = null in Postgres → RLS failures on insert/update.
  const { data: userData, error: userError } = await supabase.auth.getUser()
  const verifiedUser = userData?.user
  if (userError || !verifiedUser) return null

  let {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) {
    const { data: refreshed } = await supabase.auth.refreshSession()
    session = refreshed.session ?? null
  }
  if (!session) return null

  const userId = verifiedUser.id

  // Get user profile with tier and admin info
  const { data: profileData } = await supabase
    .from('user_profiles')
    .select('tier, pro_features_enabled, is_admin, admin_role, timezone')
    .eq('id', userId)
    .maybeSingle()
  
  type ProfileRow = {
    tier?: string | null
    pro_features_enabled?: boolean | null
    is_admin?: boolean | null
    admin_role?: string | null
    timezone?: string | null
  }
  const profile = profileData as ProfileRow | null
  
  // If profile doesn't exist, create it with beta defaults
  if (!profile) {
    // Detect timezone before creating profile
    await detectAndStoreTimezone(userId)

    const { data: newProfile } = await supabase
      .from('user_profiles')
      .insert({
        id: userId,
        email: verifiedUser.email,
        tier: 'beta',
        pro_features_enabled: true,
        created_at: new Date().toISOString(),
      })
      .select('tier, pro_features_enabled, is_admin, admin_role')
      .single()

    return {
      ...session,
      user: {
        ...session.user,
        ...verifiedUser,
        tier: newProfile?.tier || 'beta',
        pro_features_enabled: newProfile?.pro_features_enabled ?? true,
        is_admin:
          Boolean(newProfile?.is_admin) || isWhitelistAdminEmail(verifiedUser.email),
        admin_role: newProfile?.admin_role ?? null,
      },
    } as SessionWithProfile
  }

  // Check if timezone needs to be detected (first time login)
  if (!profile.timezone) {
    await detectAndStoreTimezone(userId)
  }

  return {
    ...session,
    user: {
      ...session.user,
      ...verifiedUser,
      tier: profile.tier || 'beta',
      pro_features_enabled: profile.pro_features_enabled ?? true,
      is_admin:
        Boolean(profile.is_admin) || isWhitelistAdminEmail(verifiedUser.email),
      admin_role: profile.admin_role ?? null,
    },
  } as SessionWithProfile
}

/**
 * Refresh the access token immediately before RLS-scoped writes so PostgREST sends a JWT
 * that matches `auth.uid()` (avoids false RLS failures when local session lags).
 */
export async function refreshSessionForWrite(): Promise<{ ok: true } | { ok: false; message: string }> {
  const { data, error } = await supabase.auth.refreshSession()
  if (error || !data.session) {
    return {
      ok: false,
      message: 'Your session expired. Please sign in again.',
    }
  }
  return { ok: true }
}

/** PostgREST / Postgres errors that often clear after `refreshSessionForWrite` + one retry */
export function isRlsOrAuthPermissionError(error: unknown): boolean {
  if (error === null || error === undefined || typeof error !== 'object') return false
  const e = error as { message?: string; code?: string; details?: string }
  const msg = `${e.message ?? ''} ${e.details ?? ''}`.toLowerCase()
  const code = String(e.code ?? '')
  return (
    msg.includes('row-level security') ||
    msg.includes('violates row-level security') ||
    msg.includes('permission denied') ||
    msg.includes('jwt expired') ||
    msg.includes('invalid jwt') ||
    code === '42501' ||
    code === 'PGRST301'
  )
}
