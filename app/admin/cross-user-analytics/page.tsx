'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getUserSession } from '@/lib/auth'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { RefreshCw, Download, Search } from 'lucide-react'

// Layout protects admin routes; this is a fallback for client-side nav
const NAVY = '#152b50'
const CORAL = '#ef725c'
const EMERALD = '#10b981'

type DateRange = '7d' | '30d' | 'custom'

type ApiData = {
  totalActiveUsers: number
  totalPatternsDetected: number
  mostCommonStruggle: string
  mostCommonWin: string
  topStruggles: { text: string; count: number }[]
  topWins: { text: string; count: number }[]
  trendOverTime: { date: string; struggles: number; wins: number }[]
  wordCloudThemes: { text: string; count: number }[]
  correlationInsights: string[]
  rawData: { pattern_text: string; pattern_type: string; user_id_anon: string; date: string }[]
  startDate: string
  endDate: string
}

// Auth: session cookies are sent automatically; API also accepts Authorization: Bearer ADMIN_SECRET

function truncate(s: string, max: number) {
  if (s.length <= max) return s
  return s.slice(0, max) + '…'
}

function exportToCsv(rawData: ApiData['rawData']) {
  const headers = ['Pattern text', 'Type', 'User (anon)', 'Date']
  const rows = rawData.map((r) => [
    `"${(r.pattern_text || '').replace(/"/g, '""')}"`,
    r.pattern_type,
    r.user_id_anon,
    r.date,
  ])
  const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `cross-user-analytics-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(link.href)
}

export default function CrossUserAnalyticsPage() {
  const router = useRouter()
  const [data, setData] = useState<ApiData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [dateRange, setDateRange] = useState<DateRange>('7d')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [tableSearch, setTableSearch] = useState('')
  const [tableTypeFilter, setTableTypeFilter] = useState<string>('')

  const fetchUrl = useMemo(() => {
    if (dateRange === 'custom' && customStart && customEnd) {
      return `/api/admin/cross-user-analytics?startDate=${customStart}&endDate=${customEnd}`
    }
    return `/api/admin/cross-user-analytics?timeframe=${dateRange}`
  }, [dateRange, customStart, customEnd])

  const loadData = async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const headers: HeadersInit = {}
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }
      const res = await fetch(fetchUrl, { headers, credentials: 'include' })
      if (!res.ok) {
        setData(null)
        return
      }
      const json = await res.json()
      setData(json)
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  const triggerRefresh = async () => {
    setRefreshing(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }
      await fetch('/api/admin/cross-user-analytics', {
        method: 'POST',
        headers,
        credentials: 'include',
      })
      await loadData()
    } catch {
      // ignore
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    const init = async () => {
      const session = await getUserSession()
      if (!session?.user?.is_admin) {
        router.push('/')
        return
      }
      if (dateRange !== 'custom' || (customStart && customEnd)) {
        loadData()
      }
    }
    init()
  }, [router, fetchUrl])

  const filteredRawData = useMemo(() => {
    if (!data?.rawData) return []
    let list = data.rawData
    if (tableSearch.trim()) {
      const q = tableSearch.trim().toLowerCase()
      list = list.filter(
        (r) =>
          r.pattern_text?.toLowerCase().includes(q) ||
          r.pattern_type?.toLowerCase().includes(q) ||
          r.user_id_anon?.toLowerCase().includes(q) ||
          r.date?.includes(q)
      )
    }
    if (tableTypeFilter) {
      list = list.filter((r) => r.pattern_type === tableTypeFilter)
    }
    return list
  }, [data?.rawData, tableSearch, tableTypeFilter])

  const maxWordCount = Math.max(1, ...(data?.wordCloudThemes?.map((t) => t.count) ?? [1]))

  if (!data && !loading) {
    return (
      <div className="min-h-screen bg-[#0f1c33]" style={{ backgroundColor: NAVY }}>
        <div className="p-8 text-white">
          <p>Not authorized or failed to load. Redirecting…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: NAVY }}>
      <div className="max-w-7xl mx-auto p-6 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <h1 className="text-3xl font-bold text-white">Cross-User Analytics</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={triggerRefresh}
              disabled={refreshing || loading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-white transition opacity-90 hover:opacity-100 disabled:opacity-50"
              style={{ backgroundColor: CORAL }}
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh analysis
            </button>
            <button
              onClick={() => data?.rawData && exportToCsv(data.rawData)}
              disabled={!data?.rawData?.length}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-white transition opacity-90 hover:opacity-100 disabled:opacity-50"
              style={{ backgroundColor: EMERALD }}
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Date range */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <span className="text-gray-300 text-sm">Date range:</span>
          <div className="flex flex-wrap gap-2">
            {(['7d', '30d', 'custom'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setDateRange(r)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  dateRange === r
                    ? 'text-white'
                    : 'text-gray-400 hover:text-white bg-white/5 hover:bg-white/10'
                }`}
                style={dateRange === r ? { backgroundColor: CORAL } : {}}
              >
                {r === '7d' ? 'Last 7 days' : r === '30d' ? 'Last 30 days' : 'Custom'}
              </button>
            ))}
          </div>
          {dateRange === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-gray-400"
              />
              <span className="text-gray-400">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-gray-400"
              />
              <button
                onClick={loadData}
                disabled={!customStart || !customEnd}
                className="px-4 py-2 rounded-lg text-white disabled:opacity-50"
                style={{ backgroundColor: CORAL }}
              >
                Apply
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-gray-400 py-12">Loading…</div>
        ) : (
          <>
            {/* Key metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div
                className="rounded-xl p-6 shadow-lg border border-white/10"
                style={{ backgroundColor: 'rgba(21, 43, 80, 0.9)' }}
              >
                <p className="text-gray-400 text-sm mb-1">Active users (range)</p>
                <p className="text-3xl font-bold text-white">{data?.totalActiveUsers ?? 0}</p>
              </div>
              <div
                className="rounded-xl p-6 shadow-lg border border-white/10"
                style={{ backgroundColor: 'rgba(21, 43, 80, 0.9)' }}
              >
                <p className="text-gray-400 text-sm mb-1">Patterns detected</p>
                <p className="text-3xl font-bold text-white">{data?.totalPatternsDetected ?? 0}</p>
              </div>
              <div
                className="rounded-xl p-6 shadow-lg border border-white/10"
                style={{ backgroundColor: 'rgba(21, 43, 80, 0.9)' }}
              >
                <p className="text-gray-400 text-sm mb-1">Most common struggle</p>
                <p className="text-lg font-semibold text-white truncate" title={data?.mostCommonStruggle ?? '—'}>
                  {data?.mostCommonStruggle ?? '—'}
                </p>
              </div>
              <div
                className="rounded-xl p-6 shadow-lg border border-white/10"
                style={{ backgroundColor: 'rgba(21, 43, 80, 0.9)' }}
              >
                <p className="text-gray-400 text-sm mb-1">Most common win</p>
                <p className="text-lg font-semibold text-white truncate" title={data?.mostCommonWin ?? '—'}>
                  {data?.mostCommonWin ?? '—'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Top struggles */}
              <div
                className="rounded-xl p-6 shadow-lg border border-white/10"
                style={{ backgroundColor: 'rgba(21, 43, 80, 0.9)' }}
              >
                <h2 className="text-xl font-bold text-white mb-4">Top struggles</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={(data?.topStruggles ?? []).map((s) => ({ name: truncate(s.text, 25), count: s.count }))}
                    layout="vertical"
                    margin={{ left: 8, right: 24 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis type="number" stroke="#94a3b8" />
                    <YAxis type="category" dataKey="name" width={120} stroke="#94a3b8" tick={{ fontSize: 12 }} />
                    <Tooltip contentStyle={{ backgroundColor: NAVY, border: '1px solid rgba(255,255,255,0.2)' }} />
                    <Bar dataKey="count" fill={CORAL} radius={[0, 4, 4, 0]} name="Users" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Top wins */}
              <div
                className="rounded-xl p-6 shadow-lg border border-white/10"
                style={{ backgroundColor: 'rgba(21, 43, 80, 0.9)' }}
              >
                <h2 className="text-xl font-bold text-white mb-4">Top wins</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={(data?.topWins ?? []).map((w) => ({ name: truncate(w.text, 25), count: w.count }))}
                    layout="vertical"
                    margin={{ left: 8, right: 24 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis type="number" stroke="#94a3b8" />
                    <YAxis type="category" dataKey="name" width={120} stroke="#94a3b8" tick={{ fontSize: 12 }} />
                    <Tooltip contentStyle={{ backgroundColor: NAVY, border: '1px solid rgba(255,255,255,0.2)' }} />
                    <Bar dataKey="count" fill={EMERALD} radius={[0, 4, 4, 0]} name="Users" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Trend over time */}
            <div
              className="rounded-xl p-6 shadow-lg border border-white/10 mb-8"
              style={{ backgroundColor: 'rgba(21, 43, 80, 0.9)' }}
            >
              <h2 className="text-xl font-bold text-white mb-4">Trend over time</h2>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={data?.trendOverTime ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="date" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip contentStyle={{ backgroundColor: NAVY, border: '1px solid rgba(255,255,255,0.2)' }} />
                  <Legend />
                  <Line type="monotone" dataKey="struggles" stroke={CORAL} strokeWidth={2} name="Struggles" dot={{ fill: CORAL }} />
                  <Line type="monotone" dataKey="wins" stroke={EMERALD} strokeWidth={2} name="Wins" dot={{ fill: EMERALD }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Word cloud */}
            {data?.wordCloudThemes && data.wordCloudThemes.length > 0 && (
              <div
                className="rounded-xl p-6 shadow-lg border border-white/10 mb-8"
                style={{ backgroundColor: 'rgba(21, 43, 80, 0.9)' }}
              >
                <h2 className="text-xl font-bold text-white mb-4">Theme cloud</h2>
                <div className="flex flex-wrap gap-3 justify-center items-baseline">
                  {data.wordCloudThemes.slice(0, 40).map((t, i) => {
                    const ratio = maxWordCount > 0 ? t.count / maxWordCount : 0
                    const size = Math.max(12, Math.min(28, 12 + ratio * 16))
                    return (
                      <span
                        key={`${t.text}-${i}`}
                        className="text-white/90 hover:text-white transition cursor-default"
                        style={{ fontSize: size }}
                        title={`${t.count} mention(s)`}
                      >
                        {t.text}
                      </span>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Correlation insights */}
            <div
              className="rounded-xl p-6 shadow-lg border border-white/10 mb-8"
              style={{ backgroundColor: 'rgba(21, 43, 80, 0.9)' }}
            >
              <h2 className="text-xl font-bold text-white mb-4">Correlation insights</h2>
              <ul className="space-y-2">
                {(data?.correlationInsights ?? []).map((insight, i) => (
                  <li key={i} className="text-gray-200 flex items-start gap-2">
                    <span style={{ color: EMERALD }}>•</span>
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Raw data table */}
            <div
              className="rounded-xl p-6 shadow-lg border border-white/10 mb-8"
              style={{ backgroundColor: 'rgba(21, 43, 80, 0.9)' }}
            >
              <h2 className="text-xl font-bold text-white mb-4">Raw patterns</h2>
              <div className="flex flex-wrap gap-3 mb-4">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search pattern, type, user, date…"
                    value={tableSearch}
                    onChange={(e) => setTableSearch(e.target.value)}
                    className="w-full rounded-lg border border-white/20 bg-white/10 pl-9 pr-3 py-2 text-white placeholder-gray-400"
                  />
                </div>
                <select
                  value={tableTypeFilter}
                  onChange={(e) => setTableTypeFilter(e.target.value)}
                  className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white"
                >
                  <option value="">All types</option>
                  <option value="struggle">Struggle</option>
                  <option value="win">Win</option>
                  <option value="theme">Theme</option>
                  <option value="pain_point">Pain point</option>
                  <option value="goal">Goal</option>
                </select>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/20 text-gray-400 text-sm">
                      <th className="pb-2 pr-4">Pattern</th>
                      <th className="pb-2 pr-4">Type</th>
                      <th className="pb-2 pr-4">User (anon)</th>
                      <th className="pb-2">Date</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-200">
                    {filteredRawData.slice(0, 200).map((r, i) => (
                      <tr key={i} className="border-b border-white/10">
                        <td className="py-2 pr-4 max-w-xs truncate" title={r.pattern_text}>
                          {r.pattern_text}
                        </td>
                        <td className="py-2 pr-4">{r.pattern_type}</td>
                        <td className="py-2 pr-4 font-mono text-sm">{r.user_id_anon}</td>
                        <td className="py-2">{r.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredRawData.length > 200 && (
                <p className="text-gray-400 text-sm mt-2">Showing first 200 of {filteredRawData.length} rows. Export CSV for full data.</p>
              )}
              {filteredRawData.length === 0 && (
                <p className="text-gray-400 py-4">No patterns match filters.</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
