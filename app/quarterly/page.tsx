'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import {
  format,
  startOfQuarter,
  endOfQuarter,
  isSameQuarter,
  differenceInDays,
  addMonths,
} from 'date-fns'
import Link from 'next/link'
import { TrendingUp } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getUserSession } from '@/lib/auth'
import { getFeatureAccess } from '@/lib/features'
import { TrajectoryWisdom } from '@/components/quarterly/TrajectoryWisdom'
import { QuarterlyIntention } from '@/components/quarterly/QuarterlyIntention'
import { QuarterlyPreview } from '@/components/quarterly/QuarterlyPreview'
import { HowTheShiftShowedUp } from '@/components/quarterly/HowTheShiftShowedUp'
import { TransformationThread } from '@/components/quarterly/TransformationThread'
import { WhatYouCarriedForward } from '@/components/quarterly/WhatYouCarriedForward'
import { SurpriseTransformation } from '@/components/quarterly/SurpriseTransformation'
import { NextQuarterQuestion } from '@/components/quarterly/NextQuarterQuestion'
import { QuarterAtAGlance } from '@/components/quarterly/QuarterAtAGlance'
import { QuarterlyAllWinsExpandable } from '@/components/quarterly/QuarterlyAllWinsExpandable'
import { InsightNavigation } from '@/components/InsightNavigation'
import { LockedFeature } from '@/components/LockedFeature'
import { getQuarterlyProgress } from '@/lib/progress'
import { colors } from '@/lib/design-tokens'
import { showRefreshButton } from '@/lib/env'
import { fetchQuarterlyData, type QuarterlyData } from '@/lib/quarterly/getQuarterlyData'
import { buildQuarterlyNarrative } from '@/lib/quarterly/buildQuarterlyNarrative'
import { resolveEmailDisplayName } from '@/lib/email/personalization-display'
import { InsightLetterClosing } from '@/components/insights/InsightLetterClosing'

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
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const quarterParam = searchParams?.get('quarter')
  const initialQuarter = quarterParam && /^\d{4}-Q[1-4]$/.test(quarterParam)
    ? (parseQuarterParam(quarterParam) ?? new Date())
    : new Date()
  const [loading, setLoading] = useState(true)
  const [selectedQuarter, setSelectedQuarter] = useState(initialQuarter)
  const [initialRedirectDone, setInitialRedirectDone] = useState(false)
  const [periods, setPeriods] = useState<string[]>([])
  const [stats, setStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    needleMovers: 0,
    needleMoversCompleted: 0,
    reviewsCount: 0,
    decisions: 0,
  })
  const [quarterlyData, setQuarterlyData] = useState<QuarterlyData | null>(null)
  const [quarterlyWins, setQuarterlyWins] = useState<string[]>([])
  const [quarterlyInsight, setQuarterlyInsight] = useState<string | null>(null)
  const [quarterlyInsightOverride, setQuarterlyInsightOverride] = useState<string | null>(null)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const hasTriggeredGenerate = useRef(false)
  const [unlockProgress, setUnlockProgress] = useState<{ current: number; required: number; isUnlocked: boolean } | null>(null)
  const [quarterlyGreetingName, setQuarterlyGreetingName] = useState('Founder')
  const [quarterlyIntentionSaved, setQuarterlyIntentionSaved] = useState('')

  const isEndOfQuarter = differenceInDays(endOfQuarter(selectedQuarter), new Date()) <= 7 || !isSameQuarter(selectedQuarter, new Date())
  const showFullQuarterly = isEndOfQuarter

  const currentQuarterStr = toQuarterParam(selectedQuarter)
  const nextQuarterStart = addMonths(selectedQuarter, 3)
  const nextQuarterStr = toQuarterParam(nextQuarterStart)
  const hasNextQuarterInsight = periods.some((p) => p === nextQuarterStr)
  const getNextDisabledMessage = () => {
    const qNum = Math.ceil((nextQuarterStart.getMonth() + 1) / 3)
    const availableMonth = qNum * 3
    const availableYear = qNum === 4 ? nextQuarterStart.getFullYear() + 1 : nextQuarterStart.getFullYear()
    const availableMonthNum = qNum === 4 ? 0 : availableMonth
    const monthName = new Date(availableYear, availableMonthNum, 1).toLocaleString('default', { month: 'long' })
    return `Q${qNum} ${nextQuarterStart.getFullYear()} insights will be available on ${monthName} 1, ${availableYear}`
  }

  const narrative = useMemo(() => {
    if (!quarterlyData) return null
    return buildQuarterlyNarrative(quarterlyData, quarterlyData.userProfile)
  }, [quarterlyData])

  const completionRate = stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0

  useEffect(() => {
    if (quarterParam && /^\d{4}-Q[1-4]$/.test(quarterParam)) {
      const parsed = parseQuarterParam(quarterParam)
      if (parsed) setSelectedQuarter(parsed)
    }
  }, [quarterParam])

  useEffect(() => {
    if (quarterParam || initialRedirectDone) return
    const redirectToLatest = async () => {
      const session = await getUserSession()
      if (!session) return
      try {
        const {
          data: { session: supabaseSession },
        } = await supabase.auth.getSession()
        const headers: Record<string, string> = {}
        if (supabaseSession?.access_token) headers['Authorization'] = `Bearer ${supabaseSession.access_token}`
        const res = await fetch('/api/insights/periods?type=quarterly', { headers })
        const json = await res.json()
        if (json.periods?.length > 0) {
          const latestQuarter = toQuarterParam(new Date(json.periods[0]))
          router.replace(`/quarterly?quarter=${latestQuarter}`)
        }
      } catch {
        // ignore
      } finally {
        setInitialRedirectDone(true)
      }
    }
    redirectToLatest()
  }, [quarterParam, initialRedirectDone, router])

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
      const progress = await getQuarterlyProgress(session.user.id)
      setUnlockProgress(progress)
    }
    checkUnlock()
  }, [])

  useEffect(() => {
    void (async () => {
      const session = await getUserSession()
      if (!session) return
      try {
        const res = await fetch('/api/user/quarterly-intention', { credentials: 'include' })
        if (!res.ok) return
        const j = (await res.json()) as { quarterlyIntention?: string }
        setQuarterlyIntentionSaved((j.quarterlyIntention ?? '').trim())
      } catch {
        /* ignore */
      }
    })()
  }, [])

  useEffect(() => {
    const fetchPeriods = async () => {
      const session = await getUserSession()
      if (!session) return
      try {
        const {
          data: { session: supabaseSession },
        } = await supabase.auth.getSession()
        const headers: Record<string, string> = {}
        if (supabaseSession?.access_token) headers['Authorization'] = `Bearer ${supabaseSession.access_token}`
        const qStr = toQuarterParam(selectedQuarter)
        const res = await fetch(`/api/insights/periods?type=quarterly&current=${qStr}`, { headers })
        const json = await res.json()
        if (json.periods) {
          const converted = json.periods.map((p: string) =>
            /^\d{4}-Q[1-4]$/.test(p) ? p : toQuarterParam(new Date(p))
          )
          setPeriods(converted)
        }
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

      const features = getFeatureAccess({
        tier: session.user.tier,
        pro_features_enabled: session.user.pro_features_enabled,
      })

      const [data, promptsRes] = await Promise.all([
        fetchQuarterlyData(supabase, session.user.id, selectedQuarter),
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

      setQuarterlyData(data)
      setStats(data.stats)
      setQuarterlyWins(data.allWinsFlat.map((w) => w.text))

      if ((promptsRes as { data?: { prompt_text?: string } | null })?.data?.prompt_text) {
        setQuarterlyInsight(((promptsRes as { data?: { prompt_text?: string } }).data?.prompt_text) ?? null)
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
    const features = session
      ? getFeatureAccess({ tier: session.user.tier, pro_features_enabled: session.user.pro_features_enabled })
      : null
    if (!features?.personalMonthlyInsight) return
    setGenerating(true)
    setGenerateError(null)
    try {
      const {
        data: { session: supabaseSession },
      } = await supabase.auth.getSession()
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (supabaseSession?.access_token) headers['Authorization'] = `Bearer ${supabaseSession.access_token}`
      Object.assign(headers, await import('@/lib/api-client').then((m) => m.getSignedHeadersCached(supabaseSession?.access_token)))
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
        setGenerateError(
          `[AI ERROR] ${json.error}${json.model ? ` (model: ${json.model})` : ''}${json.status ? ` [status ${json.status}]` : ''}`
        )
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
      const features = session
        ? getFeatureAccess({ tier: session.user.tier, pro_features_enabled: session.user.pro_features_enabled })
        : null
      if (!features?.personalMonthlyInsight) return
      const hasContent = quarterlyWins.length > 0
      if (!hasContent) return
      hasTriggeredGenerate.current = true
      setGenerating(true)
      try {
        const {
          data: { session: supabaseSession },
        } = await supabase.auth.getSession()
        const headers: Record<string, string> = { 'Content-Type': 'application/json' }
        if (supabaseSession?.access_token) headers['Authorization'] = `Bearer ${supabaseSession.access_token}`
        Object.assign(headers, await import('@/lib/api-client').then((m) => m.getSignedHeadersCached(supabaseSession?.access_token)))
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
          setGenerateError(
            `[AI ERROR] ${json.error}${json.model ? ` (model: ${json.model})` : ''}${json.status ? ` [status ${json.status}]` : ''}`
          )
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
        <p className="text-gray-700 dark:text-gray-300">Loading quarterly insights...</p>
      </div>
    )
  }

  const allWinsHref = `${pathname || '/quarterly'}?quarter=${currentQuarterStr}#quarterly-all-wins`

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex flex-col gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-1 flex items-center gap-2 text-gray-900 dark:text-gray-100">
            <TrendingUp className="w-8 h-8" style={{ color: colors.coral.DEFAULT }} />
            Quarterly Trajectory
          </h1>
        </div>
        <InsightNavigation
          type="quarterly"
          currentPeriod={toQuarterParam(selectedQuarter)}
          periods={periods.length > 0 ? periods : [toQuarterParam(selectedQuarter)]}
          onNavigate={(period) => router.push(`/quarterly?quarter=${period}`)}
          nextDisabledMessage={!hasNextQuarterInsight ? getNextDisabledMessage() : undefined}
        />
      </div>

      {!showFullQuarterly && isSameQuarter(selectedQuarter, new Date()) && (
        <QuarterlyPreview
          quarterLabel={quarterLabel}
          stats={{
            completedTasks: stats.completedTasks,
            needleMovers: stats.needleMovers,
            needleMoversCompleted: stats.needleMoversCompleted,
          }}
        />
      )}

      {showFullQuarterly && narrative && (
        <div className="space-y-8">
          <TrajectoryWisdom
            insight={quarterlyInsightOverride ?? quarterlyInsight}
            quarterLabel={quarterLabel}
            greetingName={quarterlyGreetingName}
            onRefresh={showRefreshButton ? handleGenerateInsight : undefined}
            generating={generating}
            generateError={generateError}
          />

          <HowTheShiftShowedUp months={narrative.shiftShowedUp} />

          <TransformationThread thread={narrative.transformationThread} />

          <WhatYouCarriedForward strengths={narrative.carriedForward} primaryGoalText={quarterlyData?.userProfile.primary_goal_text} />

          <SurpriseTransformation surprise={narrative.surprise} />

          <QuarterlyIntention
            initialValue={quarterlyIntentionSaved}
            unlocked={unlockProgress?.isUnlocked !== false}
            placeholder="I commit to..."
            onSave={async (value) => {
              const res = await fetch('/api/user/quarterly-intention', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ quarterlyIntention: value }),
              })
              if (!res.ok) {
                const err = await res.json().catch(() => ({}))
                throw new Error((err as { error?: string }).error || 'Failed to save')
              }
              const j = (await res.json()) as { quarterlyIntention?: string }
              setQuarterlyIntentionSaved((j.quarterlyIntention ?? value).trim())
            }}
          />

          <NextQuarterQuestion block={narrative.guidingQuestion} />

          <QuarterAtAGlance
            stats={{
              ...stats,
              completionRate,
            }}
            viewAllWinsHref={quarterlyData && quarterlyData.allWinsFlat.length > 0 ? allWinsHref : undefined}
          />

          <InsightLetterClosing cadence="quarter" className="mt-2" />

          {quarterlyData && quarterlyData.allWinsFlat.length > 0 && (
            <QuarterlyAllWinsExpandable wins={quarterlyData.allWinsFlat} quarterLabel={quarterLabel} />
          )}
        </div>
      )}
      <p className="text-sm text-gray-600 dark:text-gray-300 mt-8">
        Explore related views:{' '}
        <Link href="/founder-dna/rhythm" className="text-[#ef725c] hover:underline">Rhythm</Link>,{' '}
        <Link href="/founder-dna/patterns" className="text-[#ef725c] hover:underline">Patterns</Link>,{' '}
        <Link href="/founder-dna/journey" className="text-[#ef725c] hover:underline">Journey</Link>.
      </p>
    </div>
  )
}
