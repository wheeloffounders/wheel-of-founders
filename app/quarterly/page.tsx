'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  format,
  startOfQuarter,
  endOfQuarter,
  isSameQuarter,
  differenceInDays,
} from 'date-fns'
import { TrendingUp } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getUserSession } from '@/lib/auth'
import { getFeatureAccess } from '@/lib/features'
import { TrajectoryStats } from '@/components/quarterly/TrajectoryStats'
import { DefiningMoments } from '@/components/quarterly/DefiningMoments'
import { TrajectoryWisdom } from '@/components/quarterly/TrajectoryWisdom'
import { QuarterlyIntention } from '@/components/quarterly/QuarterlyIntention'
import { QuarterlyPreview } from '@/components/quarterly/QuarterlyPreview'
import { InsightNavigation } from '@/components/InsightNavigation'
import { LockedFeature } from '@/components/LockedFeature'
import { getQuarterlyProgress } from '@/lib/progress'
import { colors } from '@/lib/design-tokens'

function parseQuarterParam(q: string): Date | null {
  const m = q.match(/^(\d{4})-Q([1-4])$/)
  if (!m) return null
  const year = parseInt(m[1], 10)
  const qNum = parseInt(m[2], 10)
  return new Date(year, (qNum - 1) * 3, 1)
}

function toQuarterParam(d: Date): string {
  const q = Math.ceil((d.getMonth() + 1) / 3)
  return `${d.getFullYear()}-Q${q}`
}

export default function QuarterlyPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const quarterParam = searchParams?.get('quarter')
  const initialQuarter = quarterParam && /^\d{4}-Q[1-4]$/.test(quarterParam)
    ? (parseQuarterParam(quarterParam) ?? new Date())
    : new Date()
  const [loading, setLoading] = useState(true)
  const [selectedQuarter, setSelectedQuarter] = useState(initialQuarter)
  const [periods, setPeriods] = useState<string[]>([])
  const [stats, setStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    needleMovers: 0,
    needleMoversCompleted: 0,
    reviewsCount: 0,
    decisions: 0,
  })
  const [quarterlyWins, setQuarterlyWins] = useState<string[]>([])
  const [quarterlyInsight, setQuarterlyInsight] = useState<string | null>(null)
  const [quarterlyInsightOverride, setQuarterlyInsightOverride] = useState<string | null>(null)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const hasTriggeredGenerate = useRef(false)
  const [unlockProgress, setUnlockProgress] = useState<{ current: number; required: number; isUnlocked: boolean } | null>(null)

  const isEndOfQuarter = differenceInDays(endOfQuarter(selectedQuarter), new Date()) <= 7 || !isSameQuarter(selectedQuarter, new Date())
  const showFullQuarterly = isEndOfQuarter

  useEffect(() => {
    if (quarterParam && /^\d{4}-Q[1-4]$/.test(quarterParam)) {
      const parsed = parseQuarterParam(quarterParam)
      if (parsed) setSelectedQuarter(parsed)
    }
  }, [quarterParam])

  useEffect(() => {
    const checkAuth = async () => {
      const session = await getUserSession()
      if (!session) {
        router.push('/login')
        return
      }
    }
    checkAuth()
  }, [router])

  useEffect(() => {
    const checkUnlock = async () => {
      const session = await getUserSession()
      if (!session) return
      const progress = await getQuarterlyProgress(session.user.id)
      setUnlockProgress(progress)
    }
    checkUnlock()
  }, [])

  useEffect(() => {
    const fetchPeriods = async () => {
      const session = await getUserSession()
      if (!session) return
      try {
        const { data: { session: supabaseSession } } = await supabase.auth.getSession()
        const headers: Record<string, string> = {}
        if (supabaseSession?.access_token) headers['Authorization'] = `Bearer ${supabaseSession.access_token}`
        const qStr = toQuarterParam(selectedQuarter)
        const res = await fetch(`/api/insights/periods?type=quarterly&current=${qStr}`, { headers })
        const json = await res.json()
        if (json.periods) setPeriods(json.periods)
      } catch {
        // ignore
      }
    }
    fetchPeriods()
  }, [selectedQuarter])

  useEffect(() => {
    const fetchQuarterData = async () => {
      setLoading(true)
      const session = await getUserSession()
      if (!session) {
        setLoading(false)
        return
      }

      const quarterStart = format(startOfQuarter(selectedQuarter), 'yyyy-MM-dd')
      const quarterEnd = format(endOfQuarter(selectedQuarter), 'yyyy-MM-dd')

      const features = getFeatureAccess({
        tier: session.user.tier,
        pro_features_enabled: session.user.pro_features_enabled,
      })

      const [tasksRes, reviewsRes, decisionsRes, promptsRes] = await Promise.all([
        supabase
          .from('morning_tasks')
          .select('needle_mover, completed')
          .gte('plan_date', quarterStart)
          .lte('plan_date', quarterEnd)
          .eq('user_id', session.user.id),
        supabase
          .from('evening_reviews')
          .select('id, wins, lessons, review_date')
          .gte('review_date', quarterStart)
          .lte('review_date', quarterEnd)
          .eq('user_id', session.user.id),
        supabase
          .from('morning_decisions')
          .select('id')
          .gte('plan_date', quarterStart)
          .lte('plan_date', quarterEnd)
          .eq('user_id', session.user.id),
        features.personalMonthlyInsight
          ? supabase
              .from('personal_prompts')
              .select('prompt_text')
              .eq('user_id', session.user.id)
              .eq('prompt_type', 'quarterly')
              .eq('prompt_date', quarterStart)
              .order('generated_at', { ascending: false })
              .limit(1)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ])

      const tasks = tasksRes.data ?? []
      const reviews = reviewsRes.data ?? []
      const needleMovers = tasks.filter((t) => t.needle_mover).length
      const needleMoversCompleted = tasks.filter((t) => t.needle_mover && t.completed).length

      const wins: string[] = []
      const parseWins = (val: unknown): string[] => {
        if (!val) return []
        if (typeof val === 'string') {
          try {
            const parsed = JSON.parse(val)
            return Array.isArray(parsed) ? parsed.filter((s: string) => s?.trim()) : parsed && typeof parsed === 'string' ? [parsed] : []
          } catch {
            return val.trim() ? [val] : []
          }
        }
        return []
      }
      reviews.forEach((r: { wins?: unknown }) => {
        wins.push(...parseWins(r.wins))
      })
      setQuarterlyWins(wins)

      setStats({
        totalTasks: tasks.length,
        completedTasks: tasks.filter((t) => t.completed).length,
        needleMovers,
        needleMoversCompleted,
        reviewsCount: reviews.length,
        decisions: (decisionsRes.data ?? []).length,
      })
      if ((promptsRes as { data?: { prompt_text?: string } | null })?.data?.prompt_text) {
        setQuarterlyInsight(((promptsRes as any).data?.prompt_text) ?? null)
      } else {
        setQuarterlyInsight(null)
      }
      setQuarterlyInsightOverride(null)
      hasTriggeredGenerate.current = false
      setLoading(false)
    }

    fetchQuarterData()
  }, [selectedQuarter])

  const quarterLabel = `Q${Math.ceil((selectedQuarter.getMonth() + 1) / 3)} ${selectedQuarter.getFullYear()}`

  const handleGenerateInsight = async () => {
    const session = await getUserSession()
    const features = session ? getFeatureAccess({ tier: session.user.tier, pro_features_enabled: session.user.pro_features_enabled }) : null
    if (!features?.personalMonthlyInsight) return
    setGenerating(true)
    setGenerateError(null)
    try {
      const { data: { session: supabaseSession } } = await supabase.auth.getSession()
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (supabaseSession?.access_token) headers['Authorization'] = `Bearer ${supabaseSession.access_token}`
      const quarterStart = format(startOfQuarter(selectedQuarter), 'yyyy-MM-dd')
      const quarterEnd = format(endOfQuarter(selectedQuarter), 'yyyy-MM-dd')
      const res = await fetch('/api/quarterly-insight/generate', {
        method: 'POST',
        headers,
        body: JSON.stringify({ quarterStart, quarterEnd }),
      })
      const json = await res.json()
      if (json.prompt) {
        setQuarterlyInsightOverride(json.prompt)
        setGenerateError(null)
      } else if (json.aiError) {
        setGenerateError(`[AI ERROR] ${json.error}${json.model ? ` (model: ${json.model})` : ''}${json.status ? ` [status ${json.status}]` : ''}`)
      } else {
        setGenerateError(json.error || 'Failed to generate insight')
      }
    } catch (err) {
      console.error('[quarterly] Generate error:', err)
      setGenerateError(err instanceof Error ? err.message : 'Failed to generate')
    } finally {
      setGenerating(false)
    }
  }

  useEffect(() => {
    if (!showFullQuarterly || generating || hasTriggeredGenerate.current) return
    const hasInsight = quarterlyInsightOverride ?? quarterlyInsight
    if (hasInsight) return
    const doGenerate = async () => {
      const session = await getUserSession()
      const features = session ? getFeatureAccess({ tier: session.user.tier, pro_features_enabled: session.user.pro_features_enabled }) : null
      if (!features?.personalMonthlyInsight) return
      const hasContent = quarterlyWins.length > 0
      if (!hasContent) return
      hasTriggeredGenerate.current = true
      setGenerating(true)
      try {
        const { data: { session: supabaseSession } } = await supabase.auth.getSession()
        const headers: Record<string, string> = { 'Content-Type': 'application/json' }
        if (supabaseSession?.access_token) headers['Authorization'] = `Bearer ${supabaseSession.access_token}`
        const quarterStart = format(startOfQuarter(selectedQuarter), 'yyyy-MM-dd')
        const quarterEnd = format(endOfQuarter(selectedQuarter), 'yyyy-MM-dd')
        const res = await fetch('/api/quarterly-insight/generate', {
          method: 'POST',
          headers,
          body: JSON.stringify({ quarterStart, quarterEnd }),
        })
        const json = await res.json()
        if (json.prompt) {
          setQuarterlyInsightOverride(json.prompt)
          setGenerateError(null)
        } else if (json.aiError) {
          setGenerateError(`[AI ERROR] ${json.error}${json.model ? ` (model: ${json.model})` : ''}${json.status ? ` [status ${json.status}]` : ''}`)
        }
      } catch (err) {
        console.error('[quarterly] Auto-generate error:', err)
        hasTriggeredGenerate.current = false
      } finally {
        setGenerating(false)
      }
    }
    doGenerate()
  }, [showFullQuarterly, quarterlyInsight, quarterlyInsightOverride, quarterlyWins.length, selectedQuarter, generating])

  if (unlockProgress && !unlockProgress.isUnlocked) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <LockedFeature type="quarterly" progress={{ current: unlockProgress.current, required: unlockProgress.required }} />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <p className="text-gray-700 dark:text-gray-300 dark:text-gray-300">Loading quarterly insights...</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-1 flex items-center gap-2 text-gray-900 dark:text-gray-100 dark:text-white">
            <TrendingUp className="w-8 h-8" style={{ color: colors.coral.DEFAULT }} />
            Quarterly Trajectory
          </h1>
        </div>
        <InsightNavigation
          type="quarterly"
          currentPeriod={toQuarterParam(selectedQuarter)}
          periods={periods.length > 0 ? periods : [toQuarterParam(selectedQuarter)]}
          onNavigate={(period) => router.push(`/quarterly?quarter=${period}`)}
        />
      </div>

      {/* Quarter in Progress - teaser */}
      {!showFullQuarterly && (
        <QuarterlyPreview
          quarterLabel={quarterLabel}
          stats={{
            completedTasks: stats.completedTasks,
            needleMovers: stats.needleMovers,
            needleMoversCompleted: stats.needleMoversCompleted,
          }}
        />
      )}

      {/* Full quarterly analysis - big picture focus, insight first */}
      {showFullQuarterly && (
        <div className="space-y-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 dark:text-white">Your Quarterly Trajectory</h1>

          {/* 1. Mrs. Deer's reflection FIRST - the big picture */}
          <TrajectoryWisdom
            insight={quarterlyInsightOverride ?? quarterlyInsight}
            quarterLabel={quarterLabel}
            onRefresh={handleGenerateInsight}
            generating={generating}
            generateError={generateError}
          />

          {/* 2. Minimal stats - just the essentials */}
          <TrajectoryStats
            stats={{
              ...stats,
              completionRate: stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0,
            }}
          />

          {/* 3. Defining moments - key wins from the quarter */}
          <DefiningMoments
            moments={quarterlyWins.map((text) => ({ text }))}
            quarterLabel={quarterLabel}
          />
        </div>
      )}
    </div>
  )
}
