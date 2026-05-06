'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { getUserSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import {
  hasSkipInitialOnboardingCookie,
  isOnboardingPausedThisSession,
  shouldBypassOnboardingSessionGate,
} from '@/lib/onboarding-session-guard'

/**
 * Replaces middleware onboarding redirects: only the client can honor `sessionStorage` breakout.
 */
export function OnboardingSessionGate() {
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (shouldBypassOnboardingSessionGate(pathname)) return

    void (async () => {
      const session = await getUserSession()
      if (!session?.user?.id) return
      if (isOnboardingPausedThisSession() || hasSkipInitialOnboardingCookie()) return

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('onboarding_completed_at')
        .eq('id', session.user.id)
        .maybeSingle()

      const completed = Boolean(
        (profile as { onboarding_completed_at?: string | null } | null)?.onboarding_completed_at
      )
      if (completed) return

      router.replace('/onboarding/goal')
    })()
  }, [pathname, router])

  return null
}
