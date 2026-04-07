'use client'

import { useCallback, useEffect, useState } from 'react'
import { differenceInCalendarDays } from 'date-fns'
import { Shield } from 'lucide-react'
import { supabase } from '@/lib/supabase'

/**
 * Resilience streak (days since last contained fire) — shown on Journey / Insights hubs only, not on the main dashboard grid.
 */
export function JourneyDNA() {
  const [days, setDays] = useState<number | null>(null)

  const refresh = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return
    const { data: lastResolved } = await supabase
      .from('emergencies')
      .select('updated_at')
      .eq('user_id', user.id)
      .eq('resolved', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (lastResolved?.updated_at) {
      const d = differenceInCalendarDays(new Date(), new Date(lastResolved.updated_at as string))
      setDays(Math.max(0, d))
    } else {
      setDays(null)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    const onSync = () => void refresh()
    window.addEventListener('data-sync-request', onSync)
    return () => window.removeEventListener('data-sync-request', onSync)
  }, [refresh])

  if (days === null) return null

  return (
    <div className="mb-6 flex items-center gap-2">
      <span
        className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/90 bg-emerald-50/90 px-3 py-1 text-xs font-semibold text-emerald-900 dark:border-emerald-800/60 dark:bg-emerald-950/35 dark:text-emerald-200"
        title="Days since your last contained fire"
      >
        <Shield className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
        Resilience streak: <span className="tabular-nums">{days}</span> days
      </span>
    </div>
  )
}
