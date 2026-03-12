'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { ArrowLeft, AlertTriangle, CheckCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

type ErrorLog = {
  id: string
  error_type: string
  error_message: string
  stack_trace: string | null
  user_id: string | null
  url: string | null
  component: string | null
  severity: string
  metadata: Record<string, unknown> | null
  created_at: string
  resolved_at: string | null
  resolution_notes: string | null
}

export default function AdminErrorsPage() {
  const [errors, setErrors] = useState<ErrorLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unresolved' | 'resolved'>('unresolved')
  const [error, setError] = useState<string | null>(null)

  const fetchErrors = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const qs =
        filter === 'unresolved'
          ? '?resolved=false'
          : filter === 'resolved'
            ? '?resolved=true'
            : ''
      const res = await fetch(`/api/admin/errors${qs}`, { credentials: 'include' })
      if (!res.ok) {
        if (res.status === 403) setError('Admin only')
        else setError('Failed to load')
        return
      }
      const data = await res.json()
      setErrors(data.errors ?? [])
    } catch {
      setError('Failed to load')
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    fetchErrors()
  }, [fetchErrors])

  const markResolved = async (id: string, resolved: boolean) => {
    try {
      const res = await fetch('/api/admin/errors', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id, resolved }),
      })
      if (res.ok) {
        setErrors((prev) =>
          prev.map((e) =>
            e.id === id
              ? { ...e, resolved_at: resolved ? new Date().toISOString() : null }
              : e
          )
        )
      }
    } catch {
      // Ignore
    }
  }

  const severityColors: Record<string, string> = {
    critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200',
    high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200',
    medium: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200',
    low: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Link
        href="/admin"
        className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Admin
      </Link>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <AlertTriangle className="w-8 h-8 text-amber-500" />
          Code Scary – Error Logs
        </h1>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as 'all' | 'unresolved' | 'resolved')}
          className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        >
          <option value="unresolved">Unresolved</option>
          <option value="all">All</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ef725c]" />
        </div>
      ) : (
        <div className="space-y-4">
          {errors.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              No errors found
            </div>
          ) : (
            errors.map((err) => (
              <div
                key={err.id}
                className={`rounded-xl border p-4 ${
                  err.resolved_at
                    ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
                    : 'border-amber-200 dark:border-amber-800 bg-white dark:bg-gray-800'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          severityColors[err.severity] ?? severityColors.low
                        }`}
                      >
                        {err.severity}
                      </span>
                      {err.component && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {err.component}
                        </span>
                      )}
                      {err.resolved_at && (
                        <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Resolved
                        </span>
                      )}
                    </div>
                    <p className="font-mono text-sm mt-2 text-gray-900 dark:text-gray-100 break-words">
                      {err.error_message}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {err.error_type} • {formatDistanceToNow(new Date(err.created_at), { addSuffix: true })}
                    </p>
                    {err.url && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1" title={err.url}>
                        {err.url}
                      </p>
                    )}
                    {err.stack_trace && (
                      <details className="mt-2">
                        <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                          Stack trace
                        </summary>
                        <pre className="mt-1 text-xs text-gray-600 dark:text-gray-400 overflow-x-auto whitespace-pre-wrap">
                          {err.stack_trace}
                        </pre>
                      </details>
                    )}
                  </div>
                  {!err.resolved_at && (
                    <button
                      type="button"
                      onClick={() => markResolved(err.id, true)}
                      className="flex-shrink-0 px-3 py-1.5 text-sm rounded-lg bg-green-600 text-white hover:bg-green-700"
                    >
                      Mark resolved
                    </button>
                  )}
                  {err.resolved_at && (
                    <button
                      type="button"
                      onClick={() => markResolved(err.id, false)}
                      className="flex-shrink-0 px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      Reopen
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
