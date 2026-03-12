'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { Check, Loader2 } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { colors } from '@/lib/design-tokens'

interface Task {
  id: string
  description: string
  completed: boolean
  completed_at: string | null
  plan_date: string
  task_order: number
  action_plan: string | null
}

interface TodayResponse {
  date: string
  tasks: Task[]
  progress: number
}

export function TaskWidget() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [date, setDate] = useState<string | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [progress, setProgress] = useState(0)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const recomputeProgress = useCallback((list: Task[]) => {
    const active = list.filter((t) => !(t as any).movedToTomorrow)
    const total = active.length
    const completedCount = active.filter((t) => t.completed).length
    setProgress(total > 0 ? Math.round((completedCount / total) * 100) : 0)
  }, [])

  const loadToday = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/tasks/today', { credentials: 'include' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Failed to load tasks')
      }
      const data = (await res.json()) as TodayResponse
      setDate(data.date)
      setTasks(data.tasks)
      setProgress(data.progress)
    } catch (err) {
      console.error('[TaskWidget] loadToday error', err)
      setError(err instanceof Error ? err.message : 'Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadToday()
  }, [loadToday])

  const handleToggle = async (task: Task) => {
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
    const newTasks = tasks.map((t) =>
      t.id === task.id ? ({ ...t, movedToTomorrow: true } as any as Task) : t
    )
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
      t.id === task.id ? ({ ...t, movedToTomorrow: false } as any as Task) : t
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
    } catch (err) {
      console.error('[TaskWidget] undo-move error', err)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('toast', {
            detail: { message: 'Could not undo move. Please adjust from Morning page.', type: 'error' },
          })
        )
      }
    }
  }

  const activeTasks = tasks.filter((t) => !(t as any).movedToTomorrow)
  const total = activeTasks.length
  const completedCount = activeTasks.filter((t) => t.completed).length
  const todayLabel = date ? format(new Date(date + 'T12:00:00'), 'EEEE, MMMM d') : 'Today'

  return (
    <Card className="mb-6 h-full flex flex-col" style={{ borderRadius: 12 }}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base md:text-lg">
          <span>Today&apos;s Tasks Progress</span>
          <span className="text-sm font-normal text-gray-600 dark:text-gray-300">
            {completedCount}/{total || 0} tasks done
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 flex-1 flex flex-col">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading today&apos;s tasks...
          </div>
        ) : error ? (
          <div className="text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        ) : total === 0 ? (
          <p className="text-sm text-gray-600 dark:text-gray-300">
            No tasks planned for today yet. Set your focus from the Morning page.
          </p>
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

            <div className="space-y-3 mt-4">
              {tasks.map((task) => {
                const moved = (task as any).movedToTomorrow
                return (
                <div
                  key={task.id}
                  className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-3 p-2 rounded-lg border ${
                    moved
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800'
                      : task.completed
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800'
                        : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                  }`}
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

            <div className="flex justify-end">
              <Link
                href={date ? `/morning?date=${date}` : '/morning'}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline underline-offset-2"
              >
                View all tasks →
              </Link>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default TaskWidget

