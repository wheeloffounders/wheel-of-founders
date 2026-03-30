'use client'

import { useEffect, useMemo, useState } from 'react'

type AnalyticsResponse = {
  rangeDays: number
  totals: { sent: number; opened: number; clicked: number; openRate: number; clickRate: number }
  byType: Array<{ emailType: string; sent: number; opened: number; clicked: number; openRate: number; clickRate: number }>
  topLinks: Array<{ url: string; clicks: number }>
  trend: Array<{ date: string; sent: number; opened: number; clicked: number }>
}

export default function EmailAnalyticsPage() {
  const [days, setDays] = useState(30)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<AnalyticsResponse | null>(null)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/email/analytics?days=${days}`, { credentials: 'include' })
        if (!res.ok) {
          const json = (await res.json().catch(() => ({}))) as { error?: string }
          throw new Error(json.error || 'Failed to load email analytics')
        }
        const json = (await res.json()) as AnalyticsResponse
        if (!cancelled) setData(json)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [days])

  const totals = data?.totals
  const byType = useMemo(() => data?.byType ?? [], [data])

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Email Analytics</h1>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded px-3 py-2 text-sm"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {loading ? <p className="text-sm text-gray-500">Loading analytics...</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {totals ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded border border-gray-200 dark:border-gray-700 p-4">
            <div className="text-xs uppercase text-gray-500">Sent</div>
            <div className="text-2xl font-semibold">{totals.sent}</div>
          </div>
          <div className="rounded border border-gray-200 dark:border-gray-700 p-4">
            <div className="text-xs uppercase text-gray-500">Open Rate</div>
            <div className="text-2xl font-semibold">{Math.round(totals.openRate * 100)}%</div>
          </div>
          <div className="rounded border border-gray-200 dark:border-gray-700 p-4">
            <div className="text-xs uppercase text-gray-500">Click Rate</div>
            <div className="text-2xl font-semibold">{Math.round(totals.clickRate * 100)}%</div>
          </div>
        </div>
      ) : null}

      {byType.length > 0 ? (
        <div className="rounded border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="text-left px-3 py-2">Email Type</th>
                <th className="text-right px-3 py-2">Sent</th>
                <th className="text-right px-3 py-2">Opened</th>
                <th className="text-right px-3 py-2">Clicked</th>
                <th className="text-right px-3 py-2">Open %</th>
                <th className="text-right px-3 py-2">CTR %</th>
              </tr>
            </thead>
            <tbody>
              {byType.map((r) => (
                <tr key={r.emailType} className="border-t border-gray-100 dark:border-gray-800">
                  <td className="px-3 py-2">{r.emailType}</td>
                  <td className="px-3 py-2 text-right">{r.sent}</td>
                  <td className="px-3 py-2 text-right">{r.opened}</td>
                  <td className="px-3 py-2 text-right">{r.clicked}</td>
                  <td className="px-3 py-2 text-right">{Math.round(r.openRate * 100)}%</td>
                  <td className="px-3 py-2 text-right">{Math.round(r.clickRate * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {data?.topLinks?.length ? (
        <div className="rounded border border-gray-200 dark:border-gray-700 p-4">
          <h2 className="text-sm font-medium mb-3">Top Clicked Links</h2>
          <div className="space-y-2 text-sm">
            {data.topLinks.map((l) => (
              <div key={l.url} className="flex justify-between gap-4">
                <span className="truncate text-gray-700 dark:text-gray-200">{l.url}</span>
                <span className="text-gray-500">{l.clicks}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

