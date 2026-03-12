'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, AlertTriangle, Wrench, Users, TrendingDown } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

type FunnelStage = {
  stage: string
  count: number
  dropOff: number
  pctRemaining: number
}

type DroppedUser = {
  id: string
  email: string | null
  timeOnPage: number | null
  interactions: string
  lastActive: string | null
}

type StageInsight = {
  fromStage: string
  toStage: string
  fromCount: number
  toCount: number
  dropOff: number
  dropPct: number
  whatHappened: string
  problem: string
  solution: string[]
  affectedUsers: Array<{ id: string; email: string | null }>
  droppedUsers?: DroppedUser[]
  patternSummary?: string | null
}

type UserStage = {
  id: string
  email: string | null
  currentStage: string
  lastActive: string | null
  daysSince: number | null
}

export default function JourneyFunnelPage() {
  const [funnel, setFunnel] = useState<FunnelStage[]>([])
  const [stageInsights, setStageInsights] = useState<StageInsight[]>([])
  const [users, setUsers] = useState<UserStage[]>([])
  const [totalSignUps, setTotalSignUps] = useState(0)
  const [biggestDrop, setBiggestDrop] = useState<{ stage: string; count: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(90)
  const [error, setError] = useState<string | null>(null)
  const [debugEmail, setDebugEmail] = useState('')
  const [userJourney, setUserJourney] = useState<Record<string, unknown> | null>(null)
  const [debugLoading, setDebugLoading] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/admin/journey-funnel?days=${days}`, { credentials: 'include' })
        if (res.ok) {
          const data = await res.json()
          setFunnel(data.funnel ?? [])
          setStageInsights(data.stageInsights ?? [])
          setUsers(data.users ?? [])
          setTotalSignUps(data.totalSignUps ?? 0)
          setBiggestDrop(data.biggestDrop ?? null)
        } else if (res.status === 403) {
          setError('Journey funnel is only available in development.')
        } else {
          setError('Failed to load funnel data.')
        }
      } catch {
        setFunnel([])
        setUsers([])
        setError('Failed to load funnel data.')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [days])

  const validateUser = async () => {
    if (!debugEmail.trim()) return
    setDebugLoading(true)
    setUserJourney(null)
    try {
      const res = await fetch(`/api/admin/journey-funnel?days=${days}&userEmail=${encodeURIComponent(debugEmail.trim())}`, { credentials: 'include' })
      const data = await res.json()
      setUserJourney(data.userJourney ?? { error: 'No userJourney in response' })
    } catch {
      setUserJourney({ error: 'Request failed' })
    } finally {
      setDebugLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-5xl mx-auto p-6 space-y-8">
        <div className="flex items-center justify-between">
          <Link
            href="/admin"
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-[#ef725c]"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Admin
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <input
                type="email"
                placeholder="Validate user (e.g. sniclam@gmail.com)"
                value={debugEmail}
                onChange={(e) => setDebugEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && validateUser()}
                className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-64"
              />
              <button
                type="button"
                onClick={validateUser}
                disabled={debugLoading || !debugEmail.trim()}
                className="text-sm px-3 py-1.5 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
              >
                {debugLoading ? 'Loading…' : 'Validate'}
              </button>
            </div>
            <select
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value, 10))}
              className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value={30}>Last 30 days</option>
              <option value={60}>Last 60 days</option>
              <option value={90}>Last 90 days</option>
            </select>
          </div>
        </div>

        {userJourney && (
          <section className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
              <h2 className="font-semibold text-gray-900 dark:text-white">
                User journey: {String(userJourney.email ?? userJourney.error ?? 'Unknown')}
              </h2>
            </div>
            <div className="p-6 overflow-x-auto">
              <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {JSON.stringify(userJourney, null, 2)}
              </pre>
            </div>
          </section>
        )}

        <section>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            User Funnel Analysis
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Complete journey from sign-up through return. Excludes admin users. See{' '}
            <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">docs/FUNNEL_CALCULATION.md</code>{' '}
            for how each stage is calculated.
          </p>
        </section>

        {error && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3 text-amber-800 dark:text-amber-200">
            {error}
          </div>
        )}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ef725c]" />
          </div>
        ) : !error ? (
          <>
            {/* Funnel table */}
            <section className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="font-semibold text-gray-900 dark:text-white">
                  TOTAL SIGN-UPS: {totalSignUps}
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-700/50">
                      <th className="text-left px-6 py-3 text-gray-700 dark:text-gray-300 font-medium">
                        STAGE
                      </th>
                      <th className="text-right px-6 py-3 text-gray-700 dark:text-gray-300 font-medium">
                        COUNT
                      </th>
                      <th className="text-right px-6 py-3 text-gray-700 dark:text-gray-300 font-medium">
                        DROP-OFF
                      </th>
                      <th className="text-right px-6 py-3 text-gray-700 dark:text-gray-300 font-medium">
                        % REMAINING
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {funnel.map((row, i) => (
                      <tr
                        key={i}
                        className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                      >
                        <td className="px-6 py-3 text-gray-900 dark:text-white">
                          {row.stage}
                        </td>
                        <td className="px-6 py-3 text-right font-medium">
                          {row.count}
                        </td>
                        <td className="px-6 py-3 text-right">
                          {row.dropOff > 0 ? (
                            <span className="text-amber-600 dark:text-amber-400">
                              −{row.dropOff}
                            </span>
                          ) : (
                            '0'
                          )}
                        </td>
                        <td className="px-6 py-3 text-right text-gray-600 dark:text-gray-400">
                          {row.pctRemaining}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {biggestDrop && biggestDrop.count > 0 && (
                <div className="px-6 py-4 bg-amber-50 dark:bg-amber-900/20 border-t border-amber-200 dark:border-amber-800/50 flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  <span className="font-medium text-amber-800 dark:text-amber-200">
                    BIGGEST DROP: {biggestDrop.stage} ({biggestDrop.count} users)
                  </span>
                </div>
              )}
            </section>

            {/* Actionable insights */}
            {stageInsights.length > 0 && (
              <section className="space-y-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  What to Fix
                </h2>
                {stageInsights.map((insight, idx) => (
                  <div
                    key={idx}
                    className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden border border-gray-200 dark:border-gray-700"
                  >
                    <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {insight.fromStage} → {insight.toStage}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                        {insight.dropOff} users dropped ({insight.dropPct}%)
                      </p>
                    </div>
                    <div className="px-6 py-4 space-y-4">
                      <div className="flex gap-3">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            What happened
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {insight.whatHappened}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Problem
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {insight.problem}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <Wrench className="w-5 h-5 text-[#ef725c] shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Solution
                          </p>
                          <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
                            {insight.solution.map((s, i) => (
                              <li key={i}>{s}</li>
                            ))}
                          </ol>
                        </div>
                      </div>
                      {insight.patternSummary && (
                        <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-3">
                          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                            Pattern
                          </p>
                          <p className="text-sm text-amber-700 dark:text-amber-300">
                            {insight.patternSummary}
                          </p>
                        </div>
                      )}
                      {(insight.droppedUsers?.length ?? 0) > 0 || insight.affectedUsers.length > 0 ? (
                        <div>
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Dropped users
                          </p>
                          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-600">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="bg-gray-50 dark:bg-gray-700/50">
                                  <th className="text-left px-4 py-2 text-gray-700 dark:text-gray-300 font-medium">
                                    Email
                                  </th>
                                  <th className="text-left px-4 py-2 text-gray-700 dark:text-gray-300 font-medium">
                                    Time on page
                                  </th>
                                  <th className="text-left px-4 py-2 text-gray-700 dark:text-gray-300 font-medium">
                                    Interactions
                                  </th>
                                  <th className="text-left px-4 py-2 text-gray-700 dark:text-gray-300 font-medium">
                                    Last active
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {(insight.droppedUsers?.length ?? 0) > 0
                                  ? insight.droppedUsers!.map((u) => (
                                      <tr
                                        key={u.id}
                                        className="border-t border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                                      >
                                        <td className="px-4 py-2">
                                          <Link
                                            href={`/admin/list/users/${u.id}`}
                                            className="text-[#ef725c] hover:underline font-medium"
                                          >
                                            {u.email || u.id.slice(0, 8) + '…'}
                                          </Link>
                                        </td>
                                        <td className="px-4 py-2 text-gray-600 dark:text-gray-400">
                                          {u.timeOnPage != null
                                            ? `${u.timeOnPage} sec`
                                            : '—'}
                                        </td>
                                        <td className="px-4 py-2 text-gray-600 dark:text-gray-400">
                                          {u.interactions}
                                        </td>
                                        <td className="px-4 py-2 text-gray-600 dark:text-gray-400">
                                          {u.lastActive
                                            ? formatDistanceToNow(new Date(u.lastActive), { addSuffix: true })
                                            : '—'}
                                        </td>
                                      </tr>
                                    ))
                                  : insight.affectedUsers.map((u) => (
                                      <tr
                                        key={u.id}
                                        className="border-t border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                                      >
                                        <td className="px-4 py-2">
                                          <Link
                                            href={`/admin/list/users/${u.id}`}
                                            className="text-[#ef725c] hover:underline font-medium"
                                          >
                                            {u.email || u.id.slice(0, 8) + '…'}
                                          </Link>
                                        </td>
                                        <td className="px-4 py-2 text-gray-600 dark:text-gray-400">—</td>
                                        <td className="px-4 py-2 text-gray-600 dark:text-gray-400">—</td>
                                        <td className="px-4 py-2 text-gray-600 dark:text-gray-400">—</td>
                                      </tr>
                                    ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </section>
            )}

            {/* User breakdown */}
            <section className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  User-by-User Breakdown
                </h2>
              </div>
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-gray-50 dark:bg-gray-700/50">
                    <tr>
                      <th className="text-left px-6 py-3 text-gray-700 dark:text-gray-300 font-medium">
                        Email
                      </th>
                      <th className="text-left px-6 py-3 text-gray-700 dark:text-gray-300 font-medium">
                        Current Stage
                      </th>
                      <th className="text-left px-6 py-3 text-gray-700 dark:text-gray-300 font-medium">
                        Last Active
                      </th>
                      <th className="text-right px-6 py-3 text-gray-700 dark:text-gray-300 font-medium">
                        Days Since
                      </th>
                      <th className="text-left px-6 py-3 text-gray-700 dark:text-gray-300 font-medium">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr
                        key={u.id}
                        className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                      >
                        <td className="px-6 py-3 text-gray-900 dark:text-white font-medium">
                          {u.email ?? u.id.slice(0, 8) + '…'}
                        </td>
                        <td className="px-6 py-3 text-gray-700 dark:text-gray-300">
                          {u.currentStage}
                        </td>
                        <td className="px-6 py-3 text-gray-600 dark:text-gray-400">
                          {u.lastActive
                            ? formatDistanceToNow(new Date(u.lastActive), { addSuffix: true })
                            : '—'}
                        </td>
                        <td className="px-6 py-3 text-right">
                          {u.daysSince != null ? (
                            <span
                              className={
                                u.daysSince > 7
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-gray-600 dark:text-gray-400'
                              }
                            >
                              {u.daysSince} days
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-6 py-3">
                          <Link
                            href={`/admin/list/users/${u.id}`}
                            className="text-[#ef725c] hover:underline text-sm"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </div>
  )
}
