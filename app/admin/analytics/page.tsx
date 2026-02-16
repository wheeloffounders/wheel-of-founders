'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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
  PieChart,
  Pie,
  Cell,
  FunnelChart,
  Funnel,
  LabelList,
} from 'recharts'
import {
  LayoutDashboard,
  Filter,
  TrendingUp,
  Map,
  Zap,
  FlaskConical,
  Download,
  Users,
  Activity,
} from 'lucide-react'

const COLORS = ['#ef725c', '#152b50', '#10b981', '#f59e0b', '#6b7280']
const NAVY = '#152b50'
const CORAL = '#ef725c'
const EMERALD = '#10b981'

function MetricCard({
  title,
  value,
  change,
  icon: Icon,
}: {
  title: string
  value: string | number
  change?: number
  icon?: React.ComponentType<{ className?: string }>
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-l-4 border-[#152b50]">
      {Icon && <Icon className="w-8 h-8 text-[#152b50] dark:text-[#ef725c] mb-2" />}
      <h3 className="text-sm text-gray-600 dark:text-gray-400 mb-1">{title}</h3>
      <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
      {change !== undefined && (
        <div className={`text-sm mt-1 ${change >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
          {change >= 0 ? '↑' : '↓'} {Math.abs(change).toFixed(1)}%
        </div>
      )}
    </div>
  )
}

function ChartCard({
  title,
  children,
  exportable,
}: {
  title: string
  children: React.ReactNode
  exportable?: boolean
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h2>
        {exportable && (
          <button
            type="button"
            className="flex items-center gap-1 text-sm text-[#152b50] hover:text-[#ef725c] transition"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        )}
      </div>
      {children}
    </div>
  )
}

function calcChange(stats: { [key: string]: unknown }[], field: string): number {
  if (!stats || stats.length < 2) return 0
  const curr = typeof stats[0]?.[field] === 'number' ? stats[0]![field] : 0
  const prev = typeof stats[1]?.[field] === 'number' ? stats[1]![field] : 0
  if (prev === 0) return 0
  return (((curr as number) - (prev as number)) / (prev as number)) * 100
}

type TabId = 'overview' | 'funnels' | 'retention' | 'journeys' | 'realtime' | 'experiments'

const TABS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'funnels', label: 'Funnels', icon: Filter },
  { id: 'retention', label: 'Retention', icon: TrendingUp },
  { id: 'journeys', label: 'Journeys', icon: Map },
  { id: 'realtime', label: 'Real-time', icon: Zap },
  { id: 'experiments', label: 'Experiments', icon: FlaskConical },
]

export default function AdminAnalyticsPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [stats, setStats] = useState<{
    dailyStats: Record<string, unknown>[]
    topPatterns: Array<{ pattern_text: string; pattern_type: string; frequency: number }>
  } | null>(null)
  const [funnelSteps, setFunnelSteps] = useState<Array<{
    step_name: string
    step_number: number
    users: number
    completion_rate: number
    step_conversion: number | null
  }>>([])
  const [cohorts, setCohorts] = useState<Array<{
    cohort_week: string
    cohort_size: number
    week_0: number
    week_1: number
    week_2: number
    week_3: number
    week_4: number
  }>>([])
  const [journeys, setJourneys] = useState<{
    paths: Record<string, number>
    drops: Record<string, number>
    completedFlow: number
    totalSessions: number
  } | null>(null)
  const [realtime, setRealtime] = useState<{
    liveUsers: number
    recentActivity: Array<{ userId: string; feature: string; action: string; page?: string; at: string }>
    todayStats: Record<string, unknown> | null
  } | null>(null)
  const [experiments, setExperiments] = useState<Array<{
    id: string
    name: string
    status: string
    variants: string[]
    assignments: Record<string, number>
    events: Record<string, Record<string, number>>
  }>>([])
  const [timeframe, setTimeframe] = useState('7d')
  const [loading, setLoading] = useState(true)
  const [funnelName, setFunnelName] = useState('daily_flow')

  useEffect(() => {
    const init = async () => {
      const session = await getUserSession()
      if (!session?.user?.is_admin) {
        router.push('/')
        return
      }
      loadAll()
    }
    init()
  }, [router])

  useEffect(() => {
    if (activeTab === 'overview' || activeTab === 'funnels') loadOverview()
    if (activeTab === 'retention') loadRetention()
    if (activeTab === 'journeys') loadJourneys()
    if (activeTab === 'realtime') loadRealtime()
    if (activeTab === 'experiments') loadExperiments()
  }, [activeTab, timeframe, funnelName])

  const loadAll = () => {
    loadOverview()
    loadRetention()
    loadJourneys()
    loadRealtime()
    loadExperiments()
  }

  const loadOverview = async () => {
    setLoading(true)
    try {
      const [analyticsRes, funnelsRes] = await Promise.all([
        fetch(`/api/admin/analytics?timeframe=${timeframe}`),
        fetch(`/api/admin/funnels?funnel=${funnelName}&days=${timeframe === '7d' ? 7 : 30}`),
      ])
      const analyticsData = analyticsRes.ok ? await analyticsRes.json() : { dailyStats: [], topPatterns: [] }
      const funnelsData = funnelsRes.ok ? await funnelsRes.json() : { steps: [] }
      setStats({ dailyStats: analyticsData.dailyStats ?? [], topPatterns: analyticsData.topPatterns ?? [] })
      setFunnelSteps(funnelsData.steps ?? [])
    } catch {
      setStats({ dailyStats: [], topPatterns: [] })
      setFunnelSteps([])
    } finally {
      setLoading(false)
    }
  }

  const loadRetention = async () => {
    try {
      const res = await fetch('/api/admin/cohorts')
      const data = res.ok ? await res.json() : { cohorts: [] }
      setCohorts(data.cohorts ?? [])
    } catch {
      setCohorts([])
    }
  }

  const loadJourneys = async () => {
    try {
      const res = await fetch(`/api/admin/journeys?days=${timeframe === '7d' ? 7 : 30}`)
      const data = res.ok ? await res.json() : { paths: {}, drops: {}, completedFlow: 0, totalSessions: 0 }
      setJourneys(data)
    } catch {
      setJourneys(null)
    }
  }

  const loadRealtime = async () => {
    try {
      const res = await fetch('/api/admin/realtime')
      const data = res.ok ? await res.json() : { liveUsers: 0, recentActivity: [], todayStats: null }
      setRealtime({
        liveUsers: data.liveUsers ?? 0,
        recentActivity: data.recentActivity ?? [],
        todayStats: data.todayStats ?? null,
      })
    } catch {
      setRealtime(null)
    }
  }

  const loadExperiments = async () => {
    try {
      const res = await fetch('/api/admin/experiments')
      const data = res.ok ? await res.json() : { experiments: [] }
      setExperiments(data.experiments ?? [])
    } catch {
      setExperiments([])
    }
  }

  const dailyStats = stats?.dailyStats ?? []
  const topPatterns = stats?.topPatterns ?? []
  const struggles = topPatterns.filter((p) => p.pattern_type === 'struggle')
  const wins = topPatterns.filter((p) => p.pattern_type === 'win')
  const pieData = Object.entries(
    topPatterns.reduce<Record<string, number>>((acc, p) => {
      acc[p.pattern_type] = (acc[p.pattern_type] ?? 0) + p.frequency
      return acc
    }, {})
  ).map(([name, value]) => ({ name, value }))

  const funnelChartData = funnelSteps.map((s) => ({
    name: s.step_name,
    value: s.users,
    fill: COLORS[s.step_number % COLORS.length],
  }))

  const journeyPaths = journeys
    ? Object.entries(journeys.paths)
        .map(([path, count]) => ({ path, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 15)
    : []

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-[#152b50] text-white px-6 py-6 shadow-lg">
        <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
        <p className="text-gray-300 text-sm mt-1">
          Funnels, retention, journeys, real-time metrics & experiments
        </p>

        <div className="flex flex-wrap items-center gap-4 mt-6">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
                activeTab === tab.id
                  ? 'bg-[#ef725c] text-white'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setTimeframe('7d')}
            className={`px-3 py-1.5 rounded text-sm ${timeframe === '7d' ? 'bg-[#ef725c]' : 'bg-white/10 hover:bg-white/20'}`}
          >
            7 Days
          </button>
          <button
            onClick={() => setTimeframe('30d')}
            className={`px-3 py-1.5 rounded text-sm ${timeframe === '30d' ? 'bg-[#ef725c]' : 'bg-white/10 hover:bg-white/20'}`}
          >
            30 Days
          </button>
          {activeTab === 'funnels' && (
            <select
              value={funnelName}
              onChange={(e) => setFunnelName(e.target.value)}
              className="ml-2 px-3 py-1.5 rounded text-sm bg-white/10 border border-white/20 text-white"
            >
              <option value="daily_flow">Daily Flow</option>
              <option value="morning_flow">Morning Flow</option>
              <option value="evening_flow">Evening Flow</option>
              <option value="onboarding">Onboarding</option>
            </select>
          )}
        </div>
      </div>

      <div className="p-6">
        {loading && activeTab === 'overview' ? (
          <p className="text-gray-500">Loading...</p>
        ) : (
          <>
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {dailyStats.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <MetricCard
                      title="Active Users"
                      value={typeof dailyStats[0]?.active_users === 'number' ? dailyStats[0].active_users : 0}
                      change={calcChange(dailyStats, 'active_users')}
                      icon={Users}
                    />
                    <MetricCard
                      title="Morning Plan Rate"
                      value={`${Math.round((typeof dailyStats[0]?.morning_plan_rate === 'number' ? dailyStats[0].morning_plan_rate : 0) * 100)}%`}
                      change={calcChange(dailyStats, 'morning_plan_rate')}
                    />
                    <MetricCard
                      title="Evening Review Rate"
                      value={`${Math.round((typeof dailyStats[0]?.evening_review_rate === 'number' ? dailyStats[0].evening_review_rate : 0) * 100)}%`}
                      change={calcChange(dailyStats, 'evening_review_rate')}
                    />
                    <MetricCard
                      title="Needle Mover Usage"
                      value={`${Math.round((typeof dailyStats[0]?.needle_mover_usage_rate === 'number' ? dailyStats[0].needle_mover_usage_rate : 0) * 100)}%`}
                      change={calcChange(dailyStats, 'needle_mover_usage_rate')}
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <ChartCard title="Active Users Over Time" exportable>
                    <ResponsiveContainer width="100%" height={280}>
                      <LineChart data={dailyStats}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="date" stroke="#94a3b8" />
                        <YAxis stroke="#94a3b8" />
                        <Tooltip
                          contentStyle={{ backgroundColor: NAVY, color: '#fff', border: 'none' }}
                        />
                        <Line type="monotone" dataKey="active_users" stroke={CORAL} name="Active Users" />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartCard>

                  <ChartCard title="Engagement Rates" exportable>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={dailyStats}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="date" stroke="#94a3b8" />
                        <YAxis stroke="#94a3b8" />
                        <Tooltip
                          contentStyle={{ backgroundColor: NAVY, color: '#fff', border: 'none' }}
                        />
                        <Bar dataKey="morning_plan_rate" fill={NAVY} name="Morning" />
                        <Bar dataKey="evening_review_rate" fill={CORAL} name="Evening" />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                    <h2 className="text-xl font-bold mb-4 dark:text-white">Top Struggles</h2>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {struggles.slice(0, 10).map((p, i) => (
                        <div key={i} className="flex justify-between items-center">
                          <span className="text-gray-800 dark:text-gray-200 text-sm truncate flex-1 mr-2">
                            &quot;{p.pattern_text}&quot;
                          </span>
                          <span className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 px-3 py-1 rounded-full text-sm shrink-0">
                            {p.frequency}
                          </span>
                        </div>
                      ))}
                      {struggles.length === 0 && (
                        <p className="text-gray-500">No struggles recorded yet.</p>
                      )}
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                    <h2 className="text-xl font-bold mb-4 dark:text-white">Top Wins</h2>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {wins.slice(0, 10).map((p, i) => (
                        <div key={i} className="flex justify-between items-center">
                          <span className="text-gray-800 dark:text-gray-200 text-sm truncate flex-1 mr-2">
                            &quot;{p.pattern_text}&quot;
                          </span>
                          <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 px-3 py-1 rounded-full text-sm shrink-0">
                            {p.frequency}
                          </span>
                        </div>
                      ))}
                      {wins.length === 0 && <p className="text-gray-500">No wins recorded yet.</p>}
                    </div>
                  </div>
                </div>

                {pieData.length > 0 && (
                  <ChartCard title="Pattern Distribution" exportable>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) =>
                            `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                          }
                          outerRadius={100}
                          dataKey="value"
                        >
                          {pieData.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ backgroundColor: NAVY, color: '#fff', border: 'none' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartCard>
                )}

                {dailyStats.length === 0 && topPatterns.length === 0 && (
                  <p className="text-gray-500">
                    No analytics data yet. Run the daily cron job to populate stats.
                  </p>
                )}
              </div>
            )}

            {/* Funnels Tab */}
            {activeTab === 'funnels' && (
              <div className="space-y-6">
                <ChartCard title={`Funnel: ${funnelName}`} exportable>
                  {funnelChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={400}>
                      <FunnelChart>
                        <Funnel dataKey="value" data={funnelChartData} isAnimationActive>
                          <LabelList
                            position="right"
                            fill="#000"
                            stroke="none"
                            dataKey="name"
                            formatter={(v: string, entry: { value: number }) =>
                              `${v}: ${entry.value} users`
                            }
                          />
                        </Funnel>
                      </FunnelChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-gray-500 py-12">
                      No funnel events yet. Funnel steps are recorded when users complete actions.
                    </p>
                  )}
                </ChartCard>
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-100 dark:bg-gray-700">
                        <th className="px-4 py-3 text-left font-semibold">Step</th>
                        <th className="px-4 py-3 text-left font-semibold">Users</th>
                        <th className="px-4 py-3 text-left font-semibold">Completion Rate</th>
                        <th className="px-4 py-3 text-left font-semibold">Step Conversion</th>
                      </tr>
                    </thead>
                    <tbody>
                      {funnelSteps.map((s, i) => (
                        <tr key={i} className="border-t dark:border-gray-600">
                          <td className="px-4 py-3">{s.step_name}</td>
                          <td className="px-4 py-3">{s.users}</td>
                          <td className="px-4 py-3">{s.completion_rate}%</td>
                          <td className="px-4 py-3">
                            {s.step_conversion != null ? `${s.step_conversion}%` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Retention Tab */}
            {activeTab === 'retention' && (
              <div className="space-y-6">
                <ChartCard title="Cohort Retention (Week 0–4)" exportable>
                  {cohorts.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b dark:border-gray-600">
                            <th className="px-4 py-3 text-left font-semibold">Cohort Week</th>
                            <th className="px-4 py-3 text-right font-semibold">Size</th>
                            <th className="px-4 py-3 text-right font-semibold">W0</th>
                            <th className="px-4 py-3 text-right font-semibold">W1</th>
                            <th className="px-4 py-3 text-right font-semibold">W2</th>
                            <th className="px-4 py-3 text-right font-semibold">W3</th>
                            <th className="px-4 py-3 text-right font-semibold">W4</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cohorts.map((c, i) => (
                            <tr key={i} className="border-b dark:border-gray-700">
                              <td className="px-4 py-3">{c.cohort_week}</td>
                              <td className="px-4 py-3 text-right">{c.cohort_size}</td>
                              <td className="px-4 py-3 text-right">
                                {c.cohort_size > 0
                                  ? Math.round((100 * (c.week_0 ?? 0)) / c.cohort_size)
                                  : 0}
                                %
                              </td>
                              <td className="px-4 py-3 text-right">
                                {c.cohort_size > 0
                                  ? Math.round((100 * (c.week_1 ?? 0)) / c.cohort_size)
                                  : 0}
                                %
                              </td>
                              <td className="px-4 py-3 text-right">
                                {c.cohort_size > 0
                                  ? Math.round((100 * (c.week_2 ?? 0)) / c.cohort_size)
                                  : 0}
                                %
                              </td>
                              <td className="px-4 py-3 text-right">
                                {c.cohort_size > 0
                                  ? Math.round((100 * (c.week_3 ?? 0)) / c.cohort_size)
                                  : 0}
                                %
                              </td>
                              <td className="px-4 py-3 text-right">
                                {c.cohort_size > 0
                                  ? Math.round((100 * (c.week_4 ?? 0)) / c.cohort_size)
                                  : 0}
                                %
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-gray-500 py-12">
                      No cohort data. Refresh the cohort_retention materialized view.
                    </p>
                  )}
                </ChartCard>
              </div>
            )}

            {/* Journeys Tab */}
            {activeTab === 'journeys' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <MetricCard
                    title="Total Sessions"
                    value={journeys?.totalSessions ?? 0}
                    icon={Activity}
                  />
                  <MetricCard
                    title="Completed Flow"
                    value={
                      journeys
                        ? `${journeys.totalSessions > 0 ? Math.round((100 * journeys.completedFlow) / journeys.totalSessions) : 0}%`
                        : '0%'
                    }
                  />
                </div>
                <ChartCard title="Common Page Paths" exportable>
                  {journeyPaths.length > 0 ? (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {journeyPaths.map(({ path, count }, i) => (
                        <div
                          key={i}
                          className="flex justify-between items-center py-2 border-b dark:border-gray-700 last:border-0"
                        >
                          <span className="font-mono text-sm text-gray-800 dark:text-gray-200 truncate flex-1 mr-4">
                            {path}
                          </span>
                          <span className="text-[#152b50] dark:text-[#ef725c] font-semibold shrink-0">
                            {count}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 py-12">
                      No journey data. Page views are recorded when users navigate.
                    </p>
                  )}
                </ChartCard>
                {journeys && Object.keys(journeys.drops ?? {}).length > 0 && (
                  <ChartCard title="Drop-off Points">
                    <div className="space-y-2">
                      {Object.entries(journeys.drops)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 10)
                        .map(([path, count]) => (
                          <div
                            key={path}
                            className="flex justify-between items-center py-2"
                          >
                            <span className="font-mono text-sm">{path}</span>
                            <span className="text-red-600 font-semibold">{count}</span>
                          </div>
                        ))}
                    </div>
                  </ChartCard>
                )}
              </div>
            )}

            {/* Real-time Tab */}
            {activeTab === 'realtime' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <MetricCard
                    title="Live Users (last 5 min)"
                    value={realtime?.liveUsers ?? 0}
                    icon={Zap}
                  />
                  <MetricCard
                    title="Today Active"
                    value={
                      typeof realtime?.todayStats?.active_users === 'number'
                        ? realtime.todayStats.active_users
                        : '—'
                    }
                  />
                  <MetricCard
                    title="Today New Users"
                    value={
                      typeof realtime?.todayStats?.new_users === 'number'
                        ? realtime.todayStats.new_users
                        : '—'
                    }
                  />
                </div>
                <ChartCard title="Recent Activity">
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {(realtime?.recentActivity ?? []).map((a, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-4 py-2 border-b dark:border-gray-700 text-sm"
                      >
                        <span className="text-gray-500 dark:text-gray-400 shrink-0">
                          {a.at ? new Date(a.at).toLocaleTimeString() : '—'}
                        </span>
                        <span className="font-medium">{a.feature}</span>
                        <span className="text-gray-600 dark:text-gray-300">{a.action}</span>
                        {a.page && (
                          <span className="font-mono text-gray-500">{a.page}</span>
                        )}
                      </div>
                    ))}
                    {(realtime?.recentActivity ?? []).length === 0 && (
                      <p className="text-gray-500 py-8">No recent activity.</p>
                    )}
                  </div>
                </ChartCard>
              </div>
            )}

            {/* Experiments Tab */}
            {activeTab === 'experiments' && (
              <div className="space-y-6">
                <ChartCard title="A/B Experiments" exportable>
                  {experiments.length > 0 ? (
                    <div className="space-y-6">
                      {experiments.map((exp) => (
                        <div
                          key={exp.id}
                          className="p-4 rounded-lg border dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold text-lg">{exp.name}</h3>
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                exp.status === 'running'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200'
                                  : exp.status === 'completed'
                                    ? 'bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200'
                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200'
                              }`}
                            >
                              {exp.status}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            {exp.variants.map((v) => (
                              <div key={v} className="p-2 rounded bg-white dark:bg-gray-800">
                                <div className="font-medium text-[#152b50] dark:text-[#ef725c]">
                                  {v}
                                </div>
                                <div className="text-gray-600 dark:text-gray-300">
                                  Assigned: {exp.assignments[v] ?? 0}
                                </div>
                                {exp.events[v] && (
                                  <div className="mt-1 text-xs">
                                    {Object.entries(exp.events[v]).map(([ev, n]) => (
                                      <div key={ev}>
                                        {ev}: {n}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 py-12">
                      No experiments yet. Create experiments and assign variants to users.
                    </p>
                  )}
                </ChartCard>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
