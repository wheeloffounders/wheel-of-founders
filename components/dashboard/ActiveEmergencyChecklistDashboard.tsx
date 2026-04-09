'use client'

import type React from 'react'
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { logSupabaseQueryError } from '@/lib/supabase/log-query-error'
import { getUserSession } from '@/lib/auth'
import { getClientAuthHeaders } from '@/lib/api/fetch-json'
import { ActiveResolutionDashboardCard } from '@/components/dashboard/ActiveResolutionDashboardCard'
import { CrisisRestorationModal } from '@/components/dashboard/CrisisRestorationModal'
import {
  REST_RECOVER_STORAGE_KEY,
  useRestRecoverModalHandlers,
} from '@/components/dashboard/useRestRecoverModalHandlers'

type Props = {
  /** Shared with {@link EmergencySafetySeal} so “Keep tasks in tomorrow” shows the recovery banner. */
  setShowRestRecover: React.Dispatch<React.SetStateAction<boolean>>
  /** Parent-owned; bump after resolve/restore so {@link EmergencySafetySeal} refetches. */
  refreshKey: number
  onResolutionSettled: () => void
}

/**
 * Hot, unresolved emergency with a non-empty containment plan: checklist + resolve (below greeting).
 * Committed timestamp is not filtered in SQL (avoids PostgREST 400s on some deployments); we match on plan text.
 */
export function ActiveEmergencyChecklistDashboard({
  setShowRestRecover,
  refreshKey,
  onResolutionSettled,
}: Props) {
  const [loaded, setLoaded] = useState(false)
  const [active, setActive] = useState<{
    id: string
    description: string
    location: string | null
    containment_plan: string
  } | null>(null)
  const [restorationOpen, setRestorationOpen] = useState(false)
  const [restorableCount, setRestorableCount] = useState(0)
  const [restorationCountLoading, setRestorationCountLoading] = useState(false)
  const [restorationLoading, setRestorationLoading] = useState(false)

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
      onResolutionSettled()
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
  }, [onResolutionSettled, setShowRestRecover])

  const { handleKeepTomorrow } = useRestRecoverModalHandlers(setRestorationOpen, setShowRestRecover)

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
        // keep prior count
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
    ;(async () => {
      const session = await getUserSession()
      if (!session?.user?.id) {
        if (!cancelled) {
          setActive(null)
          setLoaded(true)
        }
        return
      }

      // Omit `location` here: older DBs without migration 143 return 400 if the column is unknown to PostgREST.
      const { data: rows, error: emergenciesError } = await supabase
        .from('emergencies')
        .select('id, description, containment_plan')
        .eq('user_id', session.user.id)
        .eq('resolved', false)
        .eq('severity', 'hot')
        .order('created_at', { ascending: false })
        .limit(12)

      if (emergenciesError) {
        logSupabaseQueryError('[ActiveEmergencyChecklistDashboard] Supabase emergencies query failed', emergenciesError)
        if (!cancelled) setActive(null)
      } else {
        const list = Array.isArray(rows) ? rows : []
        const activeRow =
          list.find(
            (r) =>
              r &&
              typeof r.id === 'string' &&
              typeof r.containment_plan === 'string' &&
              r.containment_plan.trim().length > 0
          ) ?? null

        if (
          !cancelled &&
          activeRow?.id &&
          typeof activeRow.containment_plan === 'string' &&
          activeRow.containment_plan.trim()
        ) {
          setActive({
            id: activeRow.id,
            description: String(activeRow.description ?? ''),
            location: null,
            containment_plan: String(activeRow.containment_plan),
          })
        } else if (!cancelled) {
          setActive(null)
        }
      }

      if (!cancelled) setLoaded(true)
    })()

    return () => {
      cancelled = true
    }
  }, [refreshKey])

  if (!loaded || !active) return null

  return (
    <>
      <CrisisRestorationModal
        open={restorationOpen}
        taskCount={restorableCount}
        countLoading={restorationCountLoading}
        loading={restorationLoading}
        onRestore={() => void handleRestoreToday()}
        onKeepTomorrow={handleKeepTomorrow}
        onAcknowledgeNoRestore={() => setRestorationOpen(false)}
      />
      <div className="mb-4">
        <ActiveResolutionDashboardCard
          emergencyId={active.id}
          fireDescription={active.description}
          location={active.location}
          containmentPlan={active.containment_plan}
          onResolved={onResolutionSettled}
          onRestorationPrompt={handleRestorationPrompt}
        />
      </div>
    </>
  )
}
