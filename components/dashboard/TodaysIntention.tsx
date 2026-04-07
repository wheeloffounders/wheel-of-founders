'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Target } from 'lucide-react'
import Link from 'next/link'
import { getEffectivePlanDate } from '@/lib/effective-plan-date'
import {
  WOF_SESSION_INTENTION_PULSE_KEY,
  WOF_SESSION_MRS_DEER_HOOK_KEY,
  type MrsDeerDashboardHookPayload,
} from '@/lib/dashboard-onboarding-session'

export function TodaysIntention() {
  const [intention, setIntention] = useState<string | null>(null)
  const [eveningDone, setEveningDone] = useState(false)
  const [loading, setLoading] = useState(true)
  const [onboardingPulse, setOnboardingPulse] = useState(false)
  const [mrsDeerHookLine, setMrsDeerHookLine] = useState<string | null>(null)

  const planDate = getEffectivePlanDate()

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    const [{ data: decision }, { data: review }] = await Promise.all([
      supabase
        .from('morning_decisions')
        .select('decision')
        .eq('user_id', user.id)
        .eq('plan_date', planDate)
        .maybeSingle(),
      supabase
        .from('evening_reviews')
        .select('id')
        .eq('user_id', user.id)
        .eq('review_date', planDate)
        .maybeSingle(),
    ])

    const row = decision as { decision?: string } | null
    if (row?.decision?.trim()) {
      setIntention(row.decision.trim())
    } else {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('primary_goal_text')
        .eq('id', user.id)
        .maybeSingle()

      const p = profile as { primary_goal_text?: string } | null
      if (p?.primary_goal_text?.trim()) {
        setIntention(p.primary_goal_text.trim())
      } else {
        setIntention('')
      }
    }

    setEveningDone(!!review)
    setLoading(false)
  }, [planDate])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (loading) return
    if (typeof window === 'undefined') return
    let pulseTimer: ReturnType<typeof setTimeout> | undefined
    try {
      const pulse = sessionStorage.getItem(WOF_SESSION_INTENTION_PULSE_KEY)
      const raw = sessionStorage.getItem(WOF_SESSION_MRS_DEER_HOOK_KEY)
      if (pulse === '1') {
        sessionStorage.removeItem(WOF_SESSION_INTENTION_PULSE_KEY)
        setOnboardingPulse(true)
        pulseTimer = setTimeout(() => setOnboardingPulse(false), 10000)
      }
      if (raw) {
        sessionStorage.removeItem(WOF_SESSION_MRS_DEER_HOOK_KEY)
        const parsed = JSON.parse(raw) as MrsDeerDashboardHookPayload
        const focus = parsed?.focus?.trim()
        if (focus) {
          const clipped = focus.length > 120 ? `${focus.slice(0, 117)}…` : focus
          setMrsDeerHookLine(`Strategic focus: ${clipped}. I'm ready for your report tonight.`)
        }
      }
    } catch {
      // ignore
    }
    return () => {
      if (pulseTimer !== undefined) clearTimeout(pulseTimer)
    }
  }, [loading])

  useEffect(() => {
    const onSync = () => {
      void load()
    }
    window.addEventListener('data-sync-request', onSync)
    return () => window.removeEventListener('data-sync-request', onSync)
  }, [load])

  if (loading) return null

  const showOpenLoopPill = Boolean(intention) && !eveningDone

  return (
    <div
      className={`relative bg-orange-50 dark:bg-orange-950/25 p-4 rounded-lg border-l-4 border-[#ef725c] transition-[box-shadow,ring] duration-700 ease-out ${
        onboardingPulse
          ? 'ring-2 ring-[#ef725c]/50 shadow-lg ring-offset-2 ring-offset-orange-50 dark:ring-offset-orange-950/30'
          : ''
      } ${showOpenLoopPill ? 'pr-24' : ''}`}
    >
      {showOpenLoopPill ? (
        <span className="absolute top-3 right-3 inline-flex items-center rounded-full border border-amber-200/90 bg-white/90 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900/90 shadow-sm dark:border-amber-800/60 dark:bg-amber-950/50 dark:text-amber-100">
          In progress
        </span>
      ) : null}
      <div className="flex items-start gap-3">
        <Target className="w-5 h-5 text-[#ef725c] mt-0.5 shrink-0" />
        <div className="min-w-0">
          <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400">Today&apos;s Intention</h2>
          {intention ? (
            <p className="text-gray-900 dark:text-white mt-1">{intention}</p>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              <Link href="/morning" className="underline text-[#ef725c] hover:text-[#f28771]">
                Set your intention in your Morning Plan
              </Link>
            </p>
          )}
          {mrsDeerHookLine ? (
            <p className="mt-2 text-xs leading-relaxed text-gray-600 dark:text-gray-400 border-t border-orange-200/60 pt-2 dark:border-orange-800/50">
              <span className="font-medium text-gray-800 dark:text-gray-200">Mrs. Deer:</span>{' '}
              {mrsDeerHookLine}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
