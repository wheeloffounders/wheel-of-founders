'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar, BarChart3, MessageSquare, Code } from 'lucide-react'
import { UserSummaryHeader } from '@/components/admin/UserSummaryHeader'
import { UserTimeline } from '@/components/admin/UserTimeline'
import { PatternCards } from '@/components/admin/PatternCards'
import { FeedbackSummary } from '@/components/admin/FeedbackSummary'

const TABS = [
  { id: 'timeline', label: 'Timeline', icon: Calendar },
  { id: 'raw', label: 'Raw Data', icon: Code },
  { id: 'patterns', label: 'Patterns', icon: BarChart3 },
  { id: 'feedback', label: 'Feedback', icon: MessageSquare },
] as const

type TabId = (typeof TABS)[number]['id']

export default function ListBackendUserPage() {
  const params = useParams()
  const userId = params?.userId as string
  const [activeTab, setActiveTab] = useState<TabId>('timeline')
  const [data, setData] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    const fetchHistory = async () => {
      try {
        const res = await fetch(`/api/admin/list/users/${userId}/history`, { credentials: 'include' })
        if (res.ok) {
          const json = await res.json()
          setData(json)
        } else {
          setData(null)
        }
      } catch {
        setData(null)
      } finally {
        setLoading(false)
      }
    }
    fetchHistory()
  }, [userId])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ef725c]" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-700 dark:text-gray-300 mb-4">Failed to load user history</p>
          <Link href="/admin/list" className="text-[#ef725c] hover:underline">
            ← Back to List
          </Link>
        </div>
      </div>
    )
  }

  const profile = data.profile as Record<string, unknown> | null
  const auth = data.auth as Record<string, unknown> | null

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/list"
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-[#ef725c]"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to List
          </Link>
        </div>

        <UserSummaryHeader
          profile={profile as any}
          auth={auth as any}
          userId={userId}
        />

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                activeTab === id
                  ? 'bg-[#ef725c] text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 overflow-x-auto">
          {activeTab === 'timeline' && (
            <UserTimeline days={(data.days as Record<string, any>) ?? {}} />
          )}
          {activeTab === 'raw' && (
            <RawDataTab data={data} />
          )}
          {activeTab === 'patterns' && (
            <PatternCards
              patterns={(data.patterns as any) ?? { postponementStats: { total: 0, byActionPlan: {} }, needleMoverPostponeRate: 0 }}
              userPatterns={(data.userPatterns as any[]) ?? []}
            />
          )}
          {activeTab === 'feedback' && (
            <FeedbackSummary
              insightFeedback={(data.insightFeedback as any[]) ?? []}
              feedback={(data.feedback as any[]) ?? []}
            />
          )}
        </div>
      </div>
    </div>
  )
}

const RAW_SECTIONS: { key: string; label: string }[] = [
  { key: 'profile', label: 'Profile (user_profiles)' },
  { key: 'auth', label: 'Auth (auth.users)' },
  { key: 'days', label: 'Days (chronological daily structure)' },
  { key: 'weeklyInsights', label: 'Weekly Insights' },
  { key: 'monthlyInsights', label: 'Monthly Insights' },
  { key: 'quarterlyInsights', label: 'Quarterly Insights' },
  { key: 'patterns', label: 'Patterns (aggregate)' },
  { key: 'userPatterns', label: 'User Patterns' },
  { key: 'insightFeedback', label: 'Insight Feedback' },
  { key: 'feedback', label: 'Feedback' },
  { key: '_raw', label: 'Raw (flat data for debugging)' },
]

function RawDataTab({ data }: { data: Record<string, unknown> }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['profile', 'auth']))

  const toggle = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Raw JSON for debugging. Click to expand/collapse.
      </p>
      {RAW_SECTIONS.map(({ key, label }) => {
        const value = data[key]
        const isExpanded = expanded.has(key)
        const isEmpty = value === null || value === undefined || (Array.isArray(value) && value.length === 0) || (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0)
        return (
          <div key={key} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <button
              onClick={() => toggle(key)}
              className="w-full flex items-center justify-between px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
            >
              <span>{label}</span>
              <span className="text-xs text-gray-500">
                {isExpanded ? '▼' : '▶'}
              </span>
            </button>
            {isExpanded && (
              <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900/50">
                {isEmpty ? (
                  <p className="text-xs text-gray-500">No data</p>
                ) : (
                  <pre className="text-xs overflow-auto max-h-64">
                    {JSON.stringify(value, null, 2)}
                  </pre>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
