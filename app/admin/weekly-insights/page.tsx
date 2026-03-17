'use client'

import { useEffect, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, RefreshCcw, AlertTriangle, XCircle, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'

type ErrorEntry = {
  user_id: string
  user_email: string | null
  week_start: string
  week_end: string
  status: 'failed' | 'permanent_failed' | string
  retry_count: number
  last_attempt: string | null
  next_retry_at?: string | null
  error_history: {
    attempt: number
    stage: string
    error_code: string
    error_message: string
    timestamp: string
    metrics: {
      morningTasksCount: number
      eveningReviewsCount: number
      decisionsCount: number
    }
  }[]
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Failed' },
  { value: 'failed', label: 'Failed (will retry)' },
  { value: 'permanent_failed', label: 'Permanent Failed' },
]

export default function WeeklyInsightsAdminPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'all' | 'failed' | 'permanent_failed'>(
    ((searchParams?.get('status') as any) || 'all') as any
  )
  const [loading, setLoading] = useState(true)
  const [errors, setErrors] = useState<ErrorEntry[]>([])
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [retryingKey, setRetryingKey] = useState<string | null>(null)

  const fetchErrors = async (nextStatus = status) => {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/admin/weekly-insights/errors?status=${encodeURIComponent(nextStatus)}&limit=50`
      )
      const json = await res.json()
      if (!res.ok) {
        console.error('[admin/weekly-insights] Failed to load:', json.error)
        setErrors([])
      } else {
        setErrors(json.errors ?? [])
      }
    } catch (err) {
      console.error('[admin/weekly-insights] Error:', err)
      setErrors([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchErrors()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleStatusChange = (value: 'all' | 'failed' | 'permanent_failed') => {
    setStatus(value)
    const params = new URLSearchParams(window.location.search)
    params.set('status', value)
    router.replace(`/admin/weekly-insights?${params.toString()}`)
    fetchErrors(value)
  }

  const handleRetryNow = async (entry: ErrorEntry, force = false) => {
    const key = `${entry.user_id}-${entry.week_start}`
    setRetryingKey(key)
    try {
      const res = await fetch('/api/admin/weekly-insights/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: entry.user_id,
          week_start: entry.week_start,
          force,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        console.error('[admin/weekly-insights] Retry failed:', json.error)
      } else {
        // Refresh list after retry
        fetchErrors()
      }
    } catch (err) {
      console.error('[admin/weekly-insights] Retry error:', err)
    } finally {
      setRetryingKey(null)
    }
  }

  const formatWeekRange = (startStr: string, endStr: string) => {
    const start = parseISO(startStr)
    const end = parseISO(endStr)
    return `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`
  }

  const renderStatus = (entry: ErrorEntry) => {
    const attempts = entry.retry_count
    const maxAttempts = 3
    if (entry.status === 'permanent_failed') {
      return (
        <span className="inline-flex items-center gap-1 text-sm text-red-600 dark:text-red-400">
          <XCircle className="w-4 h-4" />
          Permanent Failed ({attempts}/{maxAttempts})
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 text-sm text-amber-600 dark:text-amber-400">
        <AlertTriangle className="w-4 h-4" />
        Failed ({attempts}/{maxAttempts})
      </span>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            Weekly Insights – Error Monitor
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Inspect and repair failed or permanently failed weekly insights.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchErrors()}
          className="inline-flex items-center gap-1"
        >
          <RefreshCcw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <label className="text-sm text-gray-700 dark:text-gray-300">Filter:</label>
        <div className="relative inline-block">
          <select
            value={status}
            onChange={(e) =>
              handleStatusChange(e.target.value as 'all' | 'failed' | 'permanent_failed')
            }
            className="appearance-none bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-1.5 pr-8 text-sm text-gray-900 dark:text-gray-100"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-gray-500 absolute right-2 top-2.5 pointer-events-none" />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading failed weeks…
        </div>
      ) : errors.length === 0 ? (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          No failed weekly insights found for this filter.
        </p>
      ) : (
        <div className="space-y-4">
          {errors.map((entry) => {
            const key = `${entry.user_id}-${entry.week_start}`
            const isOpen = selectedKey === key
            const lastError = entry.error_history[0]
            const nextRetryLabel = entry.next_retry_at
              ? `Next retry: ${format(parseISO(entry.next_retry_at), 'MMM d, HH:mm')}`
              : null
            return (
              <div
                key={key}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-900"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <p className="text-sm text-gray-900 dark:text-gray-100">
                      <span className="font-medium">
                        User:{' '}
                        {entry.user_email || (
                          <span className="text-gray-500">{entry.user_id}</span>
                        )}
                      </span>
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      Week: {formatWeekRange(entry.week_start, entry.week_end)}
                    </p>
                    <div className="mt-1">{renderStatus(entry)}</div>
                    {lastError && (
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Last error: {lastError.error_message}
                      </p>
                    )}
                    {nextRetryLabel && entry.status === 'failed' && (
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {nextRetryLabel}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={retryingKey === key}
                      onClick={() => handleRetryNow(entry, false)}
                      className="inline-flex items-center gap-1"
                    >
                      {retryingKey === key ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCcw className="w-4 h-4" />
                      )}
                      Retry Now
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={retryingKey === key}
                      onClick={() => handleRetryNow(entry, true)}
                      className="inline-flex items-center gap-1 text-red-600 border-red-300 hover:bg-red-50 dark:text-red-300 dark:border-red-700 dark:hover:bg-red-900/20"
                    >
                      Force Retry
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedKey(isOpen ? null : key)}
                    >
                      {isOpen ? 'Hide Details' : 'View Details'}
                    </Button>
                  </div>
                </div>

                {isOpen && (
                  <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-3">
                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Error history
                    </p>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-xs text-left">
                        <thead>
                          <tr className="text-gray-500 dark:text-gray-400">
                            <th className="px-2 py-1">Attempt</th>
                            <th className="px-2 py-1">Stage</th>
                            <th className="px-2 py-1">Timestamp</th>
                            <th className="px-2 py-1">Error</th>
                            <th className="px-2 py-1">Metrics</th>
                          </tr>
                        </thead>
                        <tbody>
                          {entry.error_history.map((h) => (
                            <tr key={`${h.attempt}-${h.timestamp}`}>
                              <td className="px-2 py-1 text-gray-900 dark:text-gray-100">
                                {h.attempt}
                              </td>
                              <td className="px-2 py-1 text-gray-700 dark:text-gray-300">
                                {h.stage}
                              </td>
                              <td className="px-2 py-1 text-gray-700 dark:text-gray-300">
                                {format(parseISO(h.timestamp), 'MMM d, HH:mm:ss')}
                              </td>
                              <td className="px-2 py-1 text-gray-700 dark:text-gray-300 max-w-xs break-words">
                                {h.error_code && (
                                  <span className="font-semibold mr-1">{h.error_code}:</span>
                                )}
                                {h.error_message}
                              </td>
                              <td className="px-2 py-1 text-gray-700 dark:text-gray-300">
                                <div>
                                  <span className="mr-2">
                                    Tasks:{' '}
                                    <span className="font-semibold">
                                      {h.metrics.morningTasksCount}
                                    </span>
                                  </span>
                                  <span className="mr-2">
                                    Reviews:{' '}
                                    <span className="font-semibold">
                                      {h.metrics.eveningReviewsCount}
                                    </span>
                                  </span>
                                  <span>
                                    Decisions:{' '}
                                    <span className="font-semibold">
                                      {h.metrics.decisionsCount}
                                    </span>
                                  </span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

