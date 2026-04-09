'use client'

import { useState } from 'react'
import Link from 'next/link'
import confetti from 'canvas-confetti'
import { MapPin, Shield } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getUserSession, refreshSessionForWrite, isRlsOrAuthPermissionError } from '@/lib/auth'
import { getClientAuthHeaders } from '@/lib/api/fetch-json'
import { Button } from '@/components/ui/button'
import { colors } from '@/lib/design-tokens'
import { usePersistedEmergencyChecklist } from '@/lib/hooks/usePersistedEmergencyChecklist'
import { dispatchEmergencyModeRefresh } from '@/components/emergency/EmergencyModeProvider'

function fireResolutionConfetti() {
  if (typeof window === 'undefined') return
  const count = 120
  const defaults = { origin: { y: 0.68 }, spread: 72, ticks: 200, gravity: 0.9, scalar: 1.05 }
  confetti({ ...defaults, particleCount: Math.floor(count * 0.35), startVelocity: 35 })
  confetti({ ...defaults, particleCount: Math.floor(count * 0.25), startVelocity: 28, spread: 100 })
  confetti({ ...defaults, particleCount: Math.floor(count * 0.4), startVelocity: 42, spread: 86 })
}

type ActiveResolutionDashboardCardProps = {
  emergencyId: string
  fireDescription: string
  /** Optional place label saved with the log */
  location?: string | null
  containmentPlan: string
  onResolved: () => void
  /** Called after resolve + parent refresh, when tasks can be pulled back from tomorrow. */
  onRestorationPrompt?: (taskCount: number) => void
}

export function ActiveResolutionDashboardCard({
  emergencyId,
  fireDescription,
  location,
  containmentPlan,
  onResolved,
  onRestorationPrompt,
}: ActiveResolutionDashboardCardProps) {
  const [resolving, setResolving] = useState(false)
  const { steps, completedByIndex, toggleRow } = usePersistedEmergencyChecklist(emergencyId, containmentPlan)

  const handleMarkResolved = async () => {
    setResolving(true)
    try {
      const session = await getUserSession()
      if (!session?.user?.id) return

      const run = () =>
        supabase
          .from('emergencies')
          .update({ resolved: true, updated_at: new Date().toISOString() })
          .eq('id', emergencyId)
          .eq('user_id', session.user.id)

      let { error } = await run()
      if (error && isRlsOrAuthPermissionError(error)) {
        const again = await refreshSessionForWrite()
        if (again.ok) ({ error } = await run())
      }
      if (error) throw new Error(error.message)

      fireResolutionConfetti()
      dispatchEmergencyModeRefresh()
      window.dispatchEvent(new CustomEvent('data-sync-request'))
      window.dispatchEvent(
        new CustomEvent('toast', {
          detail: {
            message:
              'Fire contained. Take a deep breath, Founder. Your safety streak begins now.',
            type: 'success',
          },
        })
      )

      let restorable = 0
      try {
        const headers = await getClientAuthHeaders()
        const res = await fetch('/api/tasks/restorable-from-tomorrow', { credentials: 'include', headers })
        if (res.ok) {
          const data = (await res.json()) as { count?: number }
          restorable = typeof data.count === 'number' ? data.count : 0
        }
      } catch {
        // non-blocking
      }

      setResolving(false)
      onResolved()
      if (restorable > 0) onRestorationPrompt?.(restorable)
    } catch (e) {
      window.dispatchEvent(
        new CustomEvent('toast', {
          detail: {
            message: e instanceof Error ? e.message : 'Could not mark resolved.',
            type: 'error',
          },
        })
      )
      setResolving(false)
    }
  }

  return (
    <div
      className="mt-6 rounded-2xl border-2 border-amber-200/70 border-l-4 border-l-amber-500 bg-white p-5 shadow-2xl shadow-amber-900/15 ring-1 ring-amber-500/10 dark:border-amber-900/50 dark:border-l-amber-400 dark:bg-gray-900/95 dark:shadow-black/50 dark:ring-amber-400/15"
      role="region"
      aria-label="Active emergency resolution"
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: 'rgba(245, 158, 11, 0.18)' }}
          aria-hidden
        >
          <Shield className="h-5 w-5 text-amber-800 dark:text-amber-300" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-800/90 dark:text-amber-300/90">
            Active resolution · Command center
          </p>
          <p className="mt-1 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
            <span className="font-semibold text-[#b91c1c] dark:text-orange-300">Fire:</span>{' '}
            <span className="text-gray-900 dark:text-gray-100">{fireDescription}</span>
          </p>
          {location?.trim() ? (
            <p className="mt-1.5 flex items-start gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
              <span>{location.trim()}</span>
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-4 rounded-lg border-2 border-amber-200 bg-amber-50/90 p-3 dark:border-amber-600/60 dark:bg-amber-950/25">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-900/90 dark:text-amber-200/90">
          Your checklist
        </p>
        <ul className="mt-2 space-y-2.5" role="list">
          {steps.length > 0 ? (
            steps.map((step, i) => {
              const done = Boolean(completedByIndex[i])
              return (
                <li key={`${i}-${step.slice(0, 32)}`}>
                  <label className="flex cursor-pointer items-start gap-2.5 text-sm font-medium leading-snug text-gray-900 dark:text-gray-100">
                    <input
                      type="checkbox"
                      checked={done}
                      onChange={() => toggleRow(i)}
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-amber-700/80 text-amber-600 focus:ring-2 focus:ring-amber-500 focus:ring-offset-0 dark:border-amber-500 dark:bg-gray-900 dark:text-amber-500"
                      aria-label={`Checklist: ${step.slice(0, 80)}${step.length > 80 ? '…' : ''}`}
                    />
                    <span
                      className={
                        done ? 'text-slate-400 line-through dark:text-slate-500' : 'text-gray-900 dark:text-gray-100'
                      }
                    >
                      {step}
                    </span>
                  </label>
                </li>
              )
            })
          ) : (
            <li className="text-sm italic text-amber-900/70 dark:text-amber-200/70">
              Open the emergency workspace to add 2–3 moves to your plan.
            </li>
          )}
        </ul>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button
          type="button"
          className="font-semibold"
          style={{ backgroundColor: colors.navy.DEFAULT, color: '#fff' }}
          disabled={resolving}
          onClick={() => void handleMarkResolved()}
        >
          {resolving ? 'Saving…' : 'Mark resolved'}
        </Button>
        <Link href="/emergency?focus=resolution" className="text-sm font-medium text-[#ef725c] hover:underline">
          Full emergency workspace →
        </Link>
      </div>
    </div>
  )
}
