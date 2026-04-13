'use client'

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getUserSession } from '@/lib/auth'
import { getPlanDateString } from '@/lib/effective-plan-date'
import { getUserTimezoneFromProfile } from '@/lib/timezone'
import { MorningPlanGateContextProvider, type MorningPlanGateContextValue } from '@/lib/contexts/MorningPlanGateContext'
import {
  previewPageLabel,
  shouldShowMorningPreviewOverlay,
  shouldSuppressMorningLoopBanner,
} from '@/lib/morning/morning-plan-gate-paths'
import { MorningLoopOpenBanner } from '@/components/morning/MorningLoopOpenBanner'
import { MorningRequirementOverlay } from '@/components/morning/MorningRequirementOverlay'

export function MorningPlanGateProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [loading, setLoading] = useState(true)
  const [isMorningPlanIncomplete, setIsMorningPlanIncomplete] = useState(false)
  const [planDate, setPlanDate] = useState<string | null>(null)

  const refreshMorningPlanGate = useCallback(async () => {
    try {
      const session = await getUserSession()
      if (!session?.user?.id) {
        setIsMorningPlanIncomplete(false)
        setPlanDate(null)
        return
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('onboarding_completed_at, timezone')
        .eq('id', session.user.id)
        .maybeSingle()

      const p = profile as { onboarding_completed_at?: string | null; timezone?: string | null } | null
      if (!p?.onboarding_completed_at) {
        setIsMorningPlanIncomplete(false)
        setPlanDate(null)
        return
      }

      const pd = getPlanDateString(getUserTimezoneFromProfile(p))
      setPlanDate(pd)

      const { data: commit, error } = await supabase
        .from('morning_plan_commits')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('plan_date', pd)
        .maybeSingle()

      if (error) {
        setIsMorningPlanIncomplete(true)
        return
      }

      setIsMorningPlanIncomplete(!commit)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refreshMorningPlanGate()
  }, [refreshMorningPlanGate, pathname])

  useEffect(() => {
    const onSync = () => void refreshMorningPlanGate()
    window.addEventListener('data-sync-request', onSync)
    return () => window.removeEventListener('data-sync-request', onSync)
  }, [refreshMorningPlanGate])

  const value = useMemo<MorningPlanGateContextValue>(
    () => ({
      loading,
      isMorningPlanIncomplete,
      planDate,
      refreshMorningPlanGate,
    }),
    [loading, isMorningPlanIncomplete, planDate, refreshMorningPlanGate]
  )

  const showBanner =
    !loading && isMorningPlanIncomplete && !shouldSuppressMorningLoopBanner(pathname ?? null)
  const showOverlay = shouldShowMorningPreviewOverlay(pathname ?? null, !loading && isMorningPlanIncomplete)
  const overlayLabel = previewPageLabel(pathname ?? null)

  return (
    <MorningPlanGateContextProvider value={value}>
      {showBanner ? <MorningLoopOpenBanner /> : null}
      <div className="relative flex min-h-0 flex-1 flex-col">
        <div
          className={
            showOverlay
              ? 'relative min-h-[50vh] pointer-events-none select-none opacity-[0.22] transition-opacity dark:opacity-[0.28]'
              : 'relative min-h-0 flex-1'
          }
          aria-hidden={showOverlay}
        >
          {children}
        </div>
        {showOverlay ? <MorningRequirementOverlay pageLabel={overlayLabel} /> : null}
      </div>
    </MorningPlanGateContextProvider>
  )
}
