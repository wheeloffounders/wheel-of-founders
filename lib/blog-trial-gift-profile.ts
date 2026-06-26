import type { SupabaseClient } from '@supabase/supabase-js'
import {
  hasBlogTrialGiftInSession,
  clearBlogTrialGiftCookie,
  hasBlogTrialGiftCookie,
} from '@/lib/blog-trial-gift-session'
import { trackRadarConversionForGiftClaim } from '@/lib/radar'

/** Short-lived: morning page reads once to show Pro trial welcome banner after OAuth. */
export const WOF_PRO_TRIAL_WELCOME_COOKIE = 'wof_pro_trial_welcome'

/** Client-only: first morning visit after email signup + gift profile apply. */
export const WOF_PRO_TRIAL_ACTIVATED_WELCOME_SESSION_KEY = 'wof_pro_trial_activated_welcome'

/** Server + client: fields written when the blog/home trial gift is activated. */
export function getBlogTrialGiftProfilePatch(): Record<string, unknown> {
  const now = new Date()
  const ends = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  return {
    trial_starts_at: now.toISOString(),
    trial_ends_at: ends.toISOString(),
    pro_features_enabled: true,
    is_pro_trial: true,
    updated_at: now.toISOString(),
  }
}

/**
 * If sessionStorage or mirror cookie says the user earned the trial gift, upsert `user_profiles`
 * and set the one-shot welcome flag for `/morning`. Does not clear the sessionStorage gift key
 * used by pending_plan hydrate toasts (cleared there separately).
 */
export async function applyBlogTrialGiftFromAuthClient(supabase: SupabaseClient): Promise<boolean> {
  if (typeof window === 'undefined') return false
  const eligible = hasBlogTrialGiftInSession() || hasBlogTrialGiftCookie()
  if (!eligible) return false

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser()
  if (userErr || !user) return false

  const patch = getBlogTrialGiftProfilePatch()
  const { error } = await supabase.from('user_profiles').upsert(
    { id: user.id, email_address: user.email ?? undefined, ...patch },
    { onConflict: 'id' }
  )
  if (error) {
    console.error('[blog-trial-gift] client profile upsert failed', error)
    return false
  }

  trackRadarConversionForGiftClaim()
  clearBlogTrialGiftCookie()
  try {
    sessionStorage.setItem(WOF_PRO_TRIAL_ACTIVATED_WELCOME_SESSION_KEY, '1')
  } catch {
    // best effort
  }
  return true
}
