'use client'

// UX Refinement - Suppressed Analysis Modal for Non-Onboarding Flows - 2026-04-10 00:16 HKT

import { useState, useEffect, useCallback, useRef, useMemo, type MutableRefObject } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { useRouter, useSearchParams } from 'next/navigation'
import { format, subDays, startOfMonth, addYears, addDays, parseISO } from 'date-fns'
import {
  Moon,
  Heart,
  Target,
  Award,
  Lightbulb,
  AlertCircle,
  Loader2,
  Plus,
  X,
  Trash2,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import {
  isMissingEveningBrainDumpColumnError,
  isMissingEveningIsDayCompleteColumnError,
  isMissingEveningIsDraftColumnError,
} from '@/lib/supabase/evening-is-draft-column'
import { getUserSession, refreshSessionForWrite, isRlsOrAuthPermissionError } from '@/lib/auth'
import { calculateStreak, isStreakMilestone } from '@/lib/streak'
import { AICoachPrompt } from '@/components/AICoachPrompt'
import SpeechToTextInput from '@/components/SpeechToTextInput'
import { MrsDeerAdaptivePrompt } from '@/components/MrsDeerAdaptivePrompt'
import { getFeatureAccess } from '@/lib/features'
import { PageHeader } from '@/components/ui/PageHeader'
import { WeekNavigator } from '@/components/ui/WeekNavigator'
import { DatePickerModal } from '@/components/ui/DatePickerModal'
import type { DayStatus } from '@/lib/date-utils'
import { trackEvent } from '@/lib/analytics'
import { trackFunnelStep } from '@/lib/analytics/track-funnel'
import { trackJourneyStep } from '@/lib/analytics/journey-tracking'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { colors, spacing } from '@/lib/design-tokens'
import { LoadingWithMicroLesson } from '@/components/LoadingWithMicroLesson'
import { ConfirmModal } from '@/components/ConfirmModal'
import { useStreamingInsight } from '@/lib/hooks/useStreamingInsight'
import { StreamingIndicator } from '@/components/StreamingIndicator'
import { TutorialProgress } from '@/components/TutorialProgress'
import { EveningFirstTimeCTA } from '@/components/EveningFirstTimeCTA'
import { EveningPlanVsReality } from '@/components/evening/EveningPlanVsReality'
import type { EveningEmergencyRow } from '@/components/evening/EveningPlanVsReality'
import { EveningTaskRows } from '@/components/evening/EveningTaskRows'
import { BrainDumpCard } from '@/components/BrainDumpCard'
import { processEveningBrainDump } from '@/lib/evening/process-evening-brain-dump'
import { EVENING_STACK_SCROLL_FADE } from '@/lib/evening/evening-card-scroll'
import type { PostEveningLoopCloseContext } from '@/lib/personal-coaching'
import { InfoTooltip } from '@/components/InfoTooltip'
import { ReflectionPopup } from '@/components/ReflectionPopup'
import { getTimeAwareness } from '@/lib/time-utils'
import { getEffectivePlanDate } from '@/lib/effective-plan-date'
import { morningTasksOrFilterForPlanDate, isTaskShowingAsMovedToTomorrow } from '@/lib/morning-tasks-plan-date-query'
import { getUserTimezoneFromProfile } from '@/lib/timezone'
import { useMediaQuery } from '@/lib/hooks/useMediaQuery'
import { useProAccessBadgeLine } from '@/lib/hooks/useProAccessBadgeLine'
import { cn } from '@/components/ui/utils'
import { PageSidebar } from '@/components/layout/PageSidebar'
import { getClientAuthHeaders } from '@/lib/api/fetch-json'
import { trackErrorSync } from '@/lib/error-tracker'
import {
  eveningMicroCelebrationStorageKey,
  getEveningMicroCelebrationMessage,
} from '@/lib/micro-lessons/evening-micro-celebrations'
import { useDebouncedAutoSave, type DraftSaveStatus } from '@/lib/hooks/useDebouncedAutoSave'
import { getPendingTasksForSnoozePrompt } from '@/lib/evening/task-snooze-eligibility'
import { EveningDayClosedSealCard } from '@/components/evening/EveningDayClosedSealCard'
import { EveningInsightCompletionModal } from '@/components/evening/EveningInsightCompletionModal'
import { EveningMrsDeerReadingOverlay } from '@/components/evening/EveningMrsDeerReadingOverlay'

const MOOD_OPTIONS = [
  { value: 5, label: 'Great', emoji: '😊' },
  { value: 4, label: 'Good', emoji: '🙂' },
  { value: 3, label: 'Okay', emoji: '😐' },
  { value: 2, label: 'Tough', emoji: '😞' },
  { value: 1, label: 'Rough', emoji: '😫' },
]

const ENERGY_OPTIONS = [
  { value: 5, label: 'Very High', emoji: '🔋🔋🔋🔋🔋' },
  { value: 4, label: 'High', emoji: '🔋🔋🔋🔋' },
  { value: 3, label: 'Medium', emoji: '🔋🔋🔋' },
  { value: 2, label: 'Low', emoji: '🔋🔋' },
  { value: 1, label: 'Very Low', emoji: '🔋' },
]

/** Append-only: new suggested lines are pushed after existing rows; dedupe by full line (case-insensitive). */
function mergeAppendWinsLessons(
  prev: string[],
  suggested: string[]
): { final: string[]; highlight: number[] } {
  const base = prev.map((w) => w.trim()).filter(Boolean)
  const merged: string[] = [...base]
  const highlight: number[] = []
  for (const s of suggested) {
    const t = s.trim()
    if (!t) continue
    if (!merged.some((m) => m.toLowerCase() === t.toLowerCase())) {
      highlight.push(merged.length)
      merged.push(t)
    }
  }
  return { final: merged.length > 0 ? merged : [''], highlight }
}

interface Task {
  id: string
  description: string
  completed: boolean
  needle_mover?: boolean
  movedToTomorrow?: boolean
}

function buildEveningLoopCloseContext(tasks: Task[], emergencies: EveningEmergencyRow[]): PostEveningLoopCloseContext {
  return {
    totalFiresToday: emergencies.length,
    hotUnresolvedCount: emergencies.filter((e) => e.severity === 'hot' && !e.resolved).length,
    tasksPlanned: tasks.length,
    tasksCompleted: tasks.filter((t) => t.completed).length,
  }
}

type EveningDraftSnapshot = {
  journal: string
  brainDump: string
  wins: string[]
  lessons: string[]
  mood: number | null
  energy: number | null
}

function EveningAutosaveController({
  reviewDate,
  rowWasSubmittedRef,
  snapshotRef,
  hadEmergencyRef,
  onScheduleReady,
  onFlushReady,
  onStatus,
  onDraftId,
}: {
  reviewDate: string
  rowWasSubmittedRef: MutableRefObject<boolean>
  snapshotRef: MutableRefObject<EveningDraftSnapshot>
  hadEmergencyRef: MutableRefObject<boolean>
  onScheduleReady: (schedule: () => void) => void
  onFlushReady: (flush: () => Promise<void>) => void
  onStatus: (s: DraftSaveStatus) => void
  onDraftId: (id: string) => void
}) {
  const save = useCallback(async () => {
    const session = await getUserSession()
    if (!session?.user?.id) return
    const snap = snapshotRef.current
    const winsFiltered =
      snap.wins.filter((w) => w.trim()).length > 0 ? JSON.stringify(snap.wins.filter((w) => w.trim())) : null
    const lessonsFiltered =
      snap.lessons.filter((l) => l.trim()).length > 0
        ? JSON.stringify(snap.lessons.filter((l) => l.trim()))
        : null
    const meaningful =
      snap.journal.trim().length > 0 ||
      snap.brainDump.trim().length > 0 ||
      snap.mood != null ||
      snap.energy != null ||
      winsFiltered != null ||
      lessonsFiltered != null
    if (!meaningful) return

    const persistDraft = !rowWasSubmittedRef.current
    const runUpsert = (includeDraftCol: boolean, includeBrainDumpCol: boolean) =>
      supabase
        .from('evening_reviews')
        .upsert(
          {
            user_id: session.user.id,
            review_date: reviewDate,
            journal: snap.journal.trim() || null,
            ...(includeBrainDumpCol ? { brain_dump: snap.brainDump.trim() || null } : {}),
            mood: snap.mood,
            energy: snap.energy,
            wins: winsFiltered,
            lessons: lessonsFiltered,
            had_emergency: hadEmergencyRef.current,
            ...(includeDraftCol ? { is_draft: persistDraft } : {}),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,review_date' }
        )
        .select('id')
        .maybeSingle()

    let includeBrainDumpCol = true
    let includeDraftCol = true
    let { data, error } = await runUpsert(includeDraftCol, includeBrainDumpCol)
    if (error && isMissingEveningBrainDumpColumnError(error)) {
      includeBrainDumpCol = false
      ;({ data, error } = await runUpsert(includeDraftCol, includeBrainDumpCol))
    }
    if (error && isMissingEveningIsDraftColumnError(error)) {
      includeDraftCol = false
      ;({ data, error } = await runUpsert(includeDraftCol, includeBrainDumpCol))
    }
    if (error && isRlsOrAuthPermissionError(error)) {
      const again = await refreshSessionForWrite()
      if (again.ok) {
        ;({ data, error } = await runUpsert(includeDraftCol, includeBrainDumpCol))
        if (error && isMissingEveningBrainDumpColumnError(error)) {
          includeBrainDumpCol = false
          ;({ data, error } = await runUpsert(includeDraftCol, includeBrainDumpCol))
        }
        if (error && isMissingEveningIsDraftColumnError(error)) {
          includeDraftCol = false
          ;({ data, error } = await runUpsert(includeDraftCol, includeBrainDumpCol))
        }
      }
    }
    if (error) {
      const e = error as unknown as Record<string, unknown>
      console.error('[evening/draft-autosave] evening_reviews upsert failed', {
        code: e?.code,
        message: e?.message,
        details: e?.details,
        hint: e?.hint,
        raw: typeof error === 'object' && error !== null ? JSON.stringify(error) : String(error),
      })
      throw error
    }
    const id = (data as { id?: string } | null)?.id
    if (id) onDraftId(id)
  }, [reviewDate, snapshotRef, rowWasSubmittedRef, hadEmergencyRef, onDraftId])

  const { schedule, flush, status } = useDebouncedAutoSave({
    debounceMs: 2000,
    save,
    enabled: !!reviewDate,
  })

  useEffect(() => {
    onScheduleReady(() => schedule())
  }, [schedule, onScheduleReady])

  useEffect(() => {
    onFlushReady(flush)
  }, [flush, onFlushReady])

  useEffect(() => {
    onStatus(status)
  }, [status, onStatus])

  useEffect(() => {
    return () => {
      void flush()
    }
  }, [flush])

  return null
}

export default function EveningPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isTutorial = searchParams?.get('tutorial') === 'true'
  // All hooks must be at the top level - no conditional calls
  const [userTier, setUserTier] = useState<string>('beta')
  const [aiCoachMessage, setAiCoachMessage] = useState<string | null>(null)
  const [aiCoachTrigger, setAiCoachTrigger] = useState<'evening_after' | null>(null)
  const [eveningInsightId, setEveningInsightId] = useState<string | null>(null)
  const [journal, setJournal] = useState('')
  const [brainDump, setBrainDump] = useState('')
  const [mood, setMood] = useState<number | null>(null)
  const [energy, setEnergy] = useState<number | null>(null)
  const [wins, setWins] = useState<string[]>([''])
  const [lessons, setLessons] = useState<string[]>([''])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [morningTasks, setMorningTasks] = useState<Task[]>([])
  const [todayEmergencies, setTodayEmergencies] = useState<EveningEmergencyRow[]>([])
  const [justCompletedId, setJustCompletedId] = useState<string | null>(null)
  const [retryTrigger, setRetryTrigger] = useState(0)
  // Fix hydration: initialize with empty string, set in useEffect
  const [reviewDate, setReviewDate] = useState<string>('')
  const funnelStepRef = useRef<Set<number>>(new Set())
  const prefersReducedMotion = useReducedMotion()
  const [detectedPattern, setDetectedPattern] = useState<{
    kind: 'behavior' | 'coaching'
    patternType: string
    message: string
    suggestedAction: string
    ctaLabel?: string
    context?: string
  } | null>(null)
  const [confirmDeleteWin, setConfirmDeleteWin] = useState<number | null>(null)
  const [confirmDeleteLesson, setConfirmDeleteLesson] = useState<number | null>(null)
  const [showReflectionPopup, setShowReflectionPopup] = useState(false)
  const [reflectionPopupVariant, setReflectionPopupVariant] =
    useState<Parameters<typeof ReflectionPopup>[0]['variant'] | null>(null)
  const [currentReviewId, setCurrentReviewId] = useState<string | null>(null)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [displayedMonth, setDisplayedMonth] = useState<Date>(() => startOfMonth(new Date()))
  const isMobile = useMediaQuery('(max-width: 768px)')
  const { label: proAccessLineLabel } = useProAccessBadgeLine()
  const [monthStatus, setMonthStatus] = useState<Record<string, DayStatus>>({})

  const eveningRowWasSubmittedRef = useRef(false)
  const eveningSnapshotRef = useRef<EveningDraftSnapshot>({
    journal: '',
    brainDump: '',
    wins: [''],
    lessons: [''],
    mood: null,
    energy: null,
  })
  /** Set from GET /api/evening/context — tags evening_reviews.had_emergency for analytics. */
  const hadEmergencyRef = useRef(false)
  const [eveningCrisisContext, setEveningCrisisContext] = useState<{ resolvedCount: number; tomorrowDebt: number }>({
    resolvedCount: 0,
    tomorrowDebt: 0,
  })
  const [draftSaveStatus, setDraftSaveStatus] = useState<DraftSaveStatus>('idle')
  const scheduleEveningDraftRef = useRef<() => void>(() => {})
  const onEveningScheduleReady = useCallback((fn: () => void) => {
    scheduleEveningDraftRef.current = fn
  }, [])
  const flushEveningDraftRef = useRef<() => Promise<void>>(async () => {})
  const onEveningFlushReady = useCallback((fn: () => Promise<void>) => {
    flushEveningDraftRef.current = fn
  }, [])

  const { insight: streamingInsight, isStreaming, error: streamingError, startStream } = useStreamingInsight()
  const [isRetrying, setIsRetrying] = useState(false)
  const [isDayComplete, setIsDayComplete] = useState(false)
  const [eveningDumpSorting, setEveningDumpSorting] = useState(false)
  const [eveningBrainDumpListening, setEveningBrainDumpListening] = useState(false)
  const [dumpSortHighlight, setDumpSortHighlight] = useState<{
    journal: boolean
    wins: number[]
    lessons: number[]
  } | null>(null)
  /** Brief coral/sage glow on cards after brain dump → cards sort succeeds. */
  const [sortLandingGlow, setSortLandingGlow] = useState(false)
  const [snoozeTaskQueue, setSnoozeTaskQueue] = useState<Task[]>([])
  const [snoozeModalOpen, setSnoozeModalOpen] = useState(false)
  const postEveningStreamStartedRef = useRef(false)
  /** Mirrors last save: show “Mrs. Deer is reading…” only on first-ever evening (retry must match). */
  const postEveningReadingOverlayRef = useRef(false)
  /** Pro post-evening: Morning-aligned reading overlay → badge modal (null = inline insight or idle). */
  const [eveningInsightFlow, setEveningInsightFlow] = useState<null | 'reading' | 'modal'>(null)
  const [eveningFirstGlimpseBadge, setEveningFirstGlimpseBadge] = useState(false)
  const eveningInsightPostSaveActiveRef = useRef(false)

  /** Hot fires still open (for Mrs. Deer goodnight emphasis + plan strip) */
  const eveningHotUnresolvedCount = useMemo(
    () => todayEmergencies.filter((e) => e.severity === 'hot' && !e.resolved).length,
    [todayEmergencies]
  )

  /** Red strip: hot fires still open, or any incomplete task vs plan size */
  const loopStrainTip = useMemo(() => {
    const total = morningTasks.length
    const done = morningTasks.filter((t) => t.completed).length
    return eveningHotUnresolvedCount > 0 || (total > 0 && done < total)
  }, [eveningHotUnresolvedCount, morningTasks])

  /** Morning task lines for this review date — powers “Strategist loop” evening nudge. */
  const morningCommitmentSummary = useMemo(() => {
    const lines = morningTasks.map((t) => (t.description ?? '').trim()).filter(Boolean)
    if (lines.length === 0) return null
    return lines.join(' · ')
  }, [morningTasks])

  const journalOpeningSuggestion = useMemo(() => {
    if (!morningCommitmentSummary) return ''
    return `Regarding my goal to ${morningCommitmentSummary}, I noticed that `
  }, [morningCommitmentSummary])

  const journalPlaceholder = useMemo(() => {
    if (!morningCommitmentSummary) {
      return 'How did today go? What stood out? What would you do differently?'
    }
    const short =
      morningCommitmentSummary.length > 120
        ? `${morningCommitmentSummary.slice(0, 117)}…`
        : morningCommitmentSummary
    return `Regarding my goal to ${short}, I noticed that…`
  }, [morningCommitmentSummary])

  const sortLandingGlowClass = sortLandingGlow
    ? 'ring-2 ring-[#ef725c]/45 shadow-[0_0_32px_rgba(239,114,92,0.28)] transition-shadow duration-500 dark:ring-[#f0886c]/45 dark:shadow-[0_0_32px_rgba(240,136,108,0.2)]'
    : 'transition-shadow duration-500'

  const fireFunnelStep = useCallback((step: number, name: string) => {
    if (funnelStepRef.current.has(step)) return
    funnelStepRef.current.add(step)
    trackFunnelStep('evening_flow', name, step)
  }, [])

  const checkPatternDetection = useCallback(async () => {
    try {
      const res = await fetch('/api/feedback/detect-patterns')
      const data = await res.json()
      if (data.pattern?.message) {
        setDetectedPattern(data.pattern)
      }
    } catch {
      // Ignore
    }
  }, [])

  const handleEveningSortDump = useCallback(async (dumpText?: string) => {
    const raw = (dumpText ?? brainDump).trim()
    if (raw.length < 8) return
    fireFunnelStep(2, 'journal_engaged')
    try {
      const result = await processEveningBrainDump(raw, {
        reviewDate,
        existingWins: wins.map((w) => w.trim()).filter(Boolean),
        existingLessons: lessons.map((l) => l.trim()).filter(Boolean),
        morningTasks: morningTasks.map((t) => ({
          description: t.description,
          completed: t.completed,
          needle_mover: t.needle_mover ?? false,
        })),
        todayEmergencies: todayEmergencies.map((e) => ({
          description: e.description,
          severity: e.severity,
          resolved: e.resolved,
        })),
      })

      const suggestedWins = result.suggestedWins.slice(0, 8).filter((s) => s.trim())
      const suggestedLessons = result.suggestedLessons.slice(0, 8).filter((s) => s.trim())

      let winHighlight: number[] = []
      let lessonHighlight: number[] = []
      let finalWins: string[] = []
      let finalLessons: string[] = []

      setWins((prev) => {
        const r = mergeAppendWinsLessons(prev, suggestedWins)
        winHighlight = r.highlight
        finalWins = r.final
        return r.final
      })
      setLessons((prev) => {
        const r = mergeAppendWinsLessons(prev, suggestedLessons)
        lessonHighlight = r.highlight
        finalLessons = r.final
        return r.final
      })

      const highlightWins = winHighlight.filter((i) => (finalWins[i] ?? '').trim().length > 0)
      const highlightLessons = lessonHighlight.filter((i) => (finalLessons[i] ?? '').trim().length > 0)

      const refl = result.suggestedReflection.trim()
      // Empty reflection: do not touch Daily synthesis (preserve prior dumps / manual edits).
      if (refl) {
        setJournal((prev) => (prev.trim() ? `${prev.trim()}\n\n${refl}` : refl))
      }

      const journalHighlight = Boolean(refl)
      const hadNewContent =
        journalHighlight || highlightWins.length > 0 || highlightLessons.length > 0
      if (hadNewContent) {
        setDumpSortHighlight({
          journal: journalHighlight,
          wins: highlightWins,
          lessons: highlightLessons,
        })
      } else {
        setDumpSortHighlight(null)
      }

      setBrainDump('')

      window.dispatchEvent(
        new CustomEvent('toast', {
          detail: {
            type: 'success',
            message: hadNewContent
              ? 'Sorted into your reflection and cards — review and edit below.'
              : 'Nothing new to add from this dump — your cards are unchanged.',
          },
        })
      )
      if (hadNewContent) {
        setSortLandingGlow(true)
        window.setTimeout(() => setSortLandingGlow(false), 2000)
        window.setTimeout(() => {
          const el = document.getElementById('evening-daily-synthesis')
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 50)
      }
    } catch (e) {
      console.error('[evening/sort-dump]', e)
      window.dispatchEvent(
        new CustomEvent('toast', {
          detail: {
            type: 'error',
            message:
              'Sorting failed. Your thoughts are still here—try the button again.',
          },
        })
      )
    } finally {
      setEveningDumpSorting(false)
    }
  }, [brainDump, fireFunnelStep, lessons, morningTasks, reviewDate, todayEmergencies, wins])

  // Show streaming errors in the coach message (only when not showing retry UI)
  useEffect(() => {
    if (streamingError && aiCoachTrigger === 'evening_after') {
      setAiCoachMessage(`[AI ERROR] ${streamingError}`)
    }
  }, [streamingError, aiCoachTrigger])

  // Clear isRetrying when stream completes (success or failure)
  useEffect(() => {
    if (isRetrying && !isStreaming) {
      setIsRetrying(false)
    }
  }, [isRetrying, isStreaming])

  /** First-ever evening only: reading overlay → completion modal when stream finishes. Returning users stay on inline insight (flow null). */
  useEffect(() => {
    if (eveningInsightFlow !== 'reading') return
    if (isStreaming) return
    if (streamingError && !isRetrying) {
      setEveningInsightFlow(null)
      eveningInsightPostSaveActiveRef.current = false
      return
    }
    if (!aiCoachMessage?.trim()) return
    if (aiCoachMessage.startsWith('[AI ERROR]') && !isRetrying) {
      setEveningInsightFlow(null)
      eveningInsightPostSaveActiveRef.current = false
      return
    }
    if (aiCoachMessage.startsWith('[AI ERROR]')) return
    setEveningInsightFlow('modal')
  }, [eveningInsightFlow, isStreaming, aiCoachMessage, streamingError, isRetrying])

  const handleRetryInsight = useCallback(async () => {
    const session = await getUserSession()
    if (!session?.user?.id) return
    const features = getFeatureAccess({ tier: session.user.tier, pro_features_enabled: session.user.pro_features_enabled })
    if (!features.dailyPostEveningPrompt) return

    eveningInsightPostSaveActiveRef.current = true
    setEveningInsightFlow(postEveningReadingOverlayRef.current ? 'reading' : null)
    setAiCoachMessage(null)
    setIsRetrying(true)
    const winsForApi = wins.filter((w) => w.trim()).length > 0 ? JSON.stringify(wins.filter((w) => w.trim())) : null
    const lessonsForApi = lessons.filter((l) => l.trim()).length > 0 ? JSON.stringify(lessons.filter((l) => l.trim())) : null
    try {
      await startStream(
        {
          promptType: 'post_evening',
          userId: session.user.id,
          promptDate: reviewDate,
          accessToken: session?.access_token,
          postEveningOverride: {
            todayReview: {
              wins: winsForApi,
              lessons: lessonsForApi,
              journal: journal.trim() || null,
              mood: mood ?? null,
              energy: energy ?? null,
            },
            todayPlan: morningTasks.map((t) => ({
              description: t.description,
              completed: t.completed,
              needle_mover: t.needle_mover ?? false,
            })),
            loopCloseContext: buildEveningLoopCloseContext(morningTasks, todayEmergencies),
          },
        },
        async (fullPrompt) => {
          setAiCoachMessage(fullPrompt)
          const { data: existing } = await supabase
            .from('personal_prompts')
            .select('id, generation_count')
            .eq('user_id', session.user.id)
            .eq('prompt_type', 'post_evening')
            .eq('prompt_date', reviewDate)
            .maybeSingle()
          const genCount = existing ? ((existing as { generation_count?: number }).generation_count ?? 1) + 1 : 1
          const { data: saved, error: upsertErr } = await supabase
            .from('personal_prompts')
            .upsert(
              {
                user_id: session.user.id,
                prompt_type: 'post_evening',
                prompt_date: reviewDate,
                prompt_text: fullPrompt,
                stage_context: null,
                generation_count: genCount,
                generated_at: new Date().toISOString(),
              },
              { onConflict: 'user_id,prompt_type,prompt_date' }
            )
            .select()
          let primaryFailed = !!upsertErr
          let fallbackFailed = false
          if (upsertErr) {
            const isRlsError =
              upsertErr?.message?.includes('row-level security') ||
              upsertErr?.message?.includes('policy') ||
              (upsertErr as { code?: string }).code === '42501'
            if (isRlsError && session.user.id) {
              const { data: { session: apiSession } } = await supabase.auth.getSession()
              const apiRes = await fetch('/api/insights/save', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  ...(apiSession?.access_token && { Authorization: `Bearer ${apiSession.access_token}` }),
                },
                credentials: 'include',
                body: JSON.stringify({
                  prompt_type: 'post_evening',
                  prompt_date: reviewDate,
                  prompt_text: fullPrompt,
                  generation_count: genCount,
                }),
              })
              const apiData = (await apiRes.json()) as { success?: boolean; id?: string; error?: string }
              if (apiRes.ok && apiData.success) {
                if (apiData.id) setEveningInsightId(apiData.id)
              } else fallbackFailed = true
            } else fallbackFailed = true
          }
          if (!primaryFailed) {
            const savedId = (saved as { id?: string }[])?.[0]?.id
            if (savedId) setEveningInsightId(savedId)
            window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Evening insight saved', type: 'success' } }))
          } else if (!fallbackFailed) {
            window.dispatchEvent(new CustomEvent('toast', {
              detail: { message: 'Insight taking longer than usual — it will appear shortly.', type: 'info' },
            }))
          } else {
            window.dispatchEvent(new CustomEvent('toast', {
              detail: { message: 'Failed to save evening insight. Please try again.', type: 'error' },
            }))
          }
        }
      )
    } catch (err) {
      console.error('[Evening] Retry insight failed:', err)
    }
  }, [wins, lessons, journal, mood, energy, morningTasks, todayEmergencies, reviewDate, startStream])

  // Sync reviewDate from ?date= or founder-day default (before 4am local = previous calendar day)
  const dateQuery = searchParams?.get('date') ?? ''
  useEffect(() => {
    const next =
      dateQuery && /^\d{4}-\d{2}-\d{2}$/.test(dateQuery)
        ? dateQuery
        : getEffectivePlanDate()
    setReviewDate(next)
  }, [dateQuery])

  useEffect(() => {
    setEveningInsightFlow(null)
    eveningInsightPostSaveActiveRef.current = false
  }, [reviewDate])

  // Auth check useEffect
  useEffect(() => {
    const checkAuth = async () => {
      const session = await getUserSession()
      if (!session) {
        router.push('/auth/login')
        return
      }
      setUserTier(session.user.tier || 'beta')
    }
    checkAuth()
  }, [router])

  useEffect(() => {
    postEveningStreamStartedRef.current = false
  }, [reviewDate])

  useEffect(() => {
    if (!reviewDate) return // Wait for reviewDate to be initialized
    const fetchTodayReviewAndTasks = async () => {
      setLoading(true) // Set loading to true here
      const session = await getUserSession()
      if (!session) {
        setLoading(false)
        return
      }

      const features = getFeatureAccess({ tier: session.user.tier, pro_features_enabled: session.user.pro_features_enabled })

      // Fetch Evening Review
      let { data: reviewData, error: reviewError } = await supabase
        .from('evening_reviews')
        .select('id, journal, brain_dump, mood, energy, wins, lessons, is_draft, is_day_complete')
        .eq('review_date', reviewDate)
        .eq('user_id', session.user.id) // Filter by user_id
        .maybeSingle()

      if (reviewError && isMissingEveningIsDayCompleteColumnError(reviewError)) {
        const retry = await supabase
          .from('evening_reviews')
          .select('id, journal, brain_dump, mood, energy, wins, lessons, is_draft')
          .eq('review_date', reviewDate)
          .eq('user_id', session.user.id)
          .maybeSingle()
        reviewData = retry.data as typeof reviewData
        reviewError = retry.error
      }

      if (reviewError && isMissingEveningBrainDumpColumnError(reviewError)) {
        const retry = await supabase
          .from('evening_reviews')
          .select('id, journal, mood, energy, wins, lessons, is_draft')
          .eq('review_date', reviewDate)
          .eq('user_id', session.user.id)
          .maybeSingle()
        reviewData = retry.data as typeof reviewData
        reviewError = retry.error
      }
      if (reviewError && isMissingEveningIsDraftColumnError(reviewError)) {
        const retry = await supabase
          .from('evening_reviews')
          .select('id, journal, brain_dump, mood, energy, wins, lessons')
          .eq('review_date', reviewDate)
          .eq('user_id', session.user.id)
          .maybeSingle()
        // Legacy DB without is_draft column — treat missing is_draft as submitted
        reviewData = retry.data as (typeof reviewData & { is_draft?: boolean }) | null
        reviewError = retry.error
      }
      if (reviewError && isMissingEveningBrainDumpColumnError(reviewError)) {
        const retry = await supabase
          .from('evening_reviews')
          .select('id, journal, mood, energy, wins, lessons')
          .eq('review_date', reviewDate)
          .eq('user_id', session.user.id)
          .maybeSingle()
        reviewData = retry.data as typeof reviewData
        reviewError = retry.error
      }
      
      // Fetch post_evening insight (Mrs. Deer)
      const [postEveningInsightRes] = await Promise.all([
        // Fetch post_evening insight for THIS EXACT DATE ONLY (no cross-day fallback)
        features.dailyPostEveningPrompt
          ? (async () => {
              console.log(`[Evening Page Load] Date: ${reviewDate}`)
              
              const { data, error } = await supabase
                .from('personal_prompts')
                .select('id, prompt_text, prompt_type, prompt_date, generated_at')
                .eq('user_id', session.user.id)
                .eq('prompt_type', 'post_evening')
                .eq('prompt_date', reviewDate)
                .order('generated_at', { ascending: false })
                .limit(1)
                .maybeSingle()

              console.log('🔍 Loading post_evening insight:', {
                user_id: session.user.id,
                prompt_type: 'post_evening',
                prompt_date: reviewDate,
                found: !!data,
                id: (data as { id?: string })?.id,
                error: error?.message,
              })
              if (error) {
                console.error(`[Evening Page Load] Error loading post_evening insight for ${reviewDate}:`, error)
              } else if (data) {
                console.log(`[Evening Page Load] Evening insight found for ${reviewDate}:`, (data as { prompt_text?: string }).prompt_text?.substring(0, 50))
              } else {
                console.log(`[Evening Page Load] No evening insight found for ${reviewDate}`)
              }
              
              return { data, error }
            })()
          : Promise.resolve({ data: null, error: null }),
      ])
      
      // Show evening insight ONLY when:
      // 1. User has submitted (non-draft) a review for this exact date
      // 2. An evening insight exists for this exact date
      // NO FALLBACKS - if no review or no insight for this date, show nothing
      const hasEveningReview = !!reviewData
      const hasSubmittedEveningReview =
        !!reviewData && (reviewData as { is_draft?: boolean }).is_draft !== true
      console.log(`[Evening Page Load] Has evening review for ${reviewDate}:`, hasEveningReview)
      
      let insightToShow = null
      if (postEveningInsightRes.error) {
        console.error(`[Evening Page Load] Error loading post_evening insight:`, postEveningInsightRes.error)
      }
      
      // STRICT: Only show if BOTH submitted review exists AND insight exists for this exact date
      if (hasSubmittedEveningReview && postEveningInsightRes.data?.prompt_text) {
        insightToShow = postEveningInsightRes.data.prompt_text
        console.log(`[Evening Page Load] Final insight displayed for ${reviewDate}`)
      } else {
        console.log(`[Evening Page Load] No insight displayed - review: ${hasSubmittedEveningReview}, insight: ${!!postEveningInsightRes.data?.prompt_text}`)
      }
      
      if (insightToShow) {
        setAiCoachMessage(insightToShow)
        setAiCoachTrigger('evening_after')
        const row = postEveningInsightRes.data as { id?: string }
        if (row?.id) setEveningInsightId(row.id)
      } else {
        setAiCoachMessage(null)
        setAiCoachTrigger(null)
        setEveningInsightId(null)
      }

      // Check for pattern-based Mrs. Deer feedback (3+ mentions of same theme in last 14 days)
      checkPatternDetection()

      trackEvent('evening_page_view', { has_existing_review: !!reviewData, review_date: reviewDate })
      trackJourneyStep('viewed_evening', { has_existing_review: !!reviewData })
      fireFunnelStep(1, 'evening_page_view')

      if (reviewError) {
        setError(reviewError.message) // Display error
        eveningRowWasSubmittedRef.current = false
        setIsDayComplete(false)
      } else if (reviewData) {
        setCurrentReviewId((reviewData as { id?: string }).id ?? null)
        eveningRowWasSubmittedRef.current = (reviewData as { is_draft?: boolean }).is_draft !== true
        setIsDayComplete(Boolean((reviewData as { is_day_complete?: boolean }).is_day_complete))
        setJournal(reviewData.journal ?? '')
        setBrainDump(
          typeof (reviewData as { brain_dump?: unknown }).brain_dump === 'string'
            ? (reviewData as { brain_dump: string }).brain_dump
            : ''
        )
        setMood(reviewData.mood ?? null)
        setEnergy(reviewData.energy ?? null)
        
        // Parse wins: try JSON array first, fallback to string (old format)
        const winsData = reviewData.wins
        if (!winsData) {
          setWins([''])
        } else if (typeof winsData === 'string') {
          try {
            const parsed = JSON.parse(winsData)
            setWins(Array.isArray(parsed) && parsed.length > 0 ? parsed : [''])
          } catch {
            // Old format: single string, convert to array
            setWins(winsData.trim() ? [winsData] : [''])
          }
        } else {
          setWins([''])
        }
        
        // Parse lessons: try JSON array first, fallback to string (old format)
        const lessonsData = reviewData.lessons
        if (!lessonsData) {
          setLessons([''])
        } else if (typeof lessonsData === 'string') {
          try {
            const parsed = JSON.parse(lessonsData)
            setLessons(Array.isArray(parsed) && parsed.length > 0 ? parsed : [''])
          } catch {
            // Old format: single string, convert to array
            setLessons(lessonsData.trim() ? [lessonsData] : [''])
          }
        } else {
          setLessons([''])
        }
      } else {
        setCurrentReviewId(null)
        eveningRowWasSubmittedRef.current = false
        setIsDayComplete(false)
        setJournal('')
        setBrainDump('')
        setMood(null)
        setEnergy(null)
        setWins([''])
        setLessons([''])
      }

      const { data: profileForEveningTasks } = await supabase
        .from('user_profiles')
        .select('timezone')
        .eq('id', session.user.id)
        .maybeSingle()
      const eveningTz = getUserTimezoneFromProfile(profileForEveningTasks as { timezone?: string | null } | null)
      const eveningTaskFilter = morningTasksOrFilterForPlanDate(reviewDate, eveningTz)

      const { data: tasksData, error: tasksError } = await supabase
        .from('morning_tasks')
        .select('*')
        .eq('user_id', session.user.id)
        .or(eveningTaskFilter)
        .order('task_order', { ascending: true })

      if (tasksError) {
        setError(tasksError.message)
        setMorningTasks([])
      } else if (tasksData) {
        setMorningTasks(
          tasksData.map((t) => {
            const row = t as {
              id: string
              description?: string
              completed?: boolean
              needle_mover?: boolean
              plan_date: string
              postponed_from_plan_date?: string | null
            }
            return {
              id: row.id,
              description: row.description ?? '',
              completed: row.completed ?? false,
              needle_mover: row.needle_mover ?? false,
              movedToTomorrow: isTaskShowingAsMovedToTomorrow(reviewDate, eveningTz, row),
            }
          })
        )
      } else {
        setMorningTasks([])
      }

      const { data: emRows, error: emErr } = await supabase
        .from('emergencies')
        .select('id, description, severity, resolved')
        .eq('user_id', session.user.id)
        .eq('fire_date', reviewDate)
        .order('created_at', { ascending: false })

      if (emErr) {
        console.error('[evening] emergencies fetch', emErr)
        setTodayEmergencies([])
        hadEmergencyRef.current = false
      } else {
        const mapped = (emRows ?? []).map((row) => {
          const r = row as {
            id: string
            description?: string | null
            severity?: string | null
            resolved?: boolean | null
          }
          const sev = r.severity === 'hot' || r.severity === 'warm' || r.severity === 'contained' ? r.severity : 'warm'
          return {
            id: r.id,
            description: typeof r.description === 'string' ? r.description : '',
            severity: sev,
            resolved: !!r.resolved,
          } as EveningEmergencyRow
        })
        setTodayEmergencies(mapped)
        hadEmergencyRef.current = mapped.length > 0
      }

      try {
        const ctxRes = await fetch(
          `/api/evening/context?date=${encodeURIComponent(reviewDate)}`,
          { credentials: 'include' }
        )
        if (ctxRes.ok) {
          const ctx = (await ctxRes.json()) as {
            resolvedToday?: unknown[]
            tomorrowTaskDebtCount?: number
          }
          setEveningCrisisContext({
            resolvedCount: Array.isArray(ctx.resolvedToday) ? ctx.resolvedToday.length : 0,
            tomorrowDebt: typeof ctx.tomorrowTaskDebtCount === 'number' ? ctx.tomorrowTaskDebtCount : 0,
          })
        }
      } catch {
        // best-effort
      }

      setLoading(false)
    }

    fetchTodayReviewAndTasks()
  }, [reviewDate, checkPatternDetection, fireFunnelStep, retryTrigger])

  const fetchMonthStatus = useCallback(async (month: Date) => {
    const session = await getUserSession()
    if (!session) return
    const monthStr = format(month, 'yyyy-MM')
    const res = await fetch(`/api/user/month-status?month=${monthStr}`, { credentials: 'include' })
    if (res.ok) {
      const data = (await res.json()) as Record<string, DayStatus>
      setMonthStatus(data)
    }
  }, [])

  useEffect(() => {
    if (!reviewDate) return
    const month = startOfMonth(new Date(reviewDate + 'T12:00:00'))
    fetchMonthStatus(month)
  }, [reviewDate, fetchMonthStatus])

  const showMicroLessonToast = useCallback(async (fallback: string, type: 'success' | 'info' = 'success') => {
    try {
      const headers = await getClientAuthHeaders()
      const res = await fetch('/api/micro-lesson?location=evening', { credentials: 'include', headers })
      const json = await res.json()
      const msg = (json?.lesson?.message as string | undefined) ?? fallback
      window.dispatchEvent(new CustomEvent('toast', { detail: { message: msg, type } }))
    } catch {
      window.dispatchEvent(new CustomEvent('toast', { detail: { message: fallback, type } }))
    }
  }, [])

  const toggleTaskCompleted = async (taskId: string, currentCompleted: boolean) => {
    const session = await getUserSession()
    if (!session) {
      setError('User not authenticated. Please log in.')
      return
    }

    const { error: updateError } = await supabase
      .from('morning_tasks')
      .update({ completed: !currentCompleted, updated_at: new Date().toISOString() })
      .eq('id', taskId)
      .eq('user_id', session.user.id)

    if (updateError) {
      if (updateError.message?.includes('completed') && updateError.message?.includes('does not exist')) {
        setError('Add the completed column first: run migration 008 in Supabase SQL Editor.')
      } else {
        setError(updateError.message)
      }
      return
    }
    setError(null)
    setMorningTasks((prev) =>
      prev.map((task) =>
        task.id === taskId ? { ...task, completed: !currentCompleted } : task
      )
    )
    if (!currentCompleted) {
      setJustCompletedId(taskId)
      setTimeout(() => setJustCompletedId(null), 1500)
      void showMicroLessonToast("Task done. That's one brick in the wall you're building.")
      const task = morningTasks.find((t) => t.id === taskId)
      fetch('/api/analytics/feature-usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feature_name: 'task_completion',
          action: 'complete',
          page: '/evening',
          metadata: task ? { is_needle_mover: !!(task as { needle_mover?: boolean }).needle_mover } : undefined,
        }),
      }).catch(() => {})
    }
  }

  const handleMoveTaskToTomorrow = async (task: Task): Promise<boolean> => {
    const originalTasks = morningTasks
    const updated = morningTasks.map((t) =>
      t.id === task.id ? { ...t, movedToTomorrow: true } : t
    )
    setMorningTasks(updated)

    try {
      const res = await fetch('/api/tasks/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ taskId: task.id, targetDate: 'tomorrow' }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Failed to move task')
      }
      setRetryTrigger((x) => x + 1)
      void flushEveningDraftRef.current()
      return true
    } catch (err) {
      console.error('[Evening] move-to-tomorrow error', err)
      setMorningTasks(originalTasks)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('toast', {
            detail: {
              message: 'Could not move task. Please try again.',
              type: 'error',
            },
          })
        )
      }
      return false
    }
  }

  const handleUndoMoveTask = async (task: Task) => {
    const originalTasks = morningTasks
    const restored = morningTasks.map((t) =>
      t.id === task.id ? { ...t, movedToTomorrow: false } : t
    )
    setMorningTasks(restored)

    try {
      const res = await fetch('/api/tasks/undo-move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ taskId: task.id }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Failed to undo move')
      }
      setRetryTrigger((x) => x + 1)
      void flushEveningDraftRef.current()
    } catch (err) {
      console.error('[Evening] undo-move error', err)
      setMorningTasks(originalTasks)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('toast', {
            detail: {
              message: 'Could not undo move. Please try again.',
              type: 'error',
            },
          })
        )
      }
    }
  }

  const handleSnoozeModalConfirm = async () => {
    const t = snoozeTaskQueue[0]
    if (!t) {
      setSnoozeModalOpen(false)
      return
    }
    const ok = await handleMoveTaskToTomorrow(t)
    if (!ok) return
    setSnoozeTaskQueue((prev) => {
      const next = prev.slice(1)
      if (next.length === 0) setSnoozeModalOpen(false)
      return next
    })
  }

  const handleSnoozeModalSkip = () => {
    setSnoozeTaskQueue((prev) => {
      const next = prev.slice(1)
      if (next.length === 0) setSnoozeModalOpen(false)
      return next
    })
  }

  const handleDeleteWinConfirm = async () => {
    const index = confirmDeleteWin
    if (index === null || index < 0 || index >= wins.length) return
    setConfirmDeleteWin(null)

    const newWins = wins.filter((_, i) => i !== index)
    const winsToSave = newWins.length > 0 ? newWins : ['']
    setWins(winsToSave)

    const session = await getUserSession()
    if (!session) return

    const winsFiltered = winsToSave.filter((w) => w.trim()).length > 0
      ? JSON.stringify(winsToSave.filter((w) => w.trim()))
      : null

    const runWinUpdate = () =>
      supabase
        .from('evening_reviews')
        .update({ wins: winsFiltered })
        .eq('review_date', reviewDate)
        .eq('user_id', session.user.id)

    let { error: updateError } = await runWinUpdate()
    if (updateError && isRlsOrAuthPermissionError(updateError)) {
      const again = await refreshSessionForWrite()
      if (again.ok) ({ error: updateError } = await runWinUpdate())
    }

    if (updateError) {
      window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Failed to delete win. Please try again.', type: 'error' } }))
      setWins(wins) // Revert on error
    }
  }

  const handleDeleteLessonConfirm = async () => {
    const index = confirmDeleteLesson
    if (index === null || index < 0 || index >= lessons.length) return
    setConfirmDeleteLesson(null)

    const newLessons = lessons.filter((_, i) => i !== index)
    const lessonsToSave = newLessons.length > 0 ? newLessons : ['']
    setLessons(lessonsToSave)

    const session = await getUserSession()
    if (!session) return

    const lessonsFiltered = lessonsToSave.filter((l) => l.trim()).length > 0
      ? JSON.stringify(lessonsToSave.filter((l) => l.trim()))
      : null

    const runLessonUpdate = () =>
      supabase
        .from('evening_reviews')
        .update({ lessons: lessonsFiltered })
        .eq('review_date', reviewDate)
        .eq('user_id', session.user.id)

    let { error: updateError } = await runLessonUpdate()
    if (updateError && isRlsOrAuthPermissionError(updateError)) {
      const again = await refreshSessionForWrite()
      if (again.ok) ({ error: updateError } = await runLessonUpdate())
    }

    if (updateError) {
      window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Failed to delete lesson. Please try again.', type: 'error' } }))
      setLessons(lessons) // Revert on error
    }
  }

  const handleSave = async (opts?: { targetReviewDate?: string }) => {
    setSaving(true)
    setError(null)

    const session = await getUserSession()
    if (!session) {
      setError('User not authenticated. Please log in.')
      setSaving(false)
      router.push('/auth/login') // Redirect if session is lost during save
      return
    }

    const writeAuth = await refreshSessionForWrite()
    if (!writeAuth.ok) {
      setError(writeAuth.message)
      setSaving(false)
      window.dispatchEvent(new CustomEvent('toast', { detail: { message: writeAuth.message, type: 'error' } }))
      router.push('/auth/login')
      return
    }

    let didSaveSucceed = false
    try {
      let suppressGenericEveningCelebration = false
      const awareness = getTimeAwareness()
      const now = new Date()
      const calendarTodayStr = format(now, 'yyyy-MM-dd')
      const saveReviewDate = opts?.targetReviewDate ?? reviewDate
      const yesterdayStr = format(subDays(parseISO(`${calendarTodayStr}T12:00:00`), 1), 'yyyy-MM-dd')

      // Late night / morning catchup: only on the calendar-"today" page (not when URL/state is already yesterday).
      // Skip when saving to an explicit target (e.g. user chose "Yesterday" in the popup — avoids stale state + double popup).
      if (
        !opts?.targetReviewDate &&
        saveReviewDate === calendarTodayStr &&
        (awareness.phase === 'late_night' || awareness.phase === 'morning_catchup')
      ) {
        let variantType: 'late_night_choice' | 'late_night_yesterday_exists' | 'morning_catchup' =
          awareness.phase === 'late_night' ? 'late_night_choice' : 'morning_catchup'
        if (awareness.phase === 'late_night') {
          const { data: yesterdayReview } = await supabase
            .from('evening_reviews')
            .select('id')
            .eq('user_id', session.user.id)
            .eq('review_date', yesterdayStr)
            .maybeSingle()
          if (yesterdayReview) variantType = 'late_night_yesterday_exists'
        }
        setReflectionPopupVariant({ context: 'evening', type: variantType })
        setShowReflectionPopup(true)
        setSaving(false)
        return
      }

      let beforeEveningRes = await supabase
        .from('evening_reviews')
        .select('review_date')
        .eq('user_id', session.user.id)
        .eq('is_draft', false)
      if (beforeEveningRes.error && isMissingEveningIsDraftColumnError(beforeEveningRes.error)) {
        beforeEveningRes = await supabase
          .from('evening_reviews')
          .select('review_date')
          .eq('user_id', session.user.id)
      }
      const beforeEveningRows = beforeEveningRes.data

      const eveningDatesBefore = new Set(
        (beforeEveningRows ?? [])
          .map((r) => r.review_date)
          .filter((d): d is string => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d))
      )
      const isFirstEverEvening = eveningDatesBefore.size === 0
      const hadReviewForThisDate = eveningDatesBefore.has(saveReviewDate)

      const winsFiltered = wins.filter((w) => w.trim()).length > 0
        ? JSON.stringify(wins.filter((w) => w.trim()))
        : null
      const lessonsFiltered = lessons.filter((l) => l.trim()).length > 0
        ? JSON.stringify(lessons.filter((l) => l.trim()))
        : null

      const persistEveningReview = async (
        includeDraftCol: boolean,
        includeBrainDumpCol: boolean,
        includeDayCompleteCol: boolean
      ) =>
        supabase
          .from('evening_reviews')
          .upsert(
            {
              user_id: session.user.id,
              review_date: saveReviewDate,
              journal: journal.trim() || null,
              ...(includeBrainDumpCol ? { brain_dump: brainDump.trim() || null } : {}),
              mood: mood ?? null,
              energy: energy ?? null,
              wins: winsFiltered,
              lessons: lessonsFiltered,
              had_emergency: hadEmergencyRef.current,
              ...(includeDraftCol ? { is_draft: false } : {}),
              ...(includeDayCompleteCol ? { is_day_complete: true } : {}),
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id,review_date' }
          )
          .select('id')
          .maybeSingle()

      let includeBrainUpsert = true
      let includeDraftUpsert = true
      let includeDayCompleteUpsert = true
      let { error: insertError, data: eveningUpsertRow } = await persistEveningReview(
        includeDraftUpsert,
        includeBrainUpsert,
        includeDayCompleteUpsert
      )
      if (insertError && isMissingEveningBrainDumpColumnError(insertError)) {
        includeBrainUpsert = false
        ;({ error: insertError, data: eveningUpsertRow } = await persistEveningReview(
          includeDraftUpsert,
          includeBrainUpsert,
          includeDayCompleteUpsert
        ))
      }
      if (insertError && isMissingEveningIsDraftColumnError(insertError)) {
        includeDraftUpsert = false
        ;({ error: insertError, data: eveningUpsertRow } = await persistEveningReview(
          includeDraftUpsert,
          includeBrainUpsert,
          includeDayCompleteUpsert
        ))
      }
      if (insertError && isMissingEveningIsDayCompleteColumnError(insertError)) {
        includeDayCompleteUpsert = false
        ;({ error: insertError, data: eveningUpsertRow } = await persistEveningReview(
          includeDraftUpsert,
          includeBrainUpsert,
          includeDayCompleteUpsert
        ))
      }
      if (insertError && isRlsOrAuthPermissionError(insertError)) {
        const again = await refreshSessionForWrite()
        if (again.ok) {
          ;({ error: insertError, data: eveningUpsertRow } = await persistEveningReview(
            includeDraftUpsert,
            includeBrainUpsert,
            includeDayCompleteUpsert
          ))
          if (insertError && isMissingEveningBrainDumpColumnError(insertError)) {
            includeBrainUpsert = false
            ;({ error: insertError, data: eveningUpsertRow } = await persistEveningReview(
              includeDraftUpsert,
              includeBrainUpsert,
              includeDayCompleteUpsert
            ))
          }
          if (insertError && isMissingEveningIsDraftColumnError(insertError)) {
            includeDraftUpsert = false
            ;({ error: insertError, data: eveningUpsertRow } = await persistEveningReview(
              includeDraftUpsert,
              includeBrainUpsert,
              includeDayCompleteUpsert
            ))
          }
          if (insertError && isMissingEveningIsDayCompleteColumnError(insertError)) {
            includeDayCompleteUpsert = false
            ;({ error: insertError, data: eveningUpsertRow } = await persistEveningReview(
              includeDraftUpsert,
              includeBrainUpsert,
              includeDayCompleteUpsert
            ))
          }
        }
      }

      if (insertError) throw insertError

      eveningRowWasSubmittedRef.current = true
      setIsDayComplete(includeDayCompleteUpsert)
      didSaveSucceed = true
      const newId = (eveningUpsertRow as { id?: string } | null)?.id
      if (newId) setCurrentReviewId(newId)

      if (opts?.targetReviewDate) {
        setReviewDate(opts.targetReviewDate)
        router.replace(`/evening?date=${encodeURIComponent(opts.targetReviewDate)}`, { scroll: false })
      }

      const eveningDistinctAfterSave = hadReviewForThisDate ? eveningDatesBefore.size : eveningDatesBefore.size + 1
      if (
        eveningDistinctAfterSave >= 1 &&
        eveningDistinctAfterSave <= 6 &&
        typeof window !== 'undefined'
      ) {
        const msg = getEveningMicroCelebrationMessage(eveningDistinctAfterSave)
        const storageKey = eveningMicroCelebrationStorageKey(session.user.id, eveningDistinctAfterSave)
        if (msg && !window.localStorage.getItem(storageKey)) {
          window.localStorage.setItem(storageKey, '1')
          window.dispatchEvent(new CustomEvent('toast', { detail: { message: msg, type: 'success' } }))
          suppressGenericEveningCelebration = true
        }
      }

      // Best-effort trigger for first full loop celebration email.
      fetch('/api/email/first-full-loop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reviewDate: saveReviewDate }),
      }).catch(() => {})

      // Best-effort: force founder journey evaluation immediately after evening save
      // so unlocks/badges persist without waiting for a later dashboard/journey fetch.
      void getClientAuthHeaders().then((auth) =>
        fetch('/api/founder-dna/journey', {
          method: 'GET',
          credentials: 'include',
          headers: auth,
        }).catch(() => {})
      )

      const tomorrowPlanDate = format(addDays(parseISO(`${saveReviewDate}T12:00:00`), 1), 'yyyy-MM-dd')
      fetch('/api/user/morning-plan-autosave/prebake-decision-strategies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          planDate: tomorrowPlanDate,
          eveningReviewDate: saveReviewDate,
          mood: mood ?? null,
          energy: energy ?? null,
          wins: wins.map((w) => w.trim()).filter(Boolean),
          lessons: lessons.map((l) => l.trim()).filter(Boolean),
          journal: journal.trim() || null,
        }),
      }).catch(() => {})

      fireFunnelStep(3, 'review_complete')
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('data-sync-request'))
      }
      if (typeof window !== 'undefined') {
        const recorder = (window as unknown as { __microLessonRecordCompletedEvening?: () => void }).__microLessonRecordCompletedEvening
        if (typeof recorder === 'function') {
          recorder()
        }
      }
      if (!suppressGenericEveningCelebration) {
        window.dispatchEvent(
          new CustomEvent('toast', {
            detail: { message: 'Reflection complete. Your consistency is shaping your story.', type: 'info' },
          })
        )
      }

      const snoozeCandidates = getPendingTasksForSnoozePrompt(
        morningTasks,
        wins.map((w) => w.trim()).filter(Boolean),
        lessons.map((l) => l.trim()).filter(Boolean)
      )
      if (snoozeCandidates.length > 0) {
        setSnoozeTaskQueue(snoozeCandidates)
        setSnoozeModalOpen(true)
      }

      trackEvent('evening_review_saved', {
        review_date: saveReviewDate,
        mood: mood ?? undefined,
        energy: energy ?? undefined,
        has_wins: wins.some((w) => w.trim()),
        has_lessons: lessons.some((l) => l.trim()),
        has_journal: !!journal.trim(),
        had_emergency: hadEmergencyRef.current,
      })
      // Founder analytics: enqueue pattern extraction from journal + wins + lessons
      const reflectionText = [journal.trim(), ...wins.filter((w) => w.trim()), ...lessons.filter((l) => l.trim())].filter(Boolean).join('\n')
      if (reflectionText) {
        fetch('/api/analytics/enqueue-patterns', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source_table: 'evening_reviews',
            source_id: saveReviewDate,
            content: reflectionText,
          }),
        }).catch(() => {})
      }
      // Founder analytics: feature usage
      fetch('/api/analytics/feature-usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feature_name: 'evening_review',
          action: 'save',
          page: '/evening',
          metadata: { mood: mood ?? undefined, energy: energy ?? undefined },
        }),
      }).catch(() => {})
      trackJourneyStep('saved_evening', { mood: mood ?? undefined, energy: energy ?? undefined })

      // Trigger post-evening reflection insight AND next day's morning prompt (Pro only)
      const features = getFeatureAccess({ tier: session.user.tier, pro_features_enabled: session.user.pro_features_enabled })

      if (features.dailyPostEveningPrompt) {
        eveningInsightPostSaveActiveRef.current = true
        postEveningReadingOverlayRef.current = isFirstEverEvening
        setEveningFirstGlimpseBadge(isFirstEverEvening)
        setEveningInsightFlow(isFirstEverEvening ? 'reading' : null)
        setAiCoachTrigger('evening_after')
        setAiCoachMessage(null)
        setTimeout(() => {
          void (async () => {
            try {
              postEveningStreamStartedRef.current = true
              const winsForApi = wins.filter((w) => w.trim()).length > 0 ? JSON.stringify(wins.filter((w) => w.trim())) : null
              const lessonsForApi = lessons.filter((l) => l.trim()).length > 0 ? JSON.stringify(lessons.filter((l) => l.trim())) : null
              console.log('🔵 STEP 1: Evening review saved, starting post_evening stream...')
              await startStream(
                {
                  promptType: 'post_evening',
                  userId: session.user.id,
                  promptDate: saveReviewDate,
                  accessToken: session?.access_token,
                  postEveningOverride: {
                    todayReview: {
                      wins: winsForApi,
                      lessons: lessonsForApi,
                      journal: journal.trim() || null,
                      mood: mood ?? null,
                      energy: energy ?? null,
                    },
                    todayPlan: morningTasks.map((t) => ({
                      description: t.description,
                      completed: t.completed,
                      needle_mover: t.needle_mover ?? false,
                    })),
                    loopCloseContext: buildEveningLoopCloseContext(morningTasks, todayEmergencies),
                  },
                },
                async (fullPrompt) => {
              setAiCoachMessage(fullPrompt)
              const { data: existing } = await supabase
                .from('personal_prompts')
                .select('id, generation_count')
                .eq('user_id', session.user.id)
                .eq('prompt_type', 'post_evening')
                .eq('prompt_date', saveReviewDate)
                .maybeSingle()

              const genCount = existing ? ((existing as { generation_count?: number }).generation_count ?? 1) + 1 : 1

              const { data: saved, error: upsertErr } = await supabase
                .from('personal_prompts')
                .upsert(
                  {
                    user_id: session.user.id,
                    prompt_type: 'post_evening',
                    prompt_date: saveReviewDate,
                    prompt_text: fullPrompt,
                    stage_context: null,
                    generation_count: genCount,
                    generated_at: new Date().toISOString(),
                  },
                  { onConflict: 'user_id,prompt_type,prompt_date' }
                )
                .select()

              let primaryFailed = !!upsertErr
              let fallbackFailed = false

              if (upsertErr) {
                const hasMessage =
                  typeof (upsertErr as { message?: string }).message === 'string' &&
                  !!(upsertErr as { message?: string }).message
                if (hasMessage) {
                  console.error('❌ Post-evening insight save failed (will try API fallback):', upsertErr)
                  trackErrorSync(new Error(`Post-evening insight save failed: ${(upsertErr as { message?: string }).message}`), {
                    component: 'evening',
                    action: 'save_insight',
                    severity: 'medium',
                    metadata: { code: (upsertErr as { code?: string }).code, reviewDate: saveReviewDate, promptType: 'post_evening' },
                    userId: session.user.id,
                  })
                }
                const isRlsError =
                  upsertErr?.message?.includes('row-level security') ||
                  upsertErr?.message?.includes('policy') ||
                  (upsertErr as { code?: string }).code === '42501'
                if (isRlsError && session.user.id) {
                  const { data: { session: apiSession } } = await supabase.auth.getSession()
                  const apiRes = await fetch('/api/insights/save', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      ...(apiSession?.access_token && { Authorization: `Bearer ${apiSession.access_token}` }),
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                      prompt_type: 'post_evening',
                      prompt_date: saveReviewDate,
                      prompt_text: fullPrompt,
                      generation_count: genCount,
                    }),
                  })
                  const apiData = (await apiRes.json()) as { success?: boolean; id?: string; error?: string }
                  if (apiRes.ok && apiData.success) {
                    if (apiData.id) setEveningInsightId(apiData.id)
                  } else {
                    fallbackFailed = true
                    console.error('❌ [INSIGHT SAVE] Evening API fallback failed:', apiData.error)
                  }
                } else {
                  fallbackFailed = true
                }
              }

              if (!primaryFailed) {
                const savedId = (saved as { id?: string }[])?.[0]?.id
                if (savedId) setEveningInsightId(savedId)
                window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Evening insight saved', type: 'success' } }))
              } else if (!fallbackFailed) {
                window.dispatchEvent(new CustomEvent('toast', {
                  detail: { message: 'Insight taking longer than usual — it will appear shortly.', type: 'info' },
                }))
              } else {
                window.dispatchEvent(new CustomEvent('toast', {
                  detail: { message: 'Failed to save evening insight. Please try again.', type: 'error' },
                }))
              }
            }
          )
            } catch (error) {
              console.error('🔵 STEP FAIL: Exception streaming post-evening insight:', error)
            }
            // Generate next day's morning prompt (invitation to plan — shown before user saves morning plan)
            try {
          const nextDay = tomorrowPlanDate
          console.log('🔵 STEP 6: Calling morning insight API for next day:', nextDay)
          const signedHeaders = await import('@/lib/api-client').then((m) => m.getSignedHeadersCached(session?.access_token))
          const morningRes = await fetch('/api/personal-coaching', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(session?.access_token && { Authorization: `Bearer ${session.access_token}` }),
              ...signedHeaders,
            },
            body: JSON.stringify({
              promptType: 'morning',
              userId: session.user.id,
              promptDate: nextDay,
              morningOverride: {
                yesterdayReview: {
                  wins: winsFiltered,
                  lessons: lessonsFiltered,
                  journal: journal.trim() || null,
                  mood: mood ?? null,
                  energy: energy ?? null,
                },
              },
            }),
          })
          console.log('🔵 STEP 7: Morning API response status:', morningRes.status)
          const morningData = await morningRes.json().catch(() => ({}))
          console.log('🔵 STEP 8: Morning API response:', { hasPrompt: !!morningData.prompt, hasError: !!morningData.error })
          if (morningRes.ok && morningData.prompt) {
            console.log('🔵 STEP 9: Morning insight received, length:', morningData.prompt.length)

            const { data: existingMorning } = await supabase
              .from('personal_prompts')
              .select('id, generation_count')
              .eq('user_id', session.user.id)
              .eq('prompt_type', 'morning')
              .eq('prompt_date', nextDay)
              .maybeSingle()

            const morningGenCount = existingMorning ? ((existingMorning as { generation_count?: number }).generation_count ?? 1) + 1 : 1

            const { data: morningSaved, error: morningUpsertErr } = await supabase
              .from('personal_prompts')
              .upsert(
                {
                  user_id: session.user.id,
                  prompt_type: 'morning',
                  prompt_date: nextDay,
                  prompt_text: morningData.prompt,
                  stage_context: null,
                  generation_count: morningGenCount,
                  generated_at: new Date().toISOString(),
                },
                { onConflict: 'user_id,prompt_type,prompt_date' }
              )
              .select()

            let morningPrimaryFailed = !!morningUpsertErr
            let morningFallbackFailed = false

            if (morningUpsertErr) {
              const hasMessage =
                typeof (morningUpsertErr as { message?: string }).message === 'string' &&
                !!(morningUpsertErr as { message?: string }).message
              if (hasMessage) {
                console.error('❌ Morning insight save failed (will try API fallback):', morningUpsertErr)
              }
              trackErrorSync(new Error(`Morning insight save failed: ${morningUpsertErr.message}`), {
                component: 'evening',
                action: 'save_morning_insight',
                severity: 'medium',
                metadata: { planDate: nextDay, code: (morningUpsertErr as { code?: string }).code },
              })
              const isRlsError =
                morningUpsertErr?.message?.includes('row-level security') ||
                morningUpsertErr?.message?.includes('policy') ||
                (morningUpsertErr as { code?: string }).code === '42501'
              if (isRlsError) {
                const { data: { session: apiSession } } = await supabase.auth.getSession()
                const apiRes = await fetch('/api/insights/save', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    ...(apiSession?.access_token && { Authorization: `Bearer ${apiSession.access_token}` }),
                  },
                  credentials: 'include',
                  body: JSON.stringify({
                    prompt_type: 'morning',
                    prompt_date: nextDay,
                    prompt_text: morningData.prompt,
                    generation_count: morningGenCount,
                  }),
                })
                const apiData = (await apiRes.json()) as { success?: boolean; id?: string; error?: string }
                if (apiRes.ok && apiData.success) {
                  // Fallback succeeded — no error toast
                } else {
                  morningFallbackFailed = true
                  console.error('❌ [INSIGHT SAVE] Morning API fallback failed:', apiData.error)
                }
              } else {
                morningFallbackFailed = true
              }
            }

            if (!morningPrimaryFailed) {
              console.log('✅ Morning insight SAVED for', nextDay, 'id:', (morningSaved as { id?: string }[])?.[0]?.id)
              window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Morning insight saved for tomorrow', type: 'success' } }))
            } else if (!morningFallbackFailed) {
              window.dispatchEvent(new CustomEvent('toast', {
                detail: { message: 'Insight taking longer than usual — it will appear shortly.', type: 'info' },
              }))
            } else {
              window.dispatchEvent(new CustomEvent('toast', {
                detail: { message: 'Failed to save morning insight. Please try again.', type: 'error' },
              }))
            }
          } else if (morningData?.aiError) {
            console.error('🔵 STEP 9 FAIL: Morning AI error:', morningData.error, 'model:', morningData.model, 'status:', morningData.status)
          } else {
            console.error('🔵 STEP 9 FAIL: Morning prompt failed:', morningRes.status, morningData?.error || morningData)
          }
            } catch (error) {
              console.error('🔵 STEP FAIL: Exception generating morning prompt:', error)
            }
          })()
        }, 0)
      } else {
        console.log('🔵 SKIP: dailyPostEveningPrompt not enabled for user tier:', session.user.tier)
      }

      if (isFirstEverEvening && typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('toast', {
            detail: {
              message: 'First evening reflection saved — see you in the morning.',
              type: 'success',
            },
          })
        )
      }

      // Fire-and-forget: generate tomorrow's decision suggestions from patterns + profile
      fetch('/api/suggestions/generate-for-tomorrow', {
        method: 'POST',
        credentials: 'include',
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      }).catch(() => {})

      // Check for Mrs. Deer pattern feedback after saving (new reflection may trigger pattern)
      checkPatternDetection()

      if (saveReviewDate === getEffectivePlanDate()) {
        const streakData = await calculateStreak(session.user.id)
        if (isStreakMilestone(streakData.currentStreak)) {
          const milestoneKey = `streak_milestone_shown_${streakData.currentStreak}_${saveReviewDate}`
          if (typeof window !== 'undefined' && window.localStorage.getItem(milestoneKey) !== 'true') {
            window.localStorage.setItem(milestoneKey, 'true')
            window.dispatchEvent(
              new CustomEvent('toast', {
                detail: {
                  message: `${streakData.currentStreak}-day streak. Keep the rhythm going.`,
                  type: 'success',
                },
              })
            )
          }
        }
        setError(null)
      } else {
        setError(null)
      }
    } catch (err) {
      const e = err as { code?: string; message?: string; details?: string; hint?: string }
      if (e?.code || e?.details) {
        console.error('[evening/save] evening_reviews upsert failed', {
          code: e.code,
          message: e.message,
          details: e.details,
          hint: e.hint,
        })
      } else {
        console.error('[evening/save]', err)
      }
      setError(err instanceof Error ? err.message : 'Failed to save. Please try again.')
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('toast', {
            detail: {
              message: "Couldn't close the loop. Check your connection.",
              type: 'error',
            },
          })
        )
      }
    } finally {
      setSaving(false)
      if (
        didSaveSucceed &&
        typeof window !== 'undefined' &&
        !eveningInsightPostSaveActiveRef.current
      ) {
        window.setTimeout(() => {
          document.getElementById('evening-daily-synthesis')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 80)
      }
    }
  }

  eveningSnapshotRef.current = { journal, brainDump, wins, lessons, mood, energy }

  useEffect(() => {
    if (loading || !reviewDate) return
    scheduleEveningDraftRef.current()
  }, [journal, brainDump, mood, energy, wins, lessons, loading, reviewDate])

  useEffect(() => {
    if (draftSaveStatus !== 'saved') return
    const t = window.setTimeout(() => setDraftSaveStatus('idle'), 2200)
    return () => window.clearTimeout(t)
  }, [draftSaveStatus])

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 md:px-5 py-8">
        <LoadingWithMicroLesson
          message="Reflecting on your day..."
          onRetry={() => setRetryTrigger((t) => t + 1)}
          timeoutMs={8000}
          location="evening"
        />
      </div>
    )
  }

  const minEveningDateStr = format(subDays(new Date(), 30), 'yyyy-MM-dd')
  const maxEveningDateStr = format(new Date(), 'yyyy-MM-dd')
  const todayStrNav = format(new Date(), 'yyyy-MM-dd')
  const isDesktopSidebar = !isMobile && !!reviewDate

  return (
    <div className={isDesktopSidebar ? 'flex min-h-screen' : undefined}>
      {reviewDate ? (
        <EveningAutosaveController
          key={reviewDate}
          reviewDate={reviewDate}
          rowWasSubmittedRef={eveningRowWasSubmittedRef}
          snapshotRef={eveningSnapshotRef}
          hadEmergencyRef={hadEmergencyRef}
          onScheduleReady={onEveningScheduleReady}
          onFlushReady={onEveningFlushReady}
          onStatus={setDraftSaveStatus}
          onDraftId={(id) => setCurrentReviewId(id)}
        />
      ) : null}
      {isDesktopSidebar ? (
        <aside
          className="flex w-64 shrink-0 min-h-screen flex-col border-r border-white/10 bg-transparent"
          aria-label="Evening date navigation"
        >
          <PageSidebar
            variant="evening"
            title="Evening Review"
            subtitle="Reflect on your day"
            titleIcon={<Moon className="h-6 w-6 text-white" aria-hidden />}
            selectedDate={reviewDate}
            minDate={minEveningDateStr}
            maxDate={maxEveningDateStr}
            todayStr={todayStrNav}
            onSelectDate={(date) => {
              setReviewDate(date)
              router.push(`/evening?date=${date}`)
            }}
            onPickDate={() => {
              setDisplayedMonth(startOfMonth(new Date(reviewDate + 'T12:00:00')))
              setCalendarOpen(true)
            }}
          />
        </aside>
      ) : null}
      <div
        className={
          isDesktopSidebar
            ? 'flex min-h-0 min-h-screen flex-1 flex-col overflow-y-auto bg-gray-50 dark:bg-gray-950'
            : 'max-w-3xl mx-auto px-4 pb-40 pt-0 transition-all duration-200 md:pb-40'
        }
      >
        {eveningBrainDumpListening ? (
          <div
            className="pointer-events-none fixed inset-0 z-[35] bg-black/20 transition-opacity duration-300 dark:bg-black/35"
            aria-hidden
          />
        ) : null}
        <div
          className={
            isDesktopSidebar
              ? 'mx-auto max-w-3xl px-4 pt-2 md:pt-3 md:px-5 pb-40'
              : 'contents'
          }
        >
      {isTutorial && <TutorialProgress currentStep={3} />}

      {reviewDate && isMobile ? (
        <>
          <PageHeader
            variant="evening"
            title="Evening Review"
            titleIcon={<Moon className="w-6 h-6 text-white" aria-hidden />}
            subtitle={
              reviewDate === getEffectivePlanDate()
                ? format(new Date(reviewDate + 'T12:00:00'), 'EEEE, MMMM d, yyyy')
                : `Review for ${format(new Date(reviewDate + 'T12:00:00'), 'MMMM d, yyyy')}`
            }
            onCalendarClick={() => {
              setDisplayedMonth(startOfMonth(new Date(reviewDate + 'T12:00:00')))
              setCalendarOpen(true)
            }}
          />
          <WeekNavigator
            variant="evening"
            selectedDate={reviewDate}
            minDate={format(subDays(new Date(), 30), 'yyyy-MM-dd')}
            maxDate={format(addYears(new Date(), 5), 'yyyy-MM-dd')}
            monthStatus={monthStatus}
            selectedPillClassName="bg-[#ef725c]"
            onSelectDate={(date) => {
              setReviewDate(date)
              router.push(`/evening?date=${date}`)
            }}
          />
        </>
      ) : null}

      <div className="mb-3 md:mb-4">
        <DatePickerModal
          isOpen={calendarOpen}
          onClose={() => setCalendarOpen(false)}
          currentMonth={displayedMonth}
          onMonthChange={(month) => {
            setDisplayedMonth(month)
            fetchMonthStatus(month)
          }}
          onSelectDate={(date) => {
            setReviewDate(date)
            setCalendarOpen(false)
            router.push(`/evening?date=${date}`)
          }}
          monthStatus={monthStatus}
          selectedDate={reviewDate || undefined}
        />
      </div>

      {/* Benefit-driven CTA when user hasn't reflected today */}
      {!currentReviewId && reviewDate === getEffectivePlanDate() && (
        <EveningFirstTimeCTA />
      )}

      {/* Plan vs. reality: tasks + emergencies */}
      <EveningPlanVsReality
        isMobile={isMobile}
        reviewDate={reviewDate}
        draftSaveStatus={draftSaveStatus}
        eveningCrisisContext={eveningCrisisContext}
        loopStrainTip={loopStrainTip}
        hasPlanRealityData={morningTasks.length > 0 || todayEmergencies.length > 0}
        taskRows={
          <EveningTaskRows
            tasks={morningTasks}
            justCompletedId={justCompletedId}
            prefersReducedMotion={prefersReducedMotion}
            onToggleComplete={toggleTaskCompleted}
            onMoveToTomorrow={handleMoveTaskToTomorrow}
            onUndoMove={handleUndoMoveTask}
          />
        }
        emergencies={todayEmergencies}
      />

      {morningCommitmentSummary ? (
        <Card
          className="mb-6 border border-[#152b50]/20 bg-white/95 shadow-sm dark:border-sky-900/40 dark:bg-gray-900/85"
          style={{ borderLeft: `4px solid ${colors.navy.DEFAULT}` }}
        >
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-gray-900 dark:text-white">
              <Target className="h-5 w-5 shrink-0" style={{ color: colors.navy.DEFAULT }} aria-hidden />
              Strategic context
            </CardTitle>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Connect tonight&apos;s synthesis to what you set this morning.
            </p>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-gray-900 dark:text-gray-100">
              <span className="font-medium text-gray-600 dark:text-gray-400">
                This morning, you committed to:{' '}
              </span>
              {morningCommitmentSummary}
            </p>
          </CardContent>
        </Card>
      ) : null}

      {/* Emotional Check-in */}
      <div data-tutorial="evening-form">
      <Card
        highlighted
        className="mb-8"
        style={{ borderLeft: `3px solid ${colors.amber.DEFAULT}` }}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
            <Heart className="w-5 h-5" style={{ color: colors.navy.DEFAULT }} />
            How You&apos;re Feeling
          </CardTitle>
          <p className="text-sm mt-2 text-gray-600 dark:text-gray-300">
            A gentle check-in—no judgment, just awareness.
          </p>
        </CardHeader>
        <CardContent>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-10">
          <div>
            <label className="block text-sm font-medium mb-3 text-gray-900 dark:text-white">
              Mood (Great → Rough)
            </label>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {MOOD_OPTIONS.map((opt) => {
                const isSelected = mood === opt.value
                return (
                  <motion.button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      fireFunnelStep(2, 'journal_engaged')
                      setMood(opt.value)
                    }}
                    className={`min-h-[52px] min-w-[44px] rounded-xl px-3 py-3 flex flex-col items-center justify-center gap-1 text-sm font-medium transition-all sm:min-h-[56px] ${
                      isSelected
                        ? 'text-[#152B50] bg-[#DCE8DD] ring-4 ring-[#5A7D66] ring-offset-2 ring-offset-white shadow-sm dark:bg-emerald-950/55 dark:text-emerald-50 dark:ring-emerald-500/80 dark:ring-offset-gray-900'
                        : 'text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600'
                    }`}
                    aria-pressed={isSelected}
                    whileHover={prefersReducedMotion ? undefined : { scale: 1.02 }}
                    whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                  >
                    <span className="text-xl leading-none" aria-hidden>
                      {opt.emoji}
                    </span>
                    <span className="text-xs sm:text-sm">{opt.label}</span>
                  </motion.button>
                )
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-3 text-gray-900 dark:text-white">
              Energy battery
            </label>
            <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
              {ENERGY_OPTIONS.map((opt) => {
                const isSelected = energy === opt.value
                return (
                  <motion.button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      fireFunnelStep(2, 'journal_engaged')
                      setEnergy(opt.value)
                    }}
                    className={`flex min-h-[52px] min-w-[44px] flex-col items-center justify-end gap-2 rounded-xl px-3 py-2 transition-all sm:min-h-[56px] ${
                      isSelected
                        ? 'border-[3px] border-amber-500 bg-amber-50 shadow-md ring-2 ring-amber-300/50 dark:bg-amber-900/40 dark:ring-amber-500/40'
                        : 'border-2 border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-700'
                    }`}
                    whileHover={prefersReducedMotion ? undefined : { scale: 1.02 }}
                    whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
                    aria-pressed={isSelected}
                    aria-label={`${opt.label} energy`}
                  >
                    <div className="flex h-11 items-end gap-0.5 sm:h-12" aria-hidden>
                      {[1, 2, 3, 4, 5].map((seg) => (
                        <div
                          key={seg}
                          className={`w-2 rounded-sm transition-colors ${
                            opt.value >= seg ? 'bg-amber-500' : 'bg-gray-200 dark:bg-gray-600'
                          }`}
                          style={{ height: `${20 + seg * 16}%` }}
                        />
                      ))}
                    </div>
                    <span className="text-center text-[11px] font-medium leading-tight text-gray-700 dark:text-gray-200 sm:text-xs">
                      {opt.label}
                    </span>
                  </motion.button>
                )
              })}
            </div>
          </div>
        </div>
        </CardContent>
      </Card>

      <div className="space-y-4 transition-all duration-300 ease-out md:space-y-6">
        <div className="relative z-[45]">
          <BrainDumpCard
            className={cn(isMobile && proAccessLineLabel ? 'mb-12' : 'mb-0')}
            context="evening"
            title="Final Brain Dump: Clear the cache."
            subtitle="Clear the mental cache. Mention what went well, what drained you, and your reflections—I&apos;ll handle the sorting."
            value={brainDump}
            onChange={setBrainDump}
            accent="navy"
            id="evening-brain-dump"
            enableSortIntoReview
            sortLoading={eveningDumpSorting}
            onSortBegin={() => setEveningDumpSorting(true)}
            onSortCancel={() => setEveningDumpSorting(false)}
            onSortIntoReview={(text) => void handleEveningSortDump(text)}
            onListeningChange={setEveningBrainDumpListening}
          />
        </div>

        {/* Journal — blockquote-style synthesis */}
        <Card
          id="evening-daily-synthesis"
          className={`mb-8 bg-[#F8FAF8] dark:bg-gray-900/80 ${sortLandingGlowClass}`}
          style={{ marginBottom: spacing['2xl'], borderLeft: `4px solid ${colors.navy.DEFAULT}` }}
        >
          <CardHeader
            style={{
              paddingLeft: spacing.xl,
              paddingRight: spacing.xl,
              paddingTop: spacing.md,
              paddingBottom: spacing.sm,
            }}
          >
            <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
              <Lightbulb className="w-5 h-5" style={{ color: colors.amber.DEFAULT }} />
              Harvest your momentum
              <InfoTooltip
                text="Synthesize the day against your morning intent — this is the Strategist's closing loop."
                position="right"
              />
            </CardTitle>
            <blockquote className="mt-1.5 border-l-0 pl-0 text-base italic leading-relaxed text-gray-700 dark:text-gray-200 md:text-lg">
              The Strategist&apos;s verdict — what held, what shifted, and what you&apos;ll carry forward.
            </blockquote>
          </CardHeader>
          <CardContent
            style={{
              paddingLeft: spacing.xl,
              paddingRight: spacing.xl,
              paddingBottom: spacing.xl,
              paddingTop: spacing.sm,
            }}
          >
            <div
              className={`rounded-r-xl border-l-4 border-[#152B50] bg-white/90 py-1 pl-4 pr-2 shadow-sm transition-shadow duration-500 dark:border-sky-200/30 dark:bg-gray-800/90 ${
                dumpSortHighlight?.journal
                  ? 'ring-2 ring-[#5A7D66]/40 shadow-[0_0_24px_rgba(90,125,102,0.22)] dark:ring-emerald-400/35'
                  : ''
              }`}
            >
              {journalOpeningSuggestion && !journal.trim() ? (
                <div className="mb-2 flex flex-wrap items-center gap-2 px-2 pt-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => {
                      fireFunnelStep(2, 'journal_engaged')
                      setJournal(journalOpeningSuggestion)
                    }}
                  >
                    Use suggested opening
                  </Button>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Starts from your morning plan</span>
                </div>
              ) : null}
              <SpeechToTextInput
                as="textarea"
                value={journal}
                onChange={(e) => {
                  fireFunnelStep(2, 'journal_engaged')
                  setJournal(e.target.value)
                  setDumpSortHighlight((h) => (h?.journal ? { ...h, journal: false } : h))
                }}
                placeholder={journalPlaceholder}
                rows={6}
                className="w-full border-0 bg-transparent px-2 py-4 text-base leading-relaxed text-gray-900 placeholder:text-gray-400 focus:ring-0 dark:text-white md:text-lg"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Wins & Lessons */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8" style={{ marginBottom: spacing['2xl'] }}>
        {/* Wins Card */}
        <Card className={`mb-0 ${sortLandingGlowClass}`} style={{ borderLeft: `4px solid ${colors.emerald.DEFAULT}` }}>
          <CardHeader
            style={{
              paddingLeft: spacing.xl,
              paddingRight: spacing.xl,
              paddingTop: spacing.md,
              paddingBottom: spacing.sm,
            }}
          >
            <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
              <Award className="w-5 h-5" style={{ color: colors.emerald.DEFAULT }} />
              Wins
              <InfoTooltip text="What went well today? Big or small, celebrate your wins." position="right" />
            </CardTitle>
            <p className="text-sm mt-1.5 text-gray-600 dark:text-gray-300">
              Celebrate what worked today
            </p>
          </CardHeader>
          <CardContent
            style={{
              paddingLeft: spacing.xl,
              paddingRight: spacing.xl,
              paddingBottom: spacing.xl,
              paddingTop: spacing.sm,
            }}
          >
          <div>
            <label className="block text-sm font-medium mb-3 text-gray-900 dark:text-white">
              What went well?
            </label>
            <div className={`space-y-3 ${EVENING_STACK_SCROLL_FADE}`}>
              {wins.map((win, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-3 rounded-lg transition-shadow duration-500 ${
                    dumpSortHighlight?.wins.includes(index)
                      ? 'ring-2 ring-emerald-400/50 shadow-[0_0_16px_rgba(52,211,153,0.18)] dark:ring-emerald-400/40'
                      : ''
                  }`}
                >
                  <SpeechToTextInput
                    as="textarea"
                    value={win}
                    onChange={(e) => {
                      fireFunnelStep(2, 'journal_engaged')
                      const newWins = [...wins]
                      newWins[index] = e.target.value
                      fireFunnelStep(2, 'journal_engaged')
                      setWins(newWins)
                      setDumpSortHighlight((h) =>
                        h?.wins.includes(index) ? { ...h, wins: h.wins.filter((i) => i !== index) } : h
                      )
                    }}
                    placeholder="Celebrate your wins—big or small..."
                    rows={2}
                    className="w-full flex-1 px-4 py-2 rounded-lg border text-sm focus:ring-2 focus:ring-offset-2 resize-none transition-all duration-200 text-gray-900 dark:text-white bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 placeholder:text-gray-400"
                  />
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteWin(index)}
                    className="mt-1 p-2 transition-colors text-gray-500 dark:text-gray-400 hover:text-red-500 flex-shrink-0"
                    aria-label="Delete win"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setWins([...wins, ''])}
              className="mt-3 flex items-center gap-2 text-sm transition-colors"
              style={{ color: colors.navy.DEFAULT }}
              onMouseEnter={(e) => (e.currentTarget.style.color = colors.coral.DEFAULT)}
              onMouseLeave={(e) => (e.currentTarget.style.color = colors.navy.DEFAULT)}
            >
              <Plus className="w-4 h-4" />
              Add more wins
            </button>
          </div>
        </CardContent>
      </Card>

        {/* Lessons Card */}
        <Card className={`mb-0 ${sortLandingGlowClass}`} style={{ borderLeft: `4px solid ${colors.amber.DEFAULT}` }}>
          <CardHeader
            style={{
              paddingLeft: spacing.xl,
              paddingRight: spacing.xl,
              paddingTop: spacing.md,
              paddingBottom: spacing.sm,
            }}
          >
            <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
              <Lightbulb className="w-5 h-5" style={{ color: colors.amber.DEFAULT }} />
              Lessons
              <InfoTooltip text="What would you do differently? Every lesson is growth." position="right" />
            </CardTitle>
            <p className="text-sm mt-1.5 text-gray-600 dark:text-gray-300">
              What you&apos;d carry forward
            </p>
          </CardHeader>
          <CardContent
            style={{
              paddingLeft: spacing.xl,
              paddingRight: spacing.xl,
              paddingBottom: spacing.xl,
              paddingTop: spacing.sm,
            }}
          >
          <div>
            <label className="block text-sm font-medium mb-3 text-gray-900 dark:text-white">
              What would you do differently?
            </label>
            <div className={`space-y-3 ${EVENING_STACK_SCROLL_FADE}`}>
              {lessons.map((lesson, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-3 rounded-lg transition-shadow duration-500 ${
                    dumpSortHighlight?.lessons.includes(index)
                      ? 'ring-2 ring-amber-400/50 shadow-[0_0_16px_rgba(251,191,36,0.2)] dark:ring-amber-400/40'
                      : ''
                  }`}
                >
                  <SpeechToTextInput
                    as="textarea"
                    value={lesson}
                    onChange={(e) => {
                      fireFunnelStep(2, 'journal_engaged')
                      const newLessons = [...lessons]
                      newLessons[index] = e.target.value
                      fireFunnelStep(2, 'journal_engaged')
                      setLessons(newLessons)
                      setDumpSortHighlight((h) =>
                        h?.lessons.includes(index) ? { ...h, lessons: h.lessons.filter((i) => i !== index) } : h
                      )
                    }}
                    placeholder="Gentle lessons to carry forward..."
                    rows={2}
                    className="w-full flex-1 px-4 py-2 rounded-lg border text-sm focus:ring-2 focus:ring-offset-2 resize-none transition-all duration-200 text-gray-900 dark:text-white bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 placeholder:text-gray-400"
                  />
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteLesson(index)}
                    className="mt-1 p-2 transition-colors text-gray-500 dark:text-gray-400 hover:text-red-500 flex-shrink-0"
                    aria-label="Delete lesson"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setLessons([...lessons, ''])}
              className="mt-3 flex items-center gap-2 text-sm transition-colors"
              style={{ color: colors.navy.DEFAULT }}
              onMouseEnter={(e) => (e.currentTarget.style.color = colors.coral.DEFAULT)}
              onMouseLeave={(e) => (e.currentTarget.style.color = colors.navy.DEFAULT)}
            >
              <Plus className="w-4 h-4" />
              Add more lessons
            </button>
          </div>
        </CardContent>
      </Card>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-lg flex items-center gap-2 transition-all duration-200" style={{ backgroundColor: '#FEF2F2', borderColor: '#FECACA', borderWidth: '1px', color: '#B91C1C' }}>
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {currentReviewId && (
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex items-center gap-1 underline-offset-2 hover:underline"
            onClick={() => {
              setReflectionPopupVariant({ context: 'fix_date' })
              setShowReflectionPopup(true)
            }}
          >
            <span aria-hidden="true">📅</span>
            <span>Saved to wrong day? Fix it</span>
          </button>
        </div>
      )}

      <Button
        type="button"
        onClick={() => void handleSave()}
        disabled={saving}
        variant="primary"
        size="lg"
        className="w-full inline-flex items-center justify-center gap-2"
      >
        {saving ? (
          <>
            <Loader2 className="h-5 w-5 shrink-0 animate-spin" aria-hidden />
            <span>Saving & closing the loop…</span>
          </>
        ) : (
          'Save & Complete My Day'
        )}
      </Button>

      <ReflectionPopup
        isOpen={showReflectionPopup && !!reflectionPopupVariant}
        onClose={() => {
          setShowReflectionPopup(false)
          setReflectionPopupVariant(null)
        }}
        variant={
          reflectionPopupVariant ?? { context: 'evening', type: 'late_night_choice' }
        }
        currentDate={new Date()}
        onConfirmFixDate={async (targetDate) => {
          try {
            if (!currentReviewId) {
              setShowReflectionPopup(false)
              setReflectionPopupVariant(null)
              return
            }
            const res = await fetch('/api/reflection/fix-date', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ reviewId: currentReviewId, targetDate }),
            })
            const data = await res.json()
            if (!res.ok || !data.success) {
              console.error('fix-date error', data.error)
            } else {
              setReviewDate(targetDate)
              const formatted = format(new Date(targetDate + 'T12:00:00'), 'EEEE, MMMM d')
              window.dispatchEvent(
                new CustomEvent('toast', {
                  detail: { message: `✅ Reflection moved to ${formatted}`, type: 'success' },
                })
              )
            }
          } catch (err) {
            console.error('fix-date error', err)
          } finally {
            setShowReflectionPopup(false)
            setReflectionPopupVariant(null)
          }
        }}
        onOverwriteYesterday={async () => {
          const calendarTodayStr = format(new Date(), 'yyyy-MM-dd')
          const yesterdayStr = format(subDays(parseISO(`${calendarTodayStr}T12:00:00`), 1), 'yyyy-MM-dd')
          setShowReflectionPopup(false)
          setReflectionPopupVariant(null)
          await handleSave({ targetReviewDate: yesterdayStr })
        }}
        onSaveToToday={async () => {
          setShowReflectionPopup(false)
          setReflectionPopupVariant(null)
          await handleSave()
        }}
        onSelectYesterday={async () => {
          const calendarTodayStr = format(new Date(), 'yyyy-MM-dd')
          const yesterdayStr = format(subDays(parseISO(`${calendarTodayStr}T12:00:00`), 1), 'yyyy-MM-dd')
          setShowReflectionPopup(false)
          setReflectionPopupVariant(null)
          await handleSave({ targetReviewDate: yesterdayStr })
        }}
        onSelectToday={async () => {
          setShowReflectionPopup(false)
          setReflectionPopupVariant(null)
          await handleSave()
        }}
      />

      {/* Pro · first-ever evening only: reading placeholder before completion modal. Returning users skip this (flow stays null → inline insight). */}
      {eveningInsightFlow === 'reading' ? <EveningMrsDeerReadingOverlay /> : null}
      <EveningInsightCompletionModal
        isOpen={eveningInsightFlow === 'modal'}
        onClose={() => {
          setEveningInsightFlow(null)
          eveningInsightPostSaveActiveRef.current = false
        }}
        onContinue={() => {
          setEveningInsightFlow(null)
          eveningInsightPostSaveActiveRef.current = false
          router.push('/dashboard')
        }}
        insight={aiCoachMessage}
        insightId={eveningInsightId}
        eveningHotUnresolvedCount={eveningHotUnresolvedCount}
        firstGlimpseBadge={eveningFirstGlimpseBadge}
      />

      {/* Mrs. Deer AI Coach - Evening Reflection Insight (permanent, always shown if exists) */}
      {aiCoachTrigger === 'evening_after' &&
        eveningInsightFlow === null &&
        (aiCoachMessage || isStreaming || streamingError || isRetrying) && (
        <>
          {streamingError && !isRetrying ? (
            <div className="mt-4 p-6 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-center">
              <p className="text-amber-800 dark:text-amber-200 mb-3">
                🦌 Mrs. Deer lost her train of thought
              </p>
              <p className="text-sm text-amber-600 dark:text-amber-300 mb-4">
                She was thinking about your evening but got interrupted.
              </p>
              <button
                type="button"
                onClick={handleRetryInsight}
                className="px-4 py-2 bg-[#ef725c] text-white rounded-lg hover:bg-[#e8654d] transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : isRetrying ? (
            <div className="mt-4 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
              <p className="text-blue-800 dark:text-blue-200">
                🦌 Mrs. Deer is thinking again...
              </p>
              <StreamingIndicator className="mt-3" />
            </div>
          ) : (
            <>
              {isStreaming && <StreamingIndicator className="mb-4" />}
              <AICoachPrompt
                message={isStreaming ? (streamingInsight || '...') : aiCoachMessage!}
                trigger={aiCoachTrigger}
                onClose={() => {}}
                insightId={eveningInsightId ?? undefined}
                eveningHotUnresolvedCount={eveningHotUnresolvedCount}
                eveningCoachStreaming={isStreaming}
              />
            </>
          )}
        </>
      )}

      {/* Mrs. Deer adaptive prompt - behavior or coaching pattern (no feedback form) */}
      {detectedPattern && (
        <MrsDeerAdaptivePrompt
          pattern={detectedPattern}
          onDismiss={() => setDetectedPattern(null)}
          onRecordShown={async (patternType) => {
            await fetch('/api/feedback/record-pattern-shown', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ patternType }),
            })
          }}
        />
      )}

      {isDayComplete ? (
        <div className="mt-16">
          <EveningDayClosedSealCard />
        </div>
      ) : null}

      <ConfirmModal
        isOpen={snoozeModalOpen && snoozeTaskQueue.length > 0}
        title="Move to tomorrow?"
        message={
          snoozeTaskQueue[0]
            ? `Should we move "${snoozeTaskQueue[0].description.length > 280 ? `${snoozeTaskQueue[0].description.slice(0, 280)}…` : snoozeTaskQueue[0].description}" to tomorrow's plan?`
            : ''
        }
        confirmLabel="Yes, move it"
        cancelLabel="Not now"
        variant="default"
        onConfirm={() => void handleSnoozeModalConfirm()}
        onCancel={handleSnoozeModalSkip}
      />

      {/* Delete Win Confirmation */}
      <ConfirmModal
        isOpen={confirmDeleteWin !== null}
        title="Delete win?"
        message="Are you sure you want to delete this win?"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleDeleteWinConfirm}
        onCancel={() => setConfirmDeleteWin(null)}
      />

      {/* Delete Lesson Confirmation */}
      <ConfirmModal
        isOpen={confirmDeleteLesson !== null}
        title="Delete lesson?"
        message="Are you sure you want to delete this lesson?"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleDeleteLessonConfirm}
        onCancel={() => setConfirmDeleteLesson(null)}
      />

        </div>
      </div>
    </div>
  )
}
