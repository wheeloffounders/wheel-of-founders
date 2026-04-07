'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { differenceInCalendarDays } from 'date-fns'
import { Flame } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getUserSession } from '@/lib/auth'
import { getClientAuthHeaders } from '@/lib/api/fetch-json'
import { ActiveResolutionDashboardCard } from '@/components/dashboard/ActiveResolutionDashboardCard'
import { CrisisRestorationModal } from '@/components/dashboard/CrisisRestorationModal'
import {
  REST_RECOVER_STORAGE_KEY,
  useRestRecoverModalHandlers,
} from '@/components/dashboard/useRestRecoverModalHandlers'

type EmergencySafetySealProps = {
  /** True while a committed containment plan is still open (resolution mode). */
  onActiveResolutionChange?: (active: boolean) => void
}

/**
 * Command-center strip: full active resolution checklist when committed, quiet streak in normal mode.
 */
export function EmergencySafetySeal({ onActiveResolutionChange }: EmergencySafetySealProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [title, setTitle] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [active, setActive] = useState<{
    id: string
    description: string
    location: string | null
    containment_plan: string
  } | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [restorationOpen, setRestorationOpen] = useState(false)
  const [restorableCount, setRestorableCount] = useState(0)
  const [restorationCountLoading, setRestorationCountLoading] = useState(false)
  const [restorationLoading, setRestorationLoading] = useState(false)
  const [showRestRecover, setShowRestRecover] = useState(false)
  /** Today's task count when rest-recover banner is shown (for empty-state zen tone). */
  const [restRecoverTaskCount, setRestRecoverTaskCount] = useState<number | null>(null)

  const handleRestorationPrompt = useCallback((count: number) => {
    setRestorableCount(count)
    setRestorationOpen(true)
  }, [])

  const handleRestoreToday = useCallback(async () => {
    setRestorationLoading(true)
    try {
      const headers = await getClientAuthHeaders()
      const res = await fetch('/api/tasks/restore-tomorrow-to-today', {
        method: 'POST',
        credentials: 'include',
        headers,
      })
      const body = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) throw new Error(typeof body.error === 'string' ? body.error : 'Could not restore tasks')
      setRestorationOpen(false)
      try {
        sessionStorage.removeItem(REST_RECOVER_STORAGE_KEY)
      } catch {
        // ignore
      }
      setShowRestRecover(false)
      window.dispatchEvent(
        new CustomEvent('toast', {
          detail: {
            message: "Tasks restored. Let's finish the day strong!",
            type: 'success',
          },
        })
      )
      window.dispatchEvent(new CustomEvent('data-sync-request'))
      setRefreshKey((k) => k + 1)
    } catch (e) {
      window.dispatchEvent(
        new CustomEvent('toast', {
          detail: {
            message: e instanceof Error ? e.message : 'Could not restore tasks.',
            type: 'error',
          },
        })
      )
    } finally {
      setRestorationLoading(false)
    }
  }, [])

  const { dismissRestRecover, handleKeepTomorrow } = useRestRecoverModalHandlers(
    setRestorationOpen,
    setShowRestRecover
  )

  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && sessionStorage.getItem(REST_RECOVER_STORAGE_KEY) === '1') {
        setShowRestRecover(true)
      }
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    if (!restorationOpen) return
    let cancelled = false
    ;(async () => {
      setRestorationCountLoading(true)
      try {
        const headers = await getClientAuthHeaders()
        const res = await fetch('/api/tasks/restorable-from-tomorrow', { credentials: 'include', headers })
        if (res.ok) {
          const data = (await res.json()) as { count?: number }
          const c = typeof data.count === 'number' ? data.count : 0
          if (!cancelled) setRestorableCount(c)
        }
      } catch {
        // keep prior count from prompt
      } finally {
        if (!cancelled) setRestorationCountLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [restorationOpen])

  useEffect(() => {
    let cancelled = false
    const focus = searchParams?.get('emergencyFocus')
    const emergencyId = searchParams?.get('emergencyId')

    ;(async () => {
      const session = await getUserSession()
      if (!session?.user?.id) {
        if (!cancelled) {
          setActive(null)
          setLoaded(true)
        }
        return
      }

      const { data: activeRow } = await supabase
        .from('emergencies')
        .select('id, description, location, containment_plan, containment_plan_committed_at')
        .eq('user_id', session.user.id)
        .eq('resolved', false)
        .not('containment_plan_committed_at', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!cancelled && activeRow?.id && typeof activeRow.containment_plan === 'string' && activeRow.containment_plan.trim()) {
        setActive({
          id: activeRow.id,
          description: String(activeRow.description ?? ''),
          location: typeof activeRow.location === 'string' && activeRow.location.trim() ? activeRow.location.trim() : null,
          containment_plan: String(activeRow.containment_plan),
        })
        setTitle(null)
      } else if (!cancelled) {
        setActive(null)
      }

      if (focus === '1' && emergencyId && !cancelled) {
        if (!activeRow?.id) {
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
    onActiveResolutionChange?.(Boolean(active?.id))
  }, [active, onActiveResolutionChange])

  const showMiniBanner = active === null && Boolean(title)

  const showMainStrip = Boolean(active) || showMiniBanner

  if (!loaded) return null

  return (
    <>
      {showRestRecover ? (
        <div
          className={
            restRecoverTaskCount === 0
              ? 'mb-4 rounded-2xl border border-stone-200/90 bg-gradient-to-r from-stone-100/85 via-slate-50/90 to-stone-50/80 p-5 shadow-sm dark:border-stone-700/50 dark:from-stone-900/45 dark:via-slate-950/40 dark:to-stone-950/35'
              : 'mb-4 rounded-2xl border-2 border-emerald-100 bg-gradient-to-r from-emerald-50/90 to-white p-5 shadow-sm dark:border-emerald-900/40 dark:from-emerald-950/35 dark:to-gray-900'
          }
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p
                className={
                  restRecoverTaskCount === 0
                    ? 'text-xs font-semibold uppercase tracking-wide text-stone-600 dark:text-stone-400'
                    : 'text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300'
                }
              >
                Recovery
              </p>
              <h3
                className={
                  restRecoverTaskCount === 0
                    ? 'mt-1 text-base font-semibold text-stone-800 dark:text-stone-100'
                    : 'mt-1 text-base font-semibold text-gray-900 dark:text-white'
                }
              >
                Rest and recover
              </h3>
              <p
                className={
                  restRecoverTaskCount === 0
                    ? 'mt-2 text-sm leading-relaxed text-stone-600 dark:text-stone-300'
                    : 'mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300'
                }
              >
                {restRecoverTaskCount === 0 ? (
                  <>
                    You chose a lighter today. Nothing on your list needs you right now—that quiet is intentional. Your
                    tomorrow plan still holds what matters; Mrs. Deer will meet you there when you&apos;re ready.
                  </>
                ) : (
                  <>
                    You chose a lighter today. Your tasks are still in your plan for tomorrow—a calm &quot;waiting room&quot;
                    until you&apos;re ready. Nothing to chase right now.
                  </>
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={dismissRestRecover}
              className={
                restRecoverTaskCount === 0
                  ? 'shrink-0 rounded-lg border border-stone-300/90 bg-white/90 px-3 py-1.5 text-sm font-medium text-stone-800 hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-900/60 dark:text-stone-100 dark:hover:bg-stone-800/80'
                  : 'shrink-0 rounded-lg border border-emerald-200/80 bg-white px-3 py-1.5 text-sm font-medium text-emerald-900 hover:bg-emerald-50 dark:border-emerald-800 dark:bg-gray-800 dark:text-emerald-100 dark:hover:bg-emerald-950/50'
              }
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : null}
      <CrisisRestorationModal
        open={restorationOpen}
        taskCount={restorableCount}
        countLoading={restorationCountLoading}
        loading={restorationLoading}
        onRestore={() => void handleRestoreToday()}
        onKeepTomorrow={handleKeepTomorrow}
        onAcknowledgeNoRestore={() => setRestorationOpen(false)}
      />
      {showMainStrip ? (
    <div className="mb-4 space-y-2">
      {active ? (
        <ActiveResolutionDashboardCard
          emergencyId={active.id}
          fireDescription={active.description}
          location={active.location}
          containmentPlan={active.containment_plan}
          onResolved={() => setRefreshKey((k) => k + 1)}
          onRestorationPrompt={handleRestorationPrompt}
        />
      ) : showMiniBanner ? (
        <div className="flex flex-wrap items-start gap-3 rounded-xl border-2 border-[#FF4D4D]/40 bg-gradient-to-r from-[#fff5f5] to-white px-4 py-3 dark:border-red-900/50 dark:from-red-950/40 dark:to-gray-900">
          <Flame className="mt-0.5 h-5 w-5 shrink-0 text-[#FF4D4D]" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#b91c1c] dark:text-red-300">Safety seal · Top priority</p>
            <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
              Focusing on: <span className="font-semibold text-[#152b50] dark:text-sky-200">{title}</span>
            </p>
            <Link href="/emergency?focus=resolution" className="mt-2 inline-block text-sm font-medium text-[#ef725c] hover:underline">
              Open emergency workspace →
            </Link>
          </div>
        </div>
      ) : null}
    </div>
      ) : null}
    </>
  )
}
