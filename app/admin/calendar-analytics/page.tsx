'use client'

import { useEffect, useState } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'

type CalendarAnalyticsResponse = {
  summary: {
    totalUsersWhoSawModal: number
    totalSubscribed: number
    subscriptionRate: number
    skipRate: number
  }
  providerBreakdown: { google: number; apple: number; outlook: number }
  dailyTrend: Array<{ date: string; views: number; subscriptions: number; rate: number }>
  recentActivity: Array<{ userId?: string; at?: string; provider?: string; placement?: string; segment?: string }>
  userFeedback: { topSkipReasons: Array<{ reason: string; count: number }> }
}

const COLORS = ['#ef725c', '#152b50', '#10b981']

export default function CalendarAnalyticsPage() {
  const [data, setData] = useState<CalendarAnalyticsResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch('/api/admin/calendar-analytics?days=30', { credentials: 'include' })
        if (!res.ok) throw new Error('Failed')
        const json = (await res.json()) as CalendarAnalyticsResponse
        setData(json)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  if (loading) return <div className="max-w-6xl mx-auto px-4 py-8 text-sm text-gray-500">Loading…</div>
  if (!data) return <div className="max-w-6xl mx-auto px-4 py-8 text-sm text-gray-500">No data.</div>

  const pieData = [
    { name: 'Google', value: data.providerBreakdown.google },
    { name: 'Apple', value: data.providerBreakdown.apple },
    { name: 'Outlook', value: data.providerBreakdown.outlook },
  ]

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Calendar Subscription Analytics</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Metric title="Views" value={data.summary.totalUsersWhoSawModal} />
        <Metric title="Subscriptions" value={data.summary.totalSubscribed} />
        <Metric title="Subscription Rate" value={`${data.summary.subscriptionRate}%`} />
        <Metric title="Skip Rate" value={`${data.summary.skipRate}%`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow">
          <h2 className="font-semibold mb-3 text-gray-900 dark:text-white">Provider Breakdown</h2>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} label>
                {pieData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </section>

        <section className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow">
          <h2 className="font-semibold mb-3 text-gray-900 dark:text-white">Daily Subscription Rate</h2>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data.dailyTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="rate" stroke="#ef725c" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </section>
      </div>

      <section className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow">
        <h2 className="font-semibold mb-3 text-gray-900 dark:text-white">Recent Activity</h2>
        <div className="space-y-2">
          {data.recentActivity.length === 0 ? (
            <p className="text-sm text-gray-500">No subscriptions yet.</p>
          ) : (
            data.recentActivity.map((a, i) => (
              <div key={`${a.userId}-${a.at}-${i}`} className="text-sm text-gray-700 dark:text-gray-300 border-b border-gray-100 dark:border-gray-700 pb-2">
                {a.at ? new Date(a.at).toLocaleString() : '—'} · {a.provider || 'unknown'} · {a.segment || 'n/a'}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}

function Metric({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow border-l-4 border-l-[#152b50]">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
    </div>
  )
}

