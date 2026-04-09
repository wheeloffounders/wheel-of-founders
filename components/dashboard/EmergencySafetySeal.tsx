'use client'

import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { Flame } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { logSupabaseQueryError } from '@/lib/supabase/log-query-error'
import { getUserSession } from '@/lib/auth'
import { REST_RECOVER_STORAGE_KEY } from '@/components/dashboard/useRestRecoverModalHandlers'

type EmergencySafetySealProps = {
  /** True while a hot unresolved fire has a non-empty containment plan (dashboard checklist / resolution strip). */
  onActiveResolutionChange?: (active: boolean) => void
  showRestRecover: boolean
  setShowRestRecover: Dispatch<SetStateAction<boolean>>
  /** Bump when resolution state may change (e.g. resolved from dashboard checklist). */
  refreshKey?: number
}

/**
 * Command-center strip: recovery banner + mini “focusing on” link when redirected from /emergency.
 * The yellow checklist lives in {@link ActiveEmergencyChecklistDashboard} below the greeting.
 */
export function EmergencySafetySeal({
  onActiveResolutionChange,
  showRestRecover,
  setShowRestRecover,
  refreshKey = 0,
}: EmergencySafetySealProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [title, setTitle] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [hotCommittedActive, setHotCommittedActive] = useState(false)

  const dismissRestRecover = useCallback(() => {
    try {
      sessionStorage.removeItem(REST_RECOVER_STORAGE_KEY)
    } catch {
      // ignore
    }
    setShowRestRecover(false)
  }, [setShowRestRecover])

  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && sessionStorage.getItem(REST_RECOVER_STORAGE_KEY) === '1') {
        setShowRestRecover(true)
      }
    } catch {
      // ignore
    }
  }, [setShowRestRecover])

  useEffect(() => {
    let cancelled = false
    const focus = searchParams?.get('emergencyFocus')
    const emergencyId = searchParams?.get('emergencyId')

    ;(async () => {
      const session = await getUserSession()
      if (!session?.user?.id) {
        if (!cancelled) {
          setHotCommittedActive(false)
          setTitle(null)
          setLoaded(true)
        }
        return
      }

      const { data: rows, error: emergenciesError } = await supabase
        .from('emergencies')
        .select('id, containment_plan')
        .eq('user_id', session.user.id)
        .eq('resolved', false)
        .eq('severity', 'hot')
        .order('created_at', { ascending: false })
        .limit(12)

      if (emergenciesError) {
        logSupabaseQueryError('[EmergencySafetySeal] Supabase emergencies query failed', emergenciesError)
      }

      const list = Array.isArray(rows) ? rows : []
      const hotRow =
        list.find(
          (r) =>
            r &&
            typeof r.id === 'string' &&
            typeof r.containment_plan === 'string' &&
            r.containment_plan.trim().length > 0
        ) ?? null

      const hasHotCommitted = Boolean(hotRow?.id && hotRow.containment_plan?.trim())

      if (!cancelled) {
        setHotCommittedActive(hasHotCommitted)
        if (hasHotCommitted) setTitle(null)
      }

      if (focus === '1' && emergencyId && !cancelled) {
        if (!hasHotCommitted) {
          const { data: row } = await supabase
            .from('emergencies')
            .select('description')
            .eq('id', emergencyId)
            .eq('user_id', session.user.id)
            .maybeSingle()
          if (!cancelled && row?.description) {
            const s = String(row.description)
            setTitle(s.length > 100 ? `${s.slice(0, 97)}…` : s)
          }
        }
        router.replace('/dashboard', { scroll: false })
      }

      if (!cancelled) setLoaded(true)
    })()

    return () => {
      cancelled = true
    }
  }, [searchParams, router, refreshKey])

  useEffect(() => {
    onActiveResolutionChange?.(hotCommittedActive)
  }, [hotCommittedActive, onActiveResolutionChange])

  const showMiniBanner = !hotCommittedActive && Boolean(title)

  if (!loaded) return null

  return (
    <>
      {showRestRecover ? (
        <div className="mb-4 rounded-2xl border-2 border-emerald-100 bg-gradient-to-r from-emerald-50/90 to-white p-5 shadow-sm dark:border-emerald-900/40 dark:from-emerald-950/35 dark:to-gray-900">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                Recovery
              </p>
              <h3 className="mt-1 text-base font-semibold text-gray-900 dark:text-white">Rest and recover</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                You chose a lighter today. Your tasks are still in your plan for tomorrow—a calm &quot;waiting room&quot;
                until you&apos;re ready. Nothing to chase right now.
              </p>
            </div>
            <button
              type="button"
              onClick={dismissRestRecover}
              className="shrink-0 rounded-lg border border-emerald-200/80 bg-white px-3 py-1.5 text-sm font-medium text-emerald-900 hover:bg-emerald-50 dark:border-emerald-800 dark:bg-gray-800 dark:text-emerald-100 dark:hover:bg-emerald-950/50"
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : null}
      {showMiniBanner ? (
        <div className="mb-4 flex flex-wrap items-start gap-3 rounded-xl border-2 border-[#FF4D4D]/40 bg-gradient-to-r from-[#fff5f5] to-white px-4 py-3 dark:border-red-900/50 dark:from-red-950/40 dark:to-gray-900">
          <Flame className="mt-0.5 h-5 w-5 shrink-0 text-[#FF4D4D]" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#b91c1c] dark:text-red-300">
              Safety seal · Top priority
            </p>
            <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
              Focusing on: <span className="font-semibold text-[#152b50] dark:text-sky-200">{title}</span>
            </p>
            <Link
              href="/emergency?focus=resolution"
              className="mt-2 inline-block text-sm font-medium text-[#ef725c] hover:underline"
            >
              Open emergency workspace →
            </Link>
          </div>
        </div>
      ) : null}
    </>
  )
}
