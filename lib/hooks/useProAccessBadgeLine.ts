'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getTrialStatus } from '@/lib/auth/trial-status'
import { isTrialExpirySimulationEnabled } from '@/lib/trial-simulation'
import type { ProEntitlementProfile } from '@/lib/auth/is-pro'
import type { TrialUxStatus } from '@/lib/auth/trial-status'

/** Shared trial / Pro line shown above bottom nav icons (see `ProAccessBadge`). */
export function useProAccessBadgeLine() {
  const [label, setLabel] = useState<string | null>(null)
  const [pulse, setPulse] = useState(false)
  const [uxStatus, setUxStatus] = useState<TrialUxStatus | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session?.user?.id) {
        if (!cancelled) {
          setLabel(null)
          setPulse(false)
          setUxStatus(null)
        }
        return
      }
      const { data: profile } = await supabase
        .from('user_profiles')
        .select(
          'tier, pro_features_enabled, subscription_tier, trial_starts_at, trial_ends_at, stripe_subscription_status, created_at'
        )
        .eq('id', session.user.id)
        .maybeSingle()

      if (cancelled) return
      const sim = isTrialExpirySimulationEnabled()
      const ts = getTrialStatus(profile as ProEntitlementProfile | null, { simulateExpired: sim })
      setUxStatus(ts.status)
      const text = ts.badgeLabel
      if (!text || text === 'Pro') {
        setLabel(null)
        setPulse(false)
        return
      }
      setLabel(text)
      setPulse(ts.status === 'trialing' && ts.daysLeft <= 1)
    }

    void load()

    const onSim = () => void load()
    window.addEventListener('wof-trial-sim-changed', onSim)

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void load()
    })
    return () => {
      cancelled = true
      window.removeEventListener('wof-trial-sim-changed', onSim)
      subscription.unsubscribe()
    }
  }, [])

  return { label, pulse, uxStatus }
}
