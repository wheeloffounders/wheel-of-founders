/**
 * Onboarding status helpers
 * Uses user_profiles.onboarding_completed_at for persistence
 */

import { supabase } from '@/lib/supabase'
import { getUserSession } from '@/lib/auth'

export async function isOnboardingCompleted(userId: string): Promise<boolean> {
  try {
    const { data } = await (supabase.from('user_profiles') as any)
      .select('onboarding_completed_at')
      .eq('id', userId)
      .maybeSingle()
    return !!data?.onboarding_completed_at
  } catch {
    return false
  }
}

export async function markOnboardingCompleted(userId: string): Promise<void> {
  try {
    await (supabase.from('user_profiles') as any)
      .update({
        onboarding_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
  } catch (err) {
    console.warn('Failed to mark onboarding completed:', err)
  }
}
