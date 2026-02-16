import { supabase } from './supabase'
import type { Session } from '@supabase/supabase-js'

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
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) return null
  
  // Get user profile with tier and admin info
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tier, pro_features_enabled, is_admin, admin_role')
    .eq('id', session.user.id)
    .maybeSingle()
  
  // If profile doesn't exist, create it with beta defaults
  if (!profile) {
    // Detect timezone before creating profile
    await detectAndStoreTimezone(session.user.id)
    
    const { data: newProfile } = await supabase
      .from('user_profiles')
      .insert({
        id: session.user.id,
        email: session.user.email,
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
        tier: newProfile?.tier || 'beta',
        pro_features_enabled: newProfile?.pro_features_enabled ?? true,
        is_admin: newProfile?.is_admin ?? false,
        admin_role: newProfile?.admin_role ?? null,
      }
    } as SessionWithProfile
  }
  
  // Check if timezone needs to be detected (first time login)
  if (!profile.timezone) {
    await detectAndStoreTimezone(session.user.id)
  }
  
  return {
    ...session,
    user: {
      ...session.user,
      tier: profile.tier || 'beta',
      pro_features_enabled: profile.pro_features_enabled ?? true,
      is_admin: profile.is_admin ?? false,
      admin_role: profile.admin_role ?? null,
    }
  } as SessionWithProfile
}
