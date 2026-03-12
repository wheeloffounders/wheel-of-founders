'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  format,
  startOfMonth,
  endOfMonth,
  isSameMonth,
  differenceInDays,
  addMonths,
} from 'date-fns'
import { Calendar, Download, Sparkles } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getUserSession } from '@/lib/auth'
import { calculateStreak } from '@/lib/streak'
import { getFeatureAccess } from '@/lib/features'
import { generateTransformationPairs, detectWinThemes } from '@/lib/weekly-analysis'
import type { WinWithDate } from '@/lib/weekly-analysis'
import { ThemeChart } from '@/components/insights/ThemeChart'
import { Button } from '@/components/ui/button'
import { TransformationPairs } from '@/components/monthly/TransformationPairs'
import { MonthlyTrends } from '@/components/monthly/MonthlyTrends'
import { MonthlyWisdom } from '@/components/monthly/MonthlyWisdom'
import { MonthlyPreview } from '@/components/monthly/MonthlyPreview'
import { InsightNavigation } from '@/components/InsightNavigation'
import { LockedFeature } from '@/components/LockedFeature'
import { getMonthlyProgress } from '@/lib/progress'
import { colors } from '@/lib/design-tokens'
import { showRefreshButton } from '@/lib/env'

export default function MonthlyInsightPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const monthParam = searchParams?.get('month')
  const initialMonth = monthParam && /^\d{4}-\d{2}$/.test(monthParam)
    ? new Date(monthParam + '-01')
    : new Date()
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(initialMonth)
  const [initialRedirectDone, setInitialRedirectDone] = useState(false)
  const [periods, setPeriods] = useState<string[]>([])
  const [stats, setStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    needleMovers: 0,
    needleMoversCompleted: 0,
    decisions: 0,
    proactivePct: 0,
    firesTotal: 0,
    firesResolved: 0,
    reviewsCount: 0,
    streakDays: 0,
  })
  const [monthlyInsight, setMonthlyInsight] = useState<string | null>(null)
  const [monthlyInsightOverride, setMonthlyInsightOverride] = useState<string | null>(null)
  const [monthlyWins, setMonthlyWins] = useState<string[]>([])
  const [monthlyLessons, setMonthlyLessons] = useState<string[]>([])
  const [winsWithDate, setWinsWithDate] = useState<WinWithDate[]>([])
  const [exporting, setExporting] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [transformationPairs, setTransformationPairs] = useState<{ start: string; now: string }[] | null>(null)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const hasTriggeredGenerate = useRef(false)
  const [unlockProgress, setUnlockProgress] = useState<{ current: number; required: number; isUnlocked: boolean } | null>(null)

  const isEndOfMonth = differenceInDays(endOfMonth(selectedMonth), new Date()) <= 3 || !isSameMonth(selectedMonth, new Date())
  const showFullMonthly = isEndOfMonth

  const currentMonthStr = format(selectedMonth, 'yyyy-MM')
  const hasCurrentMonthInsight = periods.some((p) => p.startsWith(currentMonthStr))
  const nextMonthStr = format(addMonths(selectedMonth, 1), 'yyyy-MM')
  const hasNextMonthInsight = periods.some((p) => p.startsWith(nextMonthStr))
  const getNextDisabledMessage = () => {
    const nextMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1)
    const monthName = nextMonth.toLocaleString('default', { month: 'long' })
    const availableDate = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 1)
    const availableMonth = availableDate.toLocaleString('default', { month: 'long' })
    return `${monthName} insights will be available on ${availableMonth} 1, ${availableDate.getFullYear()}`
  }

  useEffect(() => {
    if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
      setSelectedMonth(new Date(monthParam + '-01'))
    }
  }, [monthParam])

  useEffect(() => {
    const checkAuth = async () => {
      const session = await getUserSession()
      if (!session) {
        router.push('/auth/login')
        return
      }
    }
    checkAuth()
  }, [router])

  useEffect(() => {
    const checkUnlock = async () => {
      const session = await getUserSession()
      if (!session) return
      const progress = await getMonthlyProgress(session.user.id)
      setUnlockProgress(progress)
    }
    checkUnlock()
  }, [])

  useEffect(() => {
    if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
      setSelectedMonth(new Date(monthParam + '-01'))
    }
  }, [monthParam])

  // When no month in URL, redirect to most recent month WITH data
  useEffect(() => {
    if (monthParam || initialRedirectDone) return
    const redirectToLatest = async () => {
      const session = await getUserSession()
      if (!session) return
      try {
        const { data: { session: supabaseSession } } = await supabase.auth.getSession()
        const headers: Record<string, string> = {}
        if (supabaseSession?.access_token) headers['Authorization'] = `Bearer ${supabaseSession.access_token}`
        const res = await fetch('/api/insights/periods?type=monthly', { headers })
        const json = await res.json()
        if (json.periods?.length > 0) {
          const latestMonth = json.periods[0].slice(0, 7) // "2026-02-01" -> "2026-02"
          router.replace(`/monthly-insight?month=${latestMonth}`)
        }
      } catch {
        // ignore
      } finally {
        setInitialRedirectDone(true)
      }
    }
    redirectToLatest()
  }, [monthParam, initialRedirectDone, router])

  useEffect(() => {
    const fetchPeriods = async () => {
      const session = await getUserSession()
      if (!session) return
      try {
        const { data: { session: supabaseSession } } = await supabase.auth.getSession()
        const headers: Record<string, string> = {}
        if (supabaseSession?.access_token) headers['Authorization'] = `Bearer ${supabaseSession.access_token}`
        const monthStr = format(selectedMonth, 'yyyy-MM')
        const res = await fetch(`/api/insights/periods?type=monthly&current=${monthStr}`, { headers })
        const json = await res.json()
        if (json.periods) setPeriods(json.periods)
      } catch {
        // ignore
      }
    }
    fetchPeriods()
  }, [selectedMonth])

  useEffect(() => {
    const fetchMonthData = async () => {
      setLoading(true)
      const session = await getUserSession()
      if (!session) {
        setLoading(false)
        return
      }

      const features = getFeatureAccess({
        tier: session.user.tier,
        pro_features_enabled: session.user.pro_features_enabled,
      })

      const monthStart = format(startOfMonth(selectedMonth), 'yyyy-MM-dd')
      const monthEnd = format(endOfMonth(selectedMonth), 'yyyy-MM-dd')

      const [tasksRes, emergenciesRes, reviewsRes, decisionsRes, promptsRes] = await Promise.all([
        supabase
          .from('morning_tasks')
          .select('needle_mover, completed, is_proactive')
          .gte('plan_date', monthStart)
          .lte('plan_date', monthEnd)
          .eq('user_id', session.user.id),
        supabase
          .from('emergencies')
          .select('resolved')
          .gte('fire_date', monthStart)
          .lte('fire_date', monthEnd)
          .eq('user_id', session.user.id),
        supabase
          .from('evening_reviews')
          .select('id, wins, lessons, review_date')
          .gte('review_date', monthStart)
          .lte('review_date', monthEnd)
          .eq('user_id', session.user.id),
        supabase
          .from('morning_decisions')
          .select('id')
          .gte('plan_date', monthStart)
          .lte('plan_date', monthEnd)
          .eq('user_id', session.user.id),
        features.personalMonthlyInsight
          ? supabase
              .from('personal_prompts')
              .select('prompt_text')
              .eq('user_id', session.user.id)
              .eq('prompt_type', 'monthly')
              .eq('prompt_date', monthStart)
              .order('generated_at', { ascending: false })
              .limit(1)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ])

      const tasks = tasksRes.data ?? []
      const emergencies = emergenciesRes.data ?? []
      const reviews = reviewsRes.data ?? []
      const decisions = decisionsRes.data ?? []

      const wins: string[] = []
      const lessons: string[] = []
      const winsWithDateLocal: WinWithDate[] = []
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
      const parseLessons = (val: unknown): string[] => {
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
      reviews.forEach((r: { wins?: unknown; lessons?: unknown; review_date?: string }) => {
        const date = r.review_date || ''
        const w = parseWins(r.wins)
        const l = parseLessons(r.lessons)
        wins.push(...w)
        lessons.push(...l)
        w.forEach((text) => winsWithDateLocal.push({ text, date }))
      })
      setMonthlyWins(wins)
      setMonthlyLessons(lessons)
      setWinsWithDate(winsWithDateLocal)

      const needleMovers = tasks.filter((t) => t.needle_mover).length
      const needleMoversCompleted = tasks.filter((t) => t.needle_mover && t.completed).length
      const completedTasks = tasks.filter((t) => t.completed).length
      const proactiveCount = tasks.filter((t) => t.is_proactive === true).length
      const proactivePct = tasks.length > 0 ? Math.round((proactiveCount / tasks.length) * 100) : 0
      const firesResolved = emergencies.filter((e) => e.resolved).length

      let streakDays = 0
      if (isSameMonth(selectedMonth, new Date())) {
        const streakData = await calculateStreak(session.user.id)
        streakDays = streakData.currentStreak
      }

      setStats({
        totalTasks: tasks.length,
        completedTasks,
        needleMovers,
        needleMoversCompleted,
        decisions: decisions.length,
        proactivePct,
        firesTotal: emergencies.length,
        firesResolved,
        reviewsCount: reviews.length,
        streakDays,
      })

      if (promptsRes.data?.prompt_text) {
        setMonthlyInsight(promptsRes.data.prompt_text)
      } else {
        setMonthlyInsight(null)
      }
      setMonthlyInsightOverride(null)
      setTransformationPairs(null)
      // Reset so we can auto-generate for this month if no insight exists
      hasTriggeredGenerate.current = false

      setLoading(false)
    }

    fetchMonthData()
  }, [selectedMonth])

  useEffect(() => {
    const fetchPeriods = async () => {
      const session = await getUserSession()
      if (!session) return
      try {
        const { data: { session: supabaseSession } } = await supabase.auth.getSession()
        const headers: Record<string, string> = {}
        if (supabaseSession?.access_token) headers['Authorization'] = `Bearer ${supabaseSession.access_token}`
        const monthStr = format(startOfMonth(selectedMonth), 'yyyy-MM')
        const res = await fetch(`/api/insights/periods?type=monthly&current=${monthStr}`, { headers })
        const json = await res.json()
        if (json.periods) setPeriods(json.periods)
      } catch {
        // ignore
      }
    }
    fetchPeriods()
  }, [selectedMonth])

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
      Object.assign(headers, await import('@/lib/api-client').then((m) => m.getSignedHeadersCached(supabaseSession?.access_token)))
      const monthStart = format(startOfMonth(selectedMonth), 'yyyy-MM-dd')
      const monthEnd = format(endOfMonth(selectedMonth), 'yyyy-MM-dd')
      const res = await fetch('/api/monthly-insight/generate', {
        method: 'POST',
        headers,
        body: JSON.stringify({ monthStart, monthEnd }),
      })
      const json = await res.json()
      if (json.prompt) {
        setMonthlyInsightOverride(json.prompt)
        setGenerateError(null)
      } else if (json.aiError) {
        setGenerateError(`[AI ERROR] ${json.error}${json.model ? ` (model: ${json.model})` : ''}${json.status ? ` [status ${json.status}]` : ''}`)
      } else {
        setGenerateError(json.error || 'Failed to generate insight')
      }
    } catch (err) {
      console.error('[monthly] Generate error:', err)
      setGenerateError(err instanceof Error ? err.message : 'Failed to generate')
    } finally {
      setGenerating(false)
    }
  }

  // Auto-generate insight on load when no insight exists
  useEffect(() => {
    if (!showFullMonthly || generating || hasTriggeredGenerate.current) return
    const hasInsight = monthlyInsightOverride ?? monthlyInsight
    if (hasInsight) return
    const doGenerate = async () => {
      const session = await getUserSession()
      const features = session ? getFeatureAccess({ tier: session.user.tier, pro_features_enabled: session.user.pro_features_enabled }) : null
      if (!features?.personalMonthlyInsight) return
      const hasContent = monthlyWins.length > 0 || monthlyLessons.length > 0
      if (!hasContent) return
      hasTriggeredGenerate.current = true
      setGenerating(true)
      try {
        const { data: { session: supabaseSession } } = await supabase.auth.getSession()
        const headers: Record<string, string> = { 'Content-Type': 'application/json' }
        if (supabaseSession?.access_token) headers['Authorization'] = `Bearer ${supabaseSession.access_token}`
        Object.assign(headers, await import('@/lib/api-client').then((m) => m.getSignedHeadersCached(supabaseSession?.access_token)))
        const monthStart = format(startOfMonth(selectedMonth), 'yyyy-MM-dd')
        const monthEnd = format(endOfMonth(selectedMonth), 'yyyy-MM-dd')
        const res = await fetch('/api/monthly-insight/generate', {
          method: 'POST',
          headers,
          body: JSON.stringify({ monthStart, monthEnd }),
        })
        const json = await res.json()
        if (json.prompt) {
          setMonthlyInsightOverride(json.prompt)
          setGenerateError(null)
        } else if (json.aiError) {
          setGenerateError(`[AI ERROR] ${json.error}${json.model ? ` (model: ${json.model})` : ''}${json.status ? ` [status ${json.status}]` : ''}`)
        }
      } catch (err) {
        console.error('[monthly] Auto-generate error:', err)
        hasTriggeredGenerate.current = false
      } finally {
        setGenerating(false)
      }
    }
    doGenerate()
  }, [showFullMonthly, monthlyInsight, monthlyInsightOverride, monthlyWins.length, monthlyLessons.length, selectedMonth, generating])

  // Fetch AI-parsed transformation pairs when we have wins/lessons
  useEffect(() => {
    if (!showFullMonthly || (monthlyWins.length === 0 && monthlyLessons.length === 0)) return
    const fetchPairs = async () => {
      try {
        const { data: { session: supabaseSession } } = await supabase.auth.getSession()
        const headers: Record<string, string> = { 'Content-Type': 'application/json' }
        if (supabaseSession?.access_token) headers['Authorization'] = `Bearer ${supabaseSession.access_token}`
        const res = await fetch('/api/monthly-insight/transformation-pairs', {
          method: 'POST',
          headers,
          body: JSON.stringify({ wins: monthlyWins, lessons: monthlyLessons }),
        })
        const json = await res.json()
        if (json.pairs && json.pairs.length > 0) {
          setTransformationPairs(json.pairs)
        }
      } catch (err) {
        console.error('[monthly] Transformation pairs fetch error:', err)
      }
    }
    fetchPairs()
  }, [showFullMonthly, selectedMonth, monthlyWins, monthlyLessons])

  const handleExport = async () => {
    console.log('[Export] Button clicked (monthly)')
    setExporting(true)
    setGenerateError(null)
    try {
      const monthStart = format(startOfMonth(selectedMonth), 'yyyy-MM-dd')
      const monthEnd = format(endOfMonth(selectedMonth), 'yyyy-MM-dd')
      const { data: { session } } = await supabase.auth.getSession()
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }
      const res = await fetch('/api/export', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          exportType: 'custom_range',
          dateRangeStart: monthStart,
          dateRangeEnd: monthEnd,
          format: 'pdf',
        }),
        credentials: 'include',
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 401) {
          setGenerateError('Session expired. Please log in again.')
          router.push('/auth/login?returnTo=/monthly-insight')
          return
        }
        setGenerateError(data.error || 'Export failed')
        return
      }
      const url = data.pdfDownloadUrl ?? data.downloadUrl
      if (url) {
        const a = document.createElement('a')
        a.href = url
        a.target = '_blank'
        a.rel = 'noopener noreferrer'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      } else if (data.pdfBase64) {
        const bin = atob(data.pdfBase64)
        const arr = new Uint8Array(bin.length)
        for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
        const blob = new Blob([arr], { type: 'application/pdf' })
        const blobUrl = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = blobUrl
        a.download = data.pdfFileName ?? `monthly-export-${monthStart}.pdf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(blobUrl)
      } else if (data.exportId) {
        const dlHeaders: Record<string, string> = {}
        if (session?.access_token) {
          dlHeaders['Authorization'] = `Bearer ${session.access_token}`
        }
        const dlRes = await fetch(`/api/export/${data.exportId}/download?format=pdf`, {
          credentials: 'include',
          headers: dlHeaders,
        })
        const dlData = await dlRes.json()
        if (dlData.downloadUrl) {
          const a = document.createElement('a')
          a.href = dlData.downloadUrl
          a.target = '_blank'
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
        } else {
          console.warn('[Export] No download URL from /download endpoint:', dlData)
          setGenerateError('Export ready but download failed. Try again.')
        }
      } else {
        console.warn('[Export] No download URL, pdfBase64, or exportId in response')
        setGenerateError('Export completed but no file received. Try again.')
      }
    } catch (err) {
      console.error('[Export] Error:', err)
      setGenerateError(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  if (unlockProgress && !unlockProgress.isUnlocked) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <LockedFeature type="monthly" progress={{ current: unlockProgress.current, required: unlockProgress.required }} />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <p className="text-gray-700 dark:text-gray-300 dark:text-gray-300">Loading monthly insights...</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-1 flex items-center gap-2 text-gray-900 dark:text-gray-100 dark:text-white">
              <Calendar className="w-8 h-8" style={{ color: colors.coral.DEFAULT }} />
              Monthly Insight
            </h1>
          </div>
          <Button variant="outline" onClick={handleExport} disabled={exporting} className="gap-2 shrink-0">
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
        <InsightNavigation
          type="monthly"
          currentPeriod={format(startOfMonth(selectedMonth), 'yyyy-MM-dd')}
          periods={periods.length > 0 ? periods : [format(startOfMonth(selectedMonth), 'yyyy-MM-dd')]}
          onNavigate={(period) => {
            const monthStr = period.slice(0, 7)
            router.push(`/monthly-insight?month=${monthStr}`)
          }}
          nextDisabledMessage={!hasNextMonthInsight ? getNextDisabledMessage() : undefined}
        />
      </div>

      {/* Month in Progress - only when viewing current month with no insight yet */}
      {!showFullMonthly && isSameMonth(selectedMonth, new Date()) && !hasCurrentMonthInsight && (
        <MonthlyPreview
          monthLabel={format(selectedMonth, 'MMMM yyyy')}
          stats={{
            completedTasks: stats.completedTasks,
            needleMovers: stats.needleMovers,
            needleMoversCompleted: stats.needleMoversCompleted,
          }}
        />
      )}

      {/* Full monthly analysis - insight first, then stats */}
      {showFullMonthly && (
        <div className="space-y-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 dark:text-white">Your Month in Review</h2>
          <p className="text-gray-700 dark:text-gray-300 dark:text-gray-300">{format(selectedMonth, 'MMMM yyyy')}</p>

          {/* 1. Mrs. Deer's reflection FIRST */}
          <MonthlyWisdom
            insight={monthlyInsightOverride ?? monthlyInsight}
            monthLabel={format(selectedMonth, 'MMMM yyyy')}
            onRefresh={showRefreshButton ? handleGenerateInsight : undefined}
            generating={generating}
            generateError={generateError}
          />

          {/* 2. Monthly stats */}
          <MonthlyTrends
            stats={{
              ...stats,
              completionRate: stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0,
            }}
          />

          {/* 3. Top themes from wins (visual chart - same as weekly) */}
          {detectWinThemes(winsWithDate).length > 0 && (
            <div className="rounded-lg border-2 p-6" style={{ borderColor: colors.navy.DEFAULT }}>
              <ThemeChart
                themes={detectWinThemes(winsWithDate).slice(0, 5).map((t) => ({ theme: t.theme, count: t.count }))}
                title="Themes this month"
              />
            </div>
          )}

          {/* 4. Transformation pairs (AI-parsed before → after) */}
          <TransformationPairs
            pairs={
              transformationPairs && transformationPairs.length > 0
                ? transformationPairs
                : generateTransformationPairs(monthlyWins, monthlyLessons)
            }
          />
        </div>
      )}
    </div>
  )
}
