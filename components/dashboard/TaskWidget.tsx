'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { Check, Loader2 } from 'lucide-react'
import useSWR from 'swr'
import { Card, CardContent } from '@/components/ui/card'
import { InfoTooltip } from '@/components/InfoTooltip'
import { colors } from '@/lib/design-tokens'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { getEffectivePlanDate, getPlanDateString } from '@/lib/effective-plan-date'
import { getUserSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { DEFAULT_USER_TIMEZONE, getUserTimezoneFromProfile } from '@/lib/timezone'
import { fetchJson } from '@/lib/api/fetch-json'

interface Task {
  id: string
  description: string
  completed: boolean
  completed_at: string | null
  plan_date: string
  task_order: number
  action_plan: string | null
  movedToTomorrow?: boolean
}

interface TodayResponse {
  date: string
  tasks: Array<Task & { movedToTomorrow?: boolean }>
  progress: number
  original_total_count?: number
  completed_count?: number
  debug?: {
    userTimeZone?: string
    planDateUsed?: string
    serverTime?: string
    effectiveDateComputed?: string
    tasksCount?: number
    rawPlanDate?: string
  }
}

const TASKS_TODAY_URL = '/api/tasks/today'

export function TaskWidget() {
  const [date, setDate] = useState<string | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [progress, setProgress] = useState(0)
  const [originalTotal, setOriginalTotal] = useState(0)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [showDebug, setShowDebug] = useState(false)
  const [browserDate, setBrowserDate] = useState('')
  const [clientEffectiveDate, setClientEffectiveDate] = useState('')

  const {
    data: swrData,
    error: swrError,
    isLoading,
    mutate,
  } = useSWR<TodayResponse>(TASKS_TODAY_URL, (url) => fetchJson<TodayResponse>(url), {
    revalidateOnFocus: false,
    dedupingInterval: 90_000,
    keepPreviousData: true,
  })

  const recomputeProgress = useCallback((list: Task[], baselineTotal?: number) => {
    const denominator = Math.max(0, baselineTotal ?? originalTotal)
    const completedCount = list.filter((t) => t.completed).length
    setProgress(denominator > 0 ? Math.round((completedCount / denominator) * 100) : 0)
  }, [originalTotal])

  useEffect(() => {
    if (!swrData) return
    const baselineTotal = Math.max(0, Number(swrData.original_total_count ?? swrData.tasks.length))
    setOriginalTotal(baselineTotal)
    setDate(swrData.date)
    const next = swrData.tasks.map((t) => ({
      ...t,
      movedToTomorrow: Boolean(t.movedToTomorrow),
    }))
    setTasks(next)
    queueMicrotask(() => recomputeProgress(next, baselineTotal))
  }, [swrData, recomputeProgress])

  useEffect(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    setBrowserDate(`${year}-${month}-${day}`)
  }, [])

  /** Match morning page + /api/tasks/today: founder-day in profile timezone; sync default UTC → browser zone. */
  useEffect(() => {
    let cancelled = false
    const run = async () => {
      const session = await getUserSession()
      if (!session?.user?.id) {
        if (!cancelled) setClientEffectiveDate(getEffectivePlanDate())
        return
      }
      const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('timezone')
        .eq('id', session.user.id)
        .maybeSingle()
      if (cancelled) return
      const profileTz = getUserTimezoneFromProfile(profile as { timezone?: string | null } | null)
      const effective = getPlanDateString(profileTz)
      setClientEffectiveDate(effective)

      if (profileTz === DEFAULT_USER_TIMEZONE && browserTz !== DEFAULT_USER_TIMEZONE) {
        const res = await fetch('/api/user-preferences/timezone', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ timezone: browserTz }),
        })
        if (res.ok) void mutate()
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [mutate])

  useEffect(() => {
    const onSync = () => {
      void mutate()
    }
    window.addEventListener('data-sync-request', onSync)
    return () => window.removeEventListener('data-sync-request', onSync)
  }, [mutate])

  const fetchError = swrError instanceof Error ? swrError.message : swrError ? 'Failed to load tasks' : null
  const loading = isLoading && !swrData
  const debug = process.env.NODE_ENV === 'development' ? swrData?.debug : undefined

  const handleToggle = async (task: Task) => {
    if (task.movedToTomorrow) return
    const nextCompleted = !task.completed
    setUpdatingId(task.id)
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id
          ? {
              ...t,
              completed: nextCompleted,
              completed_at: nextCompleted ? new Date().toISOString() : null,
            }
          : t
      )
    )
    setTasks((prev) => {
      const next = prev.map((t) =>
        t.id === task.id
          ? {
              ...t,
              completed: nextCompleted,
            }
          : t
      )
      recomputeProgress(next)
      return next
    })

    try {
      const res = await fetch('/api/tasks/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ taskId: task.id, completed: nextCompleted }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Failed to update task')
      }
    } catch (err) {
      console.error('[TaskWidget] toggle error', err)
      // revert
      setTasks((prev) => {
        const next = prev.map((t) =>
          t.id === task.id ? { ...t, completed: task.completed, completed_at: task.completed_at } : t
        )
        recomputeProgress(next)
        return next
      })
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('toast', {
            detail: { message: 'Could not update task. Please try again.', type: 'error' },
          })
        )
      }
    } finally {
      setUpdatingId(null)
    }
  }

  const handleMoveToTomorrow = async (task: Task) => {
    // Optimistic: mark as moved but keep in list
    const originalTasks = tasks
    const newTasks = tasks.map((t) => (t.id === task.id ? { ...t, movedToTomorrow: true } : t))
    setTasks(newTasks)
    recomputeProgress(newTasks)

    try {
      const res = await fetch('/api/tasks/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ taskId: task.id, targetDate: 'tomorrow' }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Failed to move task')
      }
      await mutate()
    } catch (err) {
      console.error('[TaskWidget] move error', err)
      // revert
      setTasks(originalTasks)
      recomputeProgress(originalTasks)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('toast', {
            detail: { message: 'Could not move task. Please try again.', type: 'error' },
          })
        )
      }
    }
  }

  const handleUndoMove = async (task: Task) => {
    const originalTasks = tasks
    const restoredTasks = tasks.map((t) =>
      t.id === task.id ? { ...t, movedToTomorrow: false } : t
    )
    setTasks(restoredTasks)
    recomputeProgress(restoredTasks)

    try {
      const res = await fetch('/api/tasks/undo-move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ taskId: task.id }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Failed to undo move')
      }
      await mutate()
    } catch (err) {
      console.error('[TaskWidget] undo-move error', err)
      setTasks(originalTasks)
      recomputeProgress(originalTasks)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('toast', {
            detail: { message: 'Could not undo move. Please adjust from Morning page.', type: 'error' },
          })
        )
      }
    }
  }

  const syncTimezone = async () => {
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
      const res = await fetch('/api/user-preferences/timezone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ timezone }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string })?.error || 'Failed to sync timezone')
      }
      if (typeof window !== 'undefined') {
        window.location.reload()
      }
    } catch (err) {
      console.error('[TaskWidget] timezone sync failed', err)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('toast', {
            detail: { message: 'Failed to sync timezone.', type: 'error' },
          })
        )
      }
    }
  }

  const total = Math.max(originalTotal, tasks.length)
  const completedCount = tasks.filter((t) => t.completed).length
  const todayLabel = date ? format(new Date(date + 'T12:00:00'), 'EEEE, MMMM d') : 'Today'

  return (
    <Card className="h-full flex flex-col border border-gray-200 dark:border-gray-700 border-l-4 border-l-amber-400 bg-white/60 dark:bg-gray-800/40 shadow-none overflow-visible">
      <CardContent className="px-4 pb-4 pt-4 space-y-3 flex-1 flex flex-col overflow-visible">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <div className="flex items-center gap-1.5 flex-wrap mb-2">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Today&apos;s Tasks Progress
            </h3>
            <InfoTooltip
              presentation="popover"
              position="bottom"
              text="Progress compares completed tasks to the total from your last morning save (including tasks you moved to tomorrow). Saving an updated plan can change that baseline."
            />
          </div>
          <span className="text-sm text-gray-600 dark:text-gray-300 tabular-nums">
            {completedCount}/{total || 0} tasks done
          </span>
        </div>
        {debug ? (
          <div className="flex justify-end -mt-1">
            <button
              type="button"
              onClick={() => setShowDebug((v) => !v)}
              className="text-[11px] bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 px-2 py-1 rounded text-gray-700 dark:text-gray-200"
            >
              {showDebug ? 'Hide Debug' : 'Show Debug'}
            </button>
          </div>
        ) : null}
        {debug && showDebug ? (
          <div className="rounded-lg bg-gray-900 text-green-300 p-3 font-mono text-[11px] overflow-auto">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="font-semibold text-white">Debug: Task Timezone Info</div>
              <button
                type="button"
                onClick={syncTimezone}
                className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-[11px]"
              >
                Sync Timezone
              </button>
            </div>
            <div>User Timezone: {debug.userTimeZone ?? 'n/a'}</div>
            <div>
              Plan Date Used: <span className="text-yellow-300">{debug.planDateUsed ?? 'n/a'}</span>
            </div>
            <div>Browser Local Date: <span className="text-blue-300">{browserDate || 'n/a'}</span></div>
            <div>Profile founder day (client): <span className="text-cyan-300">{clientEffectiveDate || 'n/a'}</span></div>
            <div>Raw Plan Date: {debug.rawPlanDate ?? 'n/a'}</div>
            <div>Server Time: {debug.serverTime ?? 'n/a'}</div>
            <div>Tasks Found: {debug.tasksCount ?? 0}</div>
            <div>Effective Date Computed: {debug.effectiveDateComputed ?? 'n/a'}</div>
            <div className="mt-3 pt-2 border-t border-gray-700">
              <div className="mb-2">
                <span className="text-gray-400">Date Alignment: </span>
                {debug.planDateUsed && clientEffectiveDate && debug.planDateUsed === clientEffectiveDate ? (
                  <span className="text-green-400 font-bold">ALIGNED</span>
                ) : (
                  <span className="text-red-400 font-bold">MISMATCH</span>
                )}
              </div>
              {debug.planDateUsed && clientEffectiveDate && debug.planDateUsed !== clientEffectiveDate ? (
                <div className="bg-red-900/30 border border-red-500 rounded p-2 text-red-300">
                  Server using {debug.planDateUsed}, client effective date is {clientEffectiveDate}. This can hide tasks around timezone/day boundaries.
                </div>
              ) : null}
              {debug.planDateUsed && clientEffectiveDate && debug.planDateUsed === clientEffectiveDate && (debug.tasksCount ?? 0) === 0 ? (
                <div className="mt-2 bg-yellow-900/30 border border-yellow-500 rounded p-2 text-yellow-300">
                  Dates align but no tasks found. Check whether onboarding save inserted rows for this date.
                </div>
              ) : null}
              {debug.planDateUsed && clientEffectiveDate && debug.planDateUsed === clientEffectiveDate && (debug.tasksCount ?? 0) > 0 ? (
                <div className="mt-2 bg-green-900/30 border border-green-500 rounded p-2 text-green-300">
                  Dates align and tasks exist.
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading today&apos;s tasks...
          </div>
        ) : fetchError ? (
          <div className="text-sm text-red-600 dark:text-red-400">
            {fetchError}
          </div>
        ) : tasks.length === 0 ? (
          <EmptyState
            message="No tasks planned for today yet. Set your focus from the Morning page."
            ctaLabel="Go to Morning plan"
            ctaHref={date ? `/morning?date=${date}` : '/morning'}
          />
        ) : (
          <>
            <div>
              <div className="w-full h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                <div
                  className="h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${progress}%`,
                    backgroundColor: colors.emerald.DEFAULT,
                  }}
                />
              </div>
              <div className="mt-1 flex justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>{progress}% complete</span>
                <span>{todayLabel}</span>
              </div>
            </div>

            <div className="space-y-2 mt-3">
              {tasks.map((task) => {
                const moved = task.movedToTomorrow
                const rowClasses = task.completed
                  ? 'bg-emerald-100 dark:bg-emerald-900/30'
                  : moved
                    ? 'bg-gray-100 dark:bg-gray-800/50'
                    : 'bg-blue-50 dark:bg-blue-900/20'
                return (
                <div
                  key={task.id}
                  className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-3 p-3 rounded-lg transition-colors ${rowClasses}`}
                >
                  <button
                    type="button"
                    className="flex items-start gap-2 text-left flex-1 group"
                    onClick={() => handleToggle(task)}
                    disabled={updatingId === task.id}
                  >
                    <span
                      className={`mt-0.5 inline-flex h-4 w-4 items-center justify-center rounded border text-[10px] ${
                        task.completed
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 group-hover:border-emerald-500'
                      }`}
                    >
                      {task.completed && <Check className="w-3 h-3" />}
                    </span>
                    <span
                      className={`text-sm ${
                        task.completed
                          ? 'text-gray-600 dark:text-gray-300'
                          : 'text-gray-800 dark:text-gray-100'
                      }`}
                    >
                      {task.description}
                    </span>
                  </button>

                  <div className="flex flex-col items-start sm:items-end gap-1">
                    {!task.completed && !moved && (
                      <button
                        type="button"
                        onClick={() => handleMoveToTomorrow(task)}
                        className="text-xs text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 underline-offset-2 hover:underline"
                      >
                        Move to tomorrow
                      </button>
                    )}
                    {!task.completed && moved && (
                      <div className="flex items-center gap-2 text-xs text-blue-700 dark:text-blue-300">
                        <span>Task moved to tomorrow</span>
                        <button
                          type="button"
                          onClick={() => handleUndoMove(task)}
                          className="text-blue-600 dark:text-blue-400 hover:underline underline-offset-2"
                        >
                          Undo
                        </button>
                      </div>
                    )}
                    {task.completed && (
                      <span className="text-xs text-emerald-700 dark:text-emerald-300">
                        Completed
                      </span>
                    )}
                  </div>
                </div>
              )})}
            </div>

            <div className="flex justify-end pt-1">
              <Link
                href={`/evening?date=${date ?? (clientEffectiveDate || getEffectivePlanDate())}#evening-form`}
                className="text-sm text-[#ef725c] hover:underline"
              >
                Open evening reflection →
              </Link>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default TaskWidget

