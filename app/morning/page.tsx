'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { format, formatDistanceToNow, isToday, subDays, startOfMonth } from 'date-fns'
import { Target, Zap, X, AlertCircle, Edit2, Check, Square, Save, X as XIcon, HelpCircle, Trash2 } from 'lucide-react'
import { InfoTooltip } from '@/components/InfoTooltip'
import SpeechToTextInput from '@/components/SpeechToTextInput'
import { supabase } from '@/lib/supabase'
import { getUserSession } from '@/lib/auth'
import { AICoachPrompt } from '@/components/AICoachPrompt'
import { getFeatureAccess } from '@/lib/features'
import { DateNavigator } from '@/components/DateNavigator'
import { CalendarModal } from '@/components/CalendarModal'
import type { DayStatus } from '@/lib/date-utils'
import { useUserLanguage } from '@/lib/use-user-language'
import { getUserGoal, getActionPlanOptions, type UserGoal } from '@/lib/user-language'
import { trackEvent } from '@/lib/analytics'
import { trackFunnelStep } from '@/lib/analytics/track-funnel'
import { trackJourneyStep } from '@/lib/analytics/journey-tracking'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ProgressIndicator } from '@/components/ProgressIndicator'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MrsDeerAvatar } from '@/components/MrsDeerAvatar'
import { ConfirmModal } from '@/components/ConfirmModal'
import { StreamingIndicator } from '@/components/StreamingIndicator'
import { useStreamingInsight } from '@/lib/hooks/useStreamingInsight'
import { usePersonalizedExamples } from '@/lib/hooks/usePersonalizedExamples'
import { useHasSeenMorningTour } from '@/lib/hooks/useHasSeenMorningTour'
import { colors, typography, spacing } from '@/lib/design-tokens'
import { motion, useReducedMotion } from 'framer-motion'
import { TutorialProgress } from '@/components/TutorialProgress'
import { MicroLesson } from '@/components/MicroLesson'
import { ReflectionPopup } from '@/components/ReflectionPopup'
import { getTimeAwareness } from '@/lib/time-utils'
import { useTutorial } from '@/lib/contexts/TutorialContext'
import { TemplateLibraryModal } from '@/components/TemplateLibraryModal'
import { SaveAsTemplateModal } from '@/components/SaveAsTemplateModal'
import { generateExamplesForUser } from '@/lib/profile-examples'
import { FirstTimeSuccessModal } from '@/components/FirstTimeSuccessModal'
import { isNewOnboardingEnabled } from '@/lib/feature-flags'

export type ActionPlanOption2 = 'my_zone' | 'systemize' | 'delegate_founder' | 'eliminate_founder' | 'quick_win_founder'

// Legacy constant for backward compatibility - use getActionPlanOptions() instead
export const ACTION_PLAN_OPTIONS_2: { value: ActionPlanOption2; label: string; emoji: string; description: string }[] = [
  { value: 'my_zone', label: 'Focus Time', emoji: '🎯', description: 'Deep work only you can do – core strengths/strategy' },
  { value: 'systemize', label: 'Systemize', emoji: '⚙️', description: 'Create process/template or automate this' },
  { value: 'delegate_founder', label: 'Delegate', emoji: '👥', description: 'Assign to team member or VA' },
  { value: 'eliminate_founder', label: 'Eliminate', emoji: '🗑️', description: 'A nice-to-have or could forget about it' },
  { value: 'quick_win_founder', label: 'Quick Win', emoji: '⚡', description: 'I can knock this out fast (do immediately)' },
] as const

interface Task {
  id: string
  dbId?: string // Database ID for existing tasks
  description: string
  whyThisMatters: string
  needleMover: boolean | null
  isProactive: boolean | null
  actionPlan: ActionPlanOption2 | ''
  completed?: boolean
  // Local-only flag to mark tasks moved to tomorrow in UI (used by dashboard & morning)
  movedToTomorrow?: boolean
}

interface Decision {
  decision: string
  decisionType: 'strategic' | 'tactical'
  whyThisDecision: string
}

const EMPTY_TASK: Task = {
  id: '',
  description: '',
  whyThisMatters: '',
  needleMover: null,
  isProactive: null,
  actionPlan: 'my_zone',
}

function generateTaskId(): string {
  return crypto.randomUUID?.() ?? `task-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export default function MorningPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isTutorial = searchParams?.get('tutorial') === 'true'
  const isFirstTimeParam = searchParams?.get('first') === 'true'
  const isFirstTime = isFirstTimeParam && isNewOnboardingEnabled()
  const isResume = searchParams?.get('resume') === 'true'
  const lang = useUserLanguage() // Personalized language
  const [userGoal, setUserGoal] = useState<UserGoal | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [userTier, setUserTier] = useState<string>('beta')
  const [morningInsight, setMorningInsight] = useState<string | null>(null)
  const [postMorningInsight, setPostMorningInsight] = useState<string | null>(null)
  const [postMorningInsightId, setPostMorningInsightId] = useState<string | null>(null)
  const [showAddFourthModal, setShowAddFourthModal] = useState(false)
  const [decision, setDecision] = useState<Decision>({
    decision: '',
    decisionType: 'strategic',
    whyThisDecision: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasPlan, setHasPlan] = useState(false)
  const [editingTasks, setEditingTasks] = useState(false)
  const [editingDecision, setEditingDecision] = useState(false)
  const [planCreatedAt, setPlanCreatedAt] = useState<Date | null>(null)
  const [planUpdatedAt, setPlanUpdatedAt] = useState<Date | null>(null)
  const [decisionDbId, setDecisionDbId] = useState<string | null>(null)
  // Fix hydration: initialize with empty string, set in useEffect
  const [planDate, setPlanDate] = useState<string>('')
  const [planningMode, setPlanningMode] = useState<'full' | 'light'>('full')
  const [retryTrigger, setRetryTrigger] = useState(0)
  const [confirmDeleteTask, setConfirmDeleteTask] = useState<Task | null>(null)
  const [confirmDeleteDecision, setConfirmDeleteDecision] = useState(false)
  const funnelStepRef = useRef<Set<number>>(new Set())
  const prefersReducedMotion = useReducedMotion()
  const { insight: streamingInsight, isStreaming: isStreamingPostMorning, error: streamingError, startStream } = useStreamingInsight()
  const personalizedExamples = usePersonalizedExamples()
  const { markSeenMorningTour } = useHasSeenMorningTour()
  const { step: tutorialStep, nextStep: tutorialNextStep, isActive: tutorialActive, setCanProceed, setStep } = useTutorial()
  const hasAutoAdvancedFromPowerRef = useRef(false)
  const [showReflectionPopup, setShowReflectionPopup] = useState(false)
  const [reflectionPopupVariant, setReflectionPopupVariant] =
    useState<Parameters<typeof ReflectionPopup>[0]['variant'] | null>(null)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [displayedMonth, setDisplayedMonth] = useState<Date>(() => startOfMonth(new Date()))
  const [monthStatus, setMonthStatus] = useState<Record<string, DayStatus>>({})
  const [showTemplates, setShowTemplates] = useState(false)
  const [showSaveTemplate, setShowSaveTemplate] = useState(false)
  const [selectedTaskIndex, setSelectedTaskIndex] = useState<number | null>(null)
  const [scheduledSuggestions, setScheduledSuggestions] = useState<string[]>([])
  const [scheduledSuggestionsLoading, setScheduledSuggestionsLoading] = useState(false)
  const [taskBasedSuggestions, setTaskBasedSuggestions] = useState<string[]>([])
  const [loadingTaskSuggestions, setLoadingTaskSuggestions] = useState(false)
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null)
  const [decisionCategory, setDecisionCategory] = useState<string>('other')
  const [showFirstTimeModal, setShowFirstTimeModal] = useState(false)
  const [showFirstTimeInsightCTA, setShowFirstTimeInsightCTA] = useState(false)

  // ========== DEBUGGING SAVE ISSUE ==========
  const [debugSaveAttempted, setDebugSaveAttempted] = useState(false)
  const savePlanRef = useRef<() => Promise<void>>(() => Promise.resolve())
  useEffect(() => {
    if (typeof window === 'undefined') return
    console.log('🔍 [MORNING DEBUG] Page loaded', {
      url: window.location.href,
      timestamp: new Date().toISOString(),
      hasPlan,
      isFirstTime,
      isResume,
      tasksCount: tasks?.length,
      validTasksCount: tasks?.filter((t) => t.description?.trim()).length,
      decision: decision?.decision?.slice(0, 30),
      planDate,
      saving,
      showFirstTimeInsightCTA,
    })
  }, [])
  useEffect(() => {
    const btn = document.querySelector('[data-debug="morning-save"]')
    if (btn) {
      console.log('🔍 [MORNING DEBUG] Save button in DOM:', {
        exists: !!btn,
        text: btn.textContent?.trim(),
        disabled: (btn as HTMLButtonElement).disabled,
      })
    }
  }, [saving, isFirstTime, hasPlan])
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'S') {
        e.preventDefault()
        console.log('🔍 [MORNING DEBUG] Manual save triggered via Ctrl+Shift+S')
        setDebugSaveAttempted(true)
        savePlanRef.current()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Tutorial: update canProceed based on current step and form state
  useEffect(() => {
    if (!isTutorial) return
    const t0 = tasks[0]
    switch (tutorialStep) {
      case 'power_list':
        setCanProceed(
          !!t0?.description?.trim() &&
          t0?.needleMover !== null &&
          t0?.needleMover !== undefined &&
          !!t0?.actionPlan
        )
        break
      case 'decision_card':
        setCanProceed(!!decision.decision?.trim())
        break
      case 'save_button':
        setCanProceed(
          !!t0?.description?.trim() &&
          t0?.needleMover !== null &&
          t0?.needleMover !== undefined &&
          !!decision.decision?.trim()
        )
        break
      case 'insight_area':
      case 'post_morning':
        setCanProceed(true)
        break
      default:
        break
    }
  }, [isTutorial, tutorialStep, tasks, decision.decision, decision.decisionType, decision.whyThisDecision, setCanProceed])

  // Auto-advance from power_list to decision_card when the first task is fully configured
  useEffect(() => {
    if (!isTutorial || !tutorialActive) return

    if (tutorialStep !== 'power_list') {
      // Reset flag when leaving this step so we can auto-advance again on future days
      hasAutoAdvancedFromPowerRef.current = false
      return
    }

    const t0 = tasks[0]
    const isComplete =
      !!t0?.description?.trim() && // Task description filled
      t0?.needleMover === true && // Explicitly marked as Needle Mover
      !!t0?.actionPlan && // Action plan selected
      typeof t0?.isProactive === 'boolean' // Initiative chosen (proactive or reactive)

    if (isComplete && !hasAutoAdvancedFromPowerRef.current) {
      hasAutoAdvancedFromPowerRef.current = true
      setTimeout(() => {
        tutorialNextStep()
      }, 800) // Slight delay so user sees completion
    }
  }, [isTutorial, tutorialActive, tutorialStep, tasks, tutorialNextStep])

  // Load scheduled decision suggestions (pre-generated night before) when plan date changes
  useEffect(() => {
    if (!planDate) return

    let cancelled = false
    const loadScheduledSuggestions = async () => {
      setScheduledSuggestionsLoading(true)
      setSuggestionsError(null)
      try {
        const res = await fetch(`/api/suggestions/today?date=${encodeURIComponent(planDate)}`, {
          credentials: 'include',
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error || 'Failed to load suggestions')
        }
        const body = (await res.json()) as { suggestions: string[]; basedOn?: string }
        if (cancelled) return
        setScheduledSuggestions(body.suggestions || [])
      } catch (err) {
        console.error('[Morning] Failed to load scheduled suggestions:', err)
        if (!cancelled) {
          setSuggestionsError('Unable to load suggestions right now.')
        }
      } finally {
        if (!cancelled) {
          setScheduledSuggestionsLoading(false)
        }
      }
    }

    loadScheduledSuggestions()
    return () => {
      cancelled = true
    }
  }, [planDate])

  const handleGenerateFromTasks = useCallback(async () => {
    const tasksWithDesc = tasks.filter((t) => t.description?.trim())
    if (tasksWithDesc.length === 0) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('toast', {
            detail: { message: 'Add at least one task to generate suggestions.', type: 'info' },
          })
        )
      }
      return
    }
    setLoadingTaskSuggestions(true)
    setTaskBasedSuggestions([])
    try {
      const res = await fetch('/api/decisions/generate-from-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          tasks: tasksWithDesc.map((t) => ({
            description: t.description.trim(),
            action_plan: t.actionPlan || null,
          })),
        }),
      })
      const body = (await res.json()) as { suggestions?: string[]; error?: string }
      if (!res.ok) throw new Error(body.error || 'Failed to generate')
      setTaskBasedSuggestions(body.suggestions || [])
    } catch (err) {
      console.error('[Morning] generate-from-tasks error:', err)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('toast', {
            detail: { message: 'Could not generate suggestions. Please try again.', type: 'error' },
          })
        )
      }
    } finally {
      setLoadingTaskSuggestions(false)
    }
  }, [tasks])

  const handleMoveTaskToTomorrow = useCallback(
    async (task: Task) => {
      // Only allow move for tasks that already exist in the database
      if (!task.dbId) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('toast', {
              detail: {
                message: 'Save your plan first before moving tasks to tomorrow.',
                type: 'info',
              },
            })
          )
        }
        return
      }

      const originalTasks = tasks
      const updatedTasks = tasks.map((t) =>
        t.id === task.id ? { ...t, movedToTomorrow: true } : t
      )
      setTasks(updatedTasks)

      try {
        const res = await fetch('/api/tasks/move', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ taskId: task.dbId, targetDate: 'tomorrow' }),
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error || 'Failed to move task')
        }
      } catch (err) {
        console.error('[Morning] move-to-tomorrow error', err)
        setTasks(originalTasks)
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
      }
    },
    [tasks]
  )

  const handleUndoMoveTask = useCallback(
    async (task: Task) => {
      if (!task.dbId) return

      const originalTasks = tasks
      const restoredTasks = tasks.map((t) =>
        t.id === task.id ? { ...t, movedToTomorrow: false } : t
      )
      setTasks(restoredTasks)

      try {
        const res = await fetch('/api/tasks/undo-move', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ taskId: task.dbId }),
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error || 'Failed to undo move')
        }
      } catch (err) {
        console.error('[Morning] undo-move error', err)
        setTasks(originalTasks)
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
    },
    [tasks]
  )


  // Mark morning tour as seen when user lands on morning page (stops Today pulse on dashboard)
  useEffect(() => {
    if (!loading) markSeenMorningTour()
  }, [loading, markSeenMorningTour])

  // Initialize planDate from URL or today
  useEffect(() => {
    if (planDate === '') {
      const dateParam = searchParams?.get('date')
      const initial =
        dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)
          ? dateParam
          : format(new Date(), 'yyyy-MM-dd')
      setPlanDate(initial)
    }
  }, [searchParams])

  // Debug: log when insight state changes
  useEffect(() => {
    console.log('[Morning Page State] morningInsight:', morningInsight ? `${morningInsight.length} chars` : 'null', 'postMorningInsight:', postMorningInsight ? `${postMorningInsight.length} chars` : 'null', 'hasPlan:', hasPlan)
  }, [morningInsight, postMorningInsight, hasPlan])


  /** Log when banned phrases appear (for debugging) - always show insight, never hide */
  const logBannedPhrasesIfAny = useCallback((insight: string) => {
    if (insight && (insight.includes('top priority') || insight.includes('Needle Mover') || insight.includes('Smart Constraint') || insight.includes('🌿'))) {
      console.warn('[MORNING] Banned phrases detected in insight, showing anyway (filtered version)')
    }
  }, [])

  const fireFunnelStep = useCallback((step: number, name: string) => {
    if (funnelStepRef.current.has(step)) return
    funnelStepRef.current.add(step)
    trackFunnelStep('morning_flow', name, step)
  }, [])

  const loadTodayPlan = useCallback(async (opts?: { silent?: boolean }) => {
    const session = await getUserSession()
    if (!session) return

    if (!opts?.silent) setLoading(true)
    try {
      const features = getFeatureAccess({ tier: session.user.tier, pro_features_enabled: session.user.pro_features_enabled })
      const [prefsRes, tasksRes, decisionsRes, postMorningInsightRes] = await Promise.all([
        fetch('/api/user-preferences', { credentials: 'include', cache: 'no-store' }).then((r) => r.json()).catch(() => ({ planning_mode: 'full' })),
        supabase.from('morning_tasks').select('*').eq('plan_date', planDate).eq('user_id', session.user.id).order('task_order', { ascending: true }),
        supabase.from('morning_decisions').select('*').eq('plan_date', planDate).eq('user_id', session.user.id).maybeSingle(),
        features.dailyPostMorningPrompt
          ? (async () => {
              const { data, error } = await supabase.from('personal_prompts').select('id, prompt_text, prompt_type, prompt_date, generated_at').eq('user_id', session.user.id).eq('prompt_date', planDate).eq('prompt_type', 'post_morning').order('generated_at', { ascending: false }).limit(1).maybeSingle()
              return { data, error }
            })()
          : Promise.resolve({ data: null, error: null }),
      ])
      const planning_mode = (prefsRes as { planning_mode?: 'full' | 'light' })?.planning_mode ?? 'full'
      setPlanningMode(planning_mode)
      const loadedTasks = (tasksRes.data ?? []) as Array<{ id: string; description: string; why_this_matters?: string; needle_mover: boolean; is_proactive?: boolean | null; action_plan?: string; completed?: boolean; created_at: string; updated_at: string }>
      const hasPlanForDate = loadedTasks.length > 0 || decisionsRes.data
      if (hasPlanForDate && postMorningInsightRes?.data?.prompt_text) {
        const insight = postMorningInsightRes.data.prompt_text
        const row = postMorningInsightRes.data as { id?: string }
        if (row?.id) setPostMorningInsightId(row.id)
        if (insight && (insight.includes('top priority') || insight.includes('Needle Mover') || insight.includes('Smart Constraint') || insight.includes('🌿'))) {
          console.warn('[MORNING] Banned phrases in DB insight, showing anyway')
        }
        setPostMorningInsight(insight)
      } else if (!hasPlanForDate) {
        setPostMorningInsight(null)
        setPostMorningInsightId(null)
      }
      if (loadedTasks.length > 0 || decisionsRes.data) {
        setHasPlan(true)
        if (loadedTasks.length > 0) {
          setTasks(loadedTasks.map((t) => ({ id: generateTaskId(), dbId: t.id, description: t.description, whyThisMatters: t.why_this_matters || '', needleMover: t.needle_mover ?? null, isProactive: t.is_proactive ?? null, actionPlan: (t.action_plan as ActionPlanOption2) || 'my_zone', completed: t.completed || false })))
          setPlanCreatedAt(new Date(loadedTasks[0].created_at))
          setPlanUpdatedAt(new Date(loadedTasks[0].updated_at))
        }
        if (decisionsRes.data) {
          setDecision({ decision: decisionsRes.data.decision, decisionType: decisionsRes.data.decision_type as 'strategic' | 'tactical', whyThisDecision: decisionsRes.data.why_this_decision || '' })
          setDecisionDbId(decisionsRes.data.id)
          setPlanCreatedAt((prev) => prev ?? new Date(decisionsRes.data.created_at))
          setPlanUpdatedAt(new Date(decisionsRes.data.updated_at))
        }
      } else {
        setHasPlan(false)
        const maxTasks = planning_mode === 'light' ? 2 : 3
        setTasks(Array.from({ length: maxTasks }, () => ({ ...EMPTY_TASK, id: generateTaskId() })))
        setPostMorningInsight(null)
      }
      trackEvent('morning_page_view', { has_existing_plan: loadedTasks.length > 0 || !!decisionsRes.data, plan_date: planDate })
      trackJourneyStep('viewed_morning', { has_existing_plan: loadedTasks.length > 0 || !!decisionsRes.data })
      fireFunnelStep(1, 'morning_page_view')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load plan')
    } finally {
      setLoading(false)
    }
  }, [planDate, fireFunnelStep])

  const generateFreshPostMorningInsight = useCallback(async () => {
    console.log('🚨 DIAGNOSTIC - Tasks in state when generating insight:', JSON.stringify(tasks.map((t) => ({
      description: t.description,
      whyThisMatters: t.whyThisMatters,
      needleMover: t.needleMover,
      actionPlan: t.actionPlan,
    })), null, 2))
    console.log('🚨 DIAGNOSTIC - Decision in state:', JSON.stringify({ decision: decision.decision, decisionType: decision.decisionType, whyThisDecision: decision.whyThisDecision }))
    console.log('🚨 DIAGNOSTIC - planDate:', planDate)

    const session = await getUserSession()
    if (!session) return
    try {
      await startStream(
        { promptType: 'post_morning', userId: session.user.id, promptDate: planDate },
        async (fullPrompt) => {
          logBannedPhrasesIfAny(fullPrompt)
          setPostMorningInsight(fullPrompt)

          // Refresh session before save (streaming can take 30+ sec; JWT may have expired)
          const { data: { session: refreshed } } = await supabase.auth.refreshSession()
          const insightUserId = refreshed?.user?.id ?? (await getUserSession())?.user?.id
          console.log('🔍 [INSIGHT SAVE DEBUG]', {
            sessionExists: !!refreshed,
            sessionUserId: refreshed?.user?.id,
            insightUserId,
            userIdMatch: !!insightUserId,
            timestamp: new Date().toISOString(),
          })
          if (!insightUserId) {
            console.error('❌ [INSIGHT SAVE] No session - cannot save insight')
            window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Session expired. Please refresh and try again.', type: 'error' } }))
            loadTodayPlan({ silent: true })
            return
          }

          const { data: existing } = await supabase
            .from('personal_prompts')
            .select('id, generation_count')
            .eq('user_id', insightUserId)
            .eq('prompt_type', 'post_morning')
            .eq('prompt_date', planDate)
            .maybeSingle()

          const generationCount = existing ? ((existing as { generation_count?: number }).generation_count ?? 1) + 1 : 1

          const { data: savedRow, error: upsertError } = await supabase
            .from('personal_prompts')
            .upsert(
              {
                user_id: insightUserId,
                prompt_type: 'post_morning',
                prompt_date: planDate,
                prompt_text: fullPrompt,
                stage_context: null,
                generation_count: generationCount,
                generated_at: new Date().toISOString(),
              },
              { onConflict: 'user_id,prompt_type,prompt_date' }
            )
            .select()

          if (upsertError) {
            const isRlsError =
              upsertError?.message?.includes('row-level security') ||
              upsertError?.message?.includes('policy') ||
              upsertError?.code === '42501'
            if (isRlsError && insightUserId) {
              console.log('🔍 [INSIGHT SAVE] RLS failed, retrying via API (admin client)...')
              const { data: { session: apiSession } } = await supabase.auth.getSession()
              const apiRes = await fetch('/api/insights/save', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  ...(apiSession?.access_token && { Authorization: `Bearer ${apiSession.access_token}` }),
                },
                credentials: 'include',
                body: JSON.stringify({
                  prompt_type: 'post_morning',
                  prompt_date: planDate,
                  prompt_text: fullPrompt,
                  generation_count: generationCount,
                }),
              })
              const apiData = (await apiRes.json()) as { success?: boolean; id?: string; error?: string }
              if (apiRes.ok && apiData.success) {
                if (apiData.id) setPostMorningInsightId(apiData.id)
                window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Insight saved', type: 'success' } }))
              } else {
                console.error('❌ [INSIGHT SAVE] API fallback failed:', apiData.error)
                window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Failed to save insight. Please try again.', type: 'error' } }))
              }
            } else {
              console.error('❌ CRITICAL - Post-morning insight save failed:', {
                error: upsertError.message,
                details: upsertError.details,
                code: upsertError.code,
                insightUserId,
                planDate,
              })
              window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Failed to save insight. Please try again.', type: 'error' } }))
            }
          } else {
            const savedId = (savedRow as { id?: string }[])?.[0]?.id
            if (savedId) setPostMorningInsightId(savedId)
            window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Insight saved', type: 'success' } }))
          }
          loadTodayPlan({ silent: true })
        }
      )
    } catch (err) {
      console.error('[MORNING] Failed to stream fresh insight:', err)
    }
  }, [planDate, logBannedPhrasesIfAny, startStream, loadTodayPlan, tasks, decision])

  useEffect(() => {
    const checkAuth = async () => {
      const session = await getUserSession()
      if (!session) {
        router.push('/auth/login')
        return
      }
      setUserTier(session.user.tier || 'beta')
      
      // Load user's goal for personalized action plans
      const goal = await getUserGoal(session.user.id)
      setUserGoal(goal)
      
      const features = getFeatureAccess({
        tier: session.user.tier,
        pro_features_enabled: session.user.pro_features_enabled,
      })

      // Skip insight loading in tutorial mode (no morning prompt exists yet for new users)
      const tutorialParam = searchParams?.get('tutorial')
      if (tutorialParam === 'true' || tutorialParam === 'start') {
        return
      }
      
      if (features.dailyMorningPrompt && planDate) {
        // Fetch insights for THIS EXACT DATE ONLY (no cross-day fallback)
        try {
          console.log('[MORNING LOAD] Looking for morning prompt for date:', planDate, 'user:', session.user.id)
          
          // Query morning and post_morning separately so we get newest of each
          const planDateStart = new Date(planDate + 'T00:00:00').toISOString()
          const planDateEnd = new Date(planDate + 'T23:59:59').toISOString()

          const [morningRes, postMorningRes, fallbackRes] = await Promise.all([
            // Morning: get NEWEST only (generation 3 > 2 > 1)
            supabase
              .from('personal_prompts')
              .select('id, prompt_text, prompt_type, prompt_date, stage_context, generated_at')
              .eq('user_id', session.user.id)
              .eq('prompt_type', 'morning')
              .eq('prompt_date', planDate)
              .order('generated_at', { ascending: false })
              .limit(1)
              .maybeSingle(),
            // Post-morning: get NEWEST only
            supabase
              .from('personal_prompts')
              .select('id, prompt_text, prompt_type, prompt_date, generated_at')
              .eq('user_id', session.user.id)
              .eq('prompt_type', 'post_morning')
              .eq('prompt_date', planDate)
              .order('generated_at', { ascending: false })
              .limit(1)
              .maybeSingle(),
            // Fallback: if prompt_date fails, try generated_at date range
            supabase
              .from('personal_prompts')
              .select('prompt_text, prompt_type, stage_context, generated_at')
              .eq('user_id', session.user.id)
              .gte('generated_at', planDateStart)
              .lte('generated_at', planDateEnd)
              .in('prompt_type', ['morning', 'post_morning'])
              .order('generated_at', { ascending: false }),
          ])

          let morningInsightToShow = null
          let postMorningInsightToShow = null

          console.log('🔍 Loading morning insights:', {
            user_id: session.user.id,
            plan_date: planDate,
            morning_found: !!morningRes.data,
            morning_id: (morningRes.data as { id?: string })?.id,
            post_morning_found: !!postMorningRes.data,
            post_morning_id: (postMorningRes.data as { id?: string })?.id,
            morning_error: morningRes.error?.message,
          })
          if (morningRes.error) {
            console.error('[MORNING LOAD] prompt_date query error:', morningRes.error.message)
          }
          if (morningRes.data) {
            morningInsightToShow = morningRes.data.prompt_text
            console.log('[MORNING LOAD] ✅ Found morning prompt for', planDate, 'generated_at:', morningRes.data.generated_at)
          } else if (fallbackRes.data?.length) {
            const morningFromFallback = fallbackRes.data.find(p => p.prompt_type === 'morning')
            if (morningFromFallback) {
              morningInsightToShow = morningFromFallback.prompt_text
              console.log('[MORNING LOAD] ✅ Found morning via fallback, generated_at:', morningFromFallback.generated_at)
            }
          }
          if (!morningInsightToShow) {
            console.log('[MORNING LOAD] ⚠️ No morning prompt for', planDate, '(generated when you save previous evening)')
          }

          if (postMorningRes.data) {
            postMorningInsightToShow = postMorningRes.data.prompt_text
            console.log('[MORNING LOAD] Found post-morning insight for', planDate)
          } else if (fallbackRes.data?.length) {
            const postFromFallback = fallbackRes.data.find(p => p.prompt_type === 'post_morning')
            if (postFromFallback) postMorningInsightToShow = postFromFallback.prompt_text
          }
          
          console.log('[checkAuth] Setting insights - morning:', !!morningInsightToShow, 'postMorning:', !!postMorningInsightToShow)
          setMorningInsight(morningInsightToShow)
          setPostMorningInsight(postMorningInsightToShow)
        } catch (error) {
          console.error('[MORNING LOAD] Exception:', error)
        }
      }
    }
    checkAuth()
  }, [router, planDate, searchParams])

  useEffect(() => {
    if (planDate) {
      loadTodayPlan()
    }
  }, [planDate, retryTrigger, loadTodayPlan])

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
    if (!planDate) return
    const month = startOfMonth(new Date(planDate + 'T12:00:00'))
    fetchMonthStatus(month)
  }, [planDate, fetchMonthStatus])

  // First-time flow: ensure exactly 3 tasks for simplified form
  useEffect(() => {
    if (isFirstTime && !hasPlan && tasks.length < 3) {
      setTasks((prev) => {
        const next = [...prev]
        while (next.length < 3) {
          next.push({ ...EMPTY_TASK, id: generateTaskId() })
        }
        return next
      })
    }
  }, [isFirstTime, hasPlan, tasks.length])

  const typedFirstTaskRef = useRef(false)
  const updateTask = useCallback(
    (id: string, updates: Partial<Task>) => {
      fireFunnelStep(2, 'power_list_engaged')
      if (isTutorial && tasks[0]?.id === id) markSeenMorningTour()
      // Track when user types meaningful content in ANY task (≥3 chars)
      const desc = updates.description?.trim?.()
      if (!typedFirstTaskRef.current && desc && desc.length >= 3) {
        typedFirstTaskRef.current = true
        trackJourneyStep('typed_first_task')
      }
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
      )
    },
    [fireFunnelStep, isTutorial, tasks, markSeenMorningTour]
  )

  const suggestedMaxTasks = planningMode === 'light' ? 2 : 3
  const maxTasksForDisplay = 20 // Allow up to 20 tasks; show Add Task until then
  const handleAddTask = () => {
    if (tasks.length >= maxTasksForDisplay) return
    if (tasks.length === suggestedMaxTasks) {
      setShowAddFourthModal(true)
      return
    }
    setTasks((prev) => [...prev, { ...EMPTY_TASK, id: generateTaskId() }])
  }

  const confirmAddFourthTask = () => {
    setTasks((prev) => [...prev, { ...EMPTY_TASK, id: generateTaskId() }])
    setShowAddFourthModal(false)
    window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Focus tip: 3 tasks often optimizes focus—but you can add more anytime.', type: 'info' } }))
  }

  const cancelAddFourthTask = () => setShowAddFourthModal(false)

  const removeTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id))
  }

  const handleDeleteTaskConfirm = async () => {
    const task = confirmDeleteTask
    if (!task) return
    setConfirmDeleteTask(null)

    if (task.dbId) {
      const session = await getUserSession()
      if (!session) return
      const { error } = await supabase
        .from('morning_tasks')
        .delete()
        .eq('id', task.dbId)
        .eq('user_id', session.user.id)
      if (error) {
        window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Failed to delete task. Please try again.', type: 'error' } }))
        return
      }
    }
    removeTask(task.id)
    setPlanUpdatedAt(new Date())
    if (tasks.length === 1 && !decision.decision?.trim()) setHasPlan(false)
  }

  const handleDeleteDecisionConfirm = async () => {
    setConfirmDeleteDecision(false)
    if (!decisionDbId) return

    const session = await getUserSession()
    if (!session) return
    const { error } = await supabase
      .from('morning_decisions')
      .delete()
      .eq('id', decisionDbId)
      .eq('user_id', session.user.id)
    if (error) {
      window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Failed to delete decision. Please try again.', type: 'error' } }))
      return
    }
    setDecision({ decision: '', decisionType: 'strategic', whyThisDecision: '' })
    setDecisionDbId(null)
    setPlanUpdatedAt(new Date())
    if (tasks.length === 0) setHasPlan(false)
  }

  const savePlan = async (skipReflectionCheck = false) => {
    console.log('🔴 [SAVE] Function started')
    const validTasksPre = tasks.filter((t) => t.description?.trim())
    console.log('🔴 [SAVE] Validation checks:', {
      hasTasks: validTasksPre.length > 0,
      validTasksCount: validTasksPre.length,
      validPlanDate: !!planDate && /^\d{4}-\d{2}-\d{2}$/.test(planDate),
      planDate,
      isSaving: saving,
    })

    if (saving) {
      console.log('🔴 [SAVE] Exiting early: already saving')
      return
    }

    setDebugSaveAttempted(true)
    setSaving(true)
    setError(null)
    await new Promise((r) => setTimeout(r, 0))

    const session = await getUserSession()
    const filteredTasks = tasks.filter((t) => t.description.trim())

    console.log('🔴 [SAVE] After getUserSession:', { hasSession: !!session, filteredTasksCount: filteredTasks.length })

    if (isFirstTime && filteredTasks.length === 0) {
      console.log('🔴 [SAVE] Exiting early: no valid tasks (first-time)')
      setSaving(false)
      window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Add at least one task to continue', type: 'error' } }))
      return
    }

    if (!session) {
      console.log('🔴 [SAVE] Exiting early: no session')
      setError('User not authenticated. Please log in.')
      setSaving(false)
      router.push('/auth/login')
      return
    }

    if (!planDate || !/^\d{4}-\d{2}-\d{2}$/.test(planDate)) {
      console.log('🔴 [SAVE] Exiting early: invalid planDate', { planDate })
      setError('Please wait for the page to load, or refresh and try again.')
      setSaving(false)
      window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Page not ready. Please refresh.', type: 'error' } }))
      return
    }

    const awareness = getTimeAwareness()
    const todayStr = format(new Date(), 'yyyy-MM-dd')
    const yesterdayStr = format(new Date(Date.now() - 24 * 60 * 60 * 1000), 'yyyy-MM-dd')

    // Only block with reflection popup if user has a missing yesterday reflection (planned yesterday, didn't reflect)
    let hasMissingYesterday = false
    if (
      !skipReflectionCheck &&
      !isFirstTime &&
      planDate === todayStr &&
      (awareness.phase === 'late_night' || awareness.phase === 'morning_catchup')
    ) {
      const [yesterdayTasksRes, yesterdayDecisionsRes, yesterdayReviewRes] = await Promise.all([
        supabase
          .from('morning_tasks')
          .select('id')
          .eq('user_id', session.user.id)
          .eq('plan_date', yesterdayStr)
          .limit(1),
        supabase
          .from('morning_decisions')
          .select('id')
          .eq('user_id', session.user.id)
          .eq('plan_date', yesterdayStr)
          .limit(1),
        supabase
          .from('evening_reviews')
          .select('id')
          .eq('user_id', session.user.id)
          .eq('review_date', yesterdayStr)
          .limit(1),
      ])
      const hadYesterdayPlan =
        (yesterdayTasksRes.data?.length ?? 0) > 0 || (yesterdayDecisionsRes.data?.length ?? 0) > 0
      const hasYesterdayReview = (yesterdayReviewRes.data?.length ?? 0) > 0
      hasMissingYesterday = hadYesterdayPlan && !hasYesterdayReview
      console.log('🔴 [SAVE] Time check:', {
        planDate,
        todayStr,
        phase: awareness.phase,
        isFirstTime,
        hadYesterdayPlan,
        hasYesterdayReview,
        hasMissingYesterday,
      })
    }

    if (hasMissingYesterday) {
      console.log('🔴 [SAVE] Exiting early: reflection popup (missing yesterday)')
      setReflectionPopupVariant({
        context: 'morning',
        type: awareness.phase === 'late_night' ? 'late_night_choice' : 'morning_catchup',
      })
      setShowReflectionPopup(true)
      setSaving(false)
      return
    }

    console.log('🔴 [SAVE] All checks passed, proceeding to Supabase...')

    try {
      // Database allows unlimited tasks (migration 002)
      const tasksToSave = filteredTasks.map((t, i) => ({
        user_id: session.user.id,
        plan_date: planDate,
        task_order: i + 1,
        description: t.description.trim(),
        why_this_matters: t.whyThisMatters.trim() || null,
        needle_mover: t.needleMover ?? null,
        is_proactive: t.isProactive ?? null,
        action_plan: t.actionPlan || null,
        completed: t.completed || false,
      }))

      console.log('🔴 [SAVE] Calling Supabase: delete + insert tasks')
      await supabase.from('morning_tasks').delete().eq('plan_date', planDate).eq('user_id', session.user.id)
      if (tasksToSave.length > 0) {
        const { data: insertedTasks, error: insertTasksError } = await supabase
          .from('morning_tasks')
          .insert(tasksToSave)
          .select()
        console.log('🔴 [SAVE] Supabase insert result:', { inserted: insertedTasks?.length, error: insertTasksError?.message })
        if (insertTasksError) {
          console.error('Error inserting tasks:', insertTasksError)
          throw insertTasksError
        }
        if (insertedTasks && insertedTasks.length > 0) {
          setTasks((prev) =>
            prev.map((t, i) => ({
              ...t,
              dbId: insertedTasks[i]?.id,
            }))
          )
          if (!planCreatedAt) setPlanCreatedAt(new Date())
          setPlanUpdatedAt(new Date())
        }
      }

      if (decision.decision.trim()) {
        if (decisionDbId) {
          const { error: updateError } = await supabase
            .from('morning_decisions')
            .update({
              decision: decision.decision.trim(),
              decision_type: decision.decisionType,
              why_this_decision: decision.whyThisDecision.trim() || null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', decisionDbId)
          if (updateError) throw updateError
        } else {
          await supabase.from('morning_decisions').delete().eq('plan_date', planDate).eq('user_id', session.user.id)
          const { data: insertedDec, error: insertDecError } = await supabase
            .from('morning_decisions')
            .insert({
              user_id: session.user.id,
              plan_date: planDate,
              decision: decision.decision.trim(),
              decision_type: decision.decisionType,
              why_this_decision: decision.whyThisDecision.trim() || null,
            })
            .select()
            .single()
          if (insertDecError) throw insertDecError
          if (insertedDec) {
            setDecisionDbId(insertedDec.id)
            if (!planCreatedAt) setPlanCreatedAt(new Date())
          }
        }
        setPlanUpdatedAt(new Date())
      }

      // For first-time flow, don't set hasPlan yet — stay in simplified view until insight/modal
      if (!isFirstTime) {
        setHasPlan(true)
      }
      setEditingTasks(false)
      setEditingDecision(false)

      window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Plan saved!', type: 'success' } }))
      console.log('🔴 [SAVE] DB save complete, starting insight generation...')

      // Tutorial mode: stay on morning page, show insight area step, then completion modal
      if (isTutorial) {
        await (supabase.from('user_profiles') as any)
          .update({ onboarding_step: 2, updated_at: new Date().toISOString() })
          .eq('id', session.user.id)
        // Advance to insight_area step; overlay shows insight card, user clicks Next for completion modal
        setStep('insight_area')
        setCanProceed(true)
        // Generate post-morning insight (same as non-tutorial flow)
        const features = getFeatureAccess({
          tier: session.user.tier,
          pro_features_enabled: session.user.pro_features_enabled,
        })
        if (features.dailyPostMorningPrompt) {
          try {
            await startStream(
              {
                promptType: 'post_morning',
                userId: session.user.id,
                promptDate: planDate,
                postMorningOverride: {
                  todayPlan: tasksToSave.map((t) => ({ description: t.description, needle_mover: t.needle_mover ?? undefined })),
                  todayDecision: decision.decision.trim()
                    ? {
                        decision: decision.decision.trim(),
                        decision_type: decision.decisionType,
                        why_this_decision: decision.whyThisDecision?.trim() || null,
                      }
                    : null,
                },
              },
              async (fullPrompt) => {
                setPostMorningInsight(fullPrompt)
                const { data: { session: refreshed } } = await supabase.auth.refreshSession()
                const insightUserId = refreshed?.user?.id ?? (await getUserSession())?.user?.id
                console.log('🔍 [INSIGHT SAVE DEBUG] (tutorial)', {
                  sessionExists: !!refreshed,
                  sessionUserId: refreshed?.user?.id,
                  insightUserId,
                  timestamp: new Date().toISOString(),
                })
                if (!insightUserId) {
                  console.error('❌ [INSIGHT SAVE] No session - cannot save insight')
                  loadTodayPlan({ silent: true })
                  return
                }
                const { data: existingPost } = await supabase
                  .from('personal_prompts')
                  .select('id, generation_count')
                  .eq('user_id', insightUserId)
                  .eq('prompt_type', 'post_morning')
                  .eq('prompt_date', planDate)
                  .maybeSingle()
                const genCount = existingPost ? ((existingPost as { generation_count?: number }).generation_count ?? 1) + 1 : 1
                const { error: upsertErr } = await supabase
                  .from('personal_prompts')
                  .upsert(
                    {
                      user_id: insightUserId,
                      prompt_type: 'post_morning',
                      prompt_date: planDate,
                      prompt_text: fullPrompt,
                      stage_context: null,
                      generation_count: genCount,
                      generated_at: new Date().toISOString(),
                    },
                    { onConflict: 'user_id,prompt_type,prompt_date' }
                  )
                if (upsertErr) {
                  const isRlsError =
                    upsertErr?.message?.includes('row-level security') ||
                    upsertErr?.message?.includes('policy') ||
                    upsertErr?.code === '42501'
                  if (isRlsError && insightUserId) {
                    const { data: { session: apiSession } } = await supabase.auth.getSession()
                    const apiRes = await fetch('/api/insights/save', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        ...(apiSession?.access_token && { Authorization: `Bearer ${apiSession.access_token}` }),
                      },
                      credentials: 'include',
                      body: JSON.stringify({
                        prompt_type: 'post_morning',
                        prompt_date: planDate,
                        prompt_text: fullPrompt,
                        generation_count: genCount,
                      }),
                    })
                    const apiData = (await apiRes.json()) as { success?: boolean }
                    if (!apiRes.ok || !apiData.success) {
                      console.error('❌ [INSIGHT SAVE] Tutorial API fallback failed')
                    }
                  } else {
                    console.error('❌ [INSIGHT SAVE] Tutorial upsert failed:', upsertErr.message)
                  }
                }
                loadTodayPlan({ silent: true })
              }
            )
          } catch (err) {
            console.error('[MORNING TUTORIAL] Post-morning insight failed:', err)
          }
      } else {
        setPostMorningInsight('Great job planning your day! Come back this evening to reflect.')
        }
        setSaving(false)
        return
      }

      // First-time flow: show success modal after save (with or without AI insight)
      if (isFirstTime) {
        await (supabase.from('user_profiles') as any)
          .update({ onboarding_step: 2, updated_at: new Date().toISOString() })
          .eq('id', session.user.id)
        setShowFirstTimeInsightCTA(true)
      }

      const features = getFeatureAccess({
        tier: session.user.tier,
        pro_features_enabled: session.user.pro_features_enabled,
      })

      // Funnel step 3: plan complete
      fireFunnelStep(3, 'plan_complete')

      // Generate post-morning insight only (morning prompt is generated the previous evening)
      trackEvent('morning_plan_saved', {
        task_count: tasks.filter((t) => t.description.trim()).length,
        has_decision_log: !!(decision.decision?.trim()),
        needle_mover_count: tasks.filter((t) => t.needleMover === true).length,
        plan_date: planDate,
      })
      // Founder analytics: enqueue pattern extraction from decision
      const decisionText = [decision.decision?.trim(), decision.whyThisDecision?.trim()].filter(Boolean).join('\n')
      if (decisionText) {
        fetch('/api/analytics/enqueue-patterns', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source_table: 'morning_decisions',
            source_id: decisionDbId || planDate,
            content: decisionText,
          }),
        }).catch(() => {})
      }
      // Founder analytics: feature usage
      fetch('/api/analytics/feature-usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feature_name: 'morning_plan',
          action: 'save',
          page: '/morning',
          metadata: {
            task_count: tasksToSave.length,
            has_needle_mover: tasksToSave.some((t) => (t as { needle_mover?: boolean }).needle_mover === true),
          },
        }),
      }).catch(() => {})
      // Fallback: if they saved with tasks, they must have typed (track if we missed it)
      if (!typedFirstTaskRef.current && tasksToSave.length > 0) {
        typedFirstTaskRef.current = true
        trackJourneyStep('typed_first_task', { via: 'save_fallback' })
      }
      trackJourneyStep('saved_morning', { task_count: tasksToSave.length })

      console.log('[MORNING PLAN SAVE] dailyPostMorningPrompt:', features.dailyPostMorningPrompt)
      if (features.dailyPostMorningPrompt) {
        try {
          console.log('🚨 DIAGNOSTIC - Tasks just saved to DB (API will fetch these):', JSON.stringify(tasksToSave.map((t) => ({ description: t.description, needle_mover: t.needle_mover })), null, 2))
          console.log('🚨 DIAGNOSTIC - Decision just saved:', decision.decision ? { decision: decision.decision, decisionType: decision.decisionType, whyThisDecision: decision.whyThisDecision } : 'none')
          console.log('[MORNING PLAN SAVE] Starting post-morning stream for date:', planDate)
          await startStream(
            {
              promptType: 'post_morning',
              userId: session.user.id,
              promptDate: planDate,
              postMorningOverride: {
                todayPlan: tasksToSave.map((t) => ({ description: t.description, needle_mover: t.needle_mover ?? undefined })),
                todayDecision: decision.decision.trim()
                  ? {
                      decision: decision.decision.trim(),
                      decision_type: decision.decisionType,
                      why_this_decision: decision.whyThisDecision?.trim() || null,
                    }
                  : null,
              },
            },
            async (fullPrompt) => {
              if (fullPrompt && (fullPrompt.includes('top priority') || fullPrompt.includes('Needle Mover') || fullPrompt.includes('Smart Constraint') || fullPrompt.includes('🌿'))) {
                console.warn('[MORNING] Banned phrases detected in stream, showing anyway')
              }
              console.log('[MORNING PLAN SAVE] Setting postMorningInsight (length:', fullPrompt?.length, ')')
              setPostMorningInsight(fullPrompt)

              // Refresh session before save (streaming can take 30+ sec; JWT may have expired)
              const { data: { session: refreshed } } = await supabase.auth.refreshSession()
              const insightUserId = refreshed?.user?.id ?? (await getUserSession())?.user?.id
              console.log('🔍 [INSIGHT SAVE DEBUG]', {
                sessionExists: !!refreshed,
                sessionUserId: refreshed?.user?.id,
                insightUserId,
                userIdMatch: !!insightUserId,
                timestamp: new Date().toISOString(),
              })
              if (!insightUserId) {
                console.error('❌ [INSIGHT SAVE] No session - cannot save insight')
                window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Session expired. Please refresh and try again.', type: 'error' } }))
                loadTodayPlan({ silent: true })
                if (isFirstTime) setShowFirstTimeModal(true)
                return
              }

              const { data: existingPost } = await supabase
                .from('personal_prompts')
                .select('id, generation_count')
                .eq('user_id', insightUserId)
                .eq('prompt_type', 'post_morning')
                .eq('prompt_date', planDate)
                .maybeSingle()

              const genCount = existingPost ? ((existingPost as { generation_count?: number }).generation_count ?? 1) + 1 : 1

              const { data: saved, error: upsertErr } = await supabase
                .from('personal_prompts')
                .upsert(
                  {
                    user_id: insightUserId,
                    prompt_type: 'post_morning',
                    prompt_date: planDate,
                    prompt_text: fullPrompt,
                    stage_context: null,
                    generation_count: genCount,
                    generated_at: new Date().toISOString(),
                  },
                  { onConflict: 'user_id,prompt_type,prompt_date' }
                )
                .select()

              if (upsertErr) {
                const isRlsError =
                  upsertErr?.message?.includes('row-level security') ||
                  upsertErr?.message?.includes('policy') ||
                  upsertErr?.code === '42501'
                if (isRlsError && insightUserId) {
                  console.log('🔍 [INSIGHT SAVE] RLS failed, retrying via API (admin client)...')
                  const { data: { session: apiSession } } = await supabase.auth.getSession()
                  const apiRes = await fetch('/api/insights/save', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      ...(apiSession?.access_token && { Authorization: `Bearer ${apiSession.access_token}` }),
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                      prompt_type: 'post_morning',
                      prompt_date: planDate,
                      prompt_text: fullPrompt,
                      generation_count: genCount,
                    }),
                  })
                  const apiData = (await apiRes.json()) as { success?: boolean; id?: string; error?: string }
                  if (apiRes.ok && apiData.success) {
                    if (apiData.id) setPostMorningInsightId(apiData.id)
                    window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Insight saved', type: 'success' } }))
                  } else {
                    console.error('❌ [INSIGHT SAVE] API fallback failed:', apiData.error)
                    window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Failed to save insight. Please try again.', type: 'error' } }))
                  }
                } else {
                  console.error('❌ CRITICAL - Post-morning insight save failed:', {
                    error: upsertErr.message,
                    insightUserId,
                    planDate,
                  })
                  window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Failed to save insight. Please try again.', type: 'error' } }))
                }
              } else {
                const savedId = (saved as { id?: string }[])?.[0]?.id
                if (savedId) setPostMorningInsightId(savedId)
                window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Insight saved', type: 'success' } }))
              }
              // Refresh plan data to ensure UI is in sync
              loadTodayPlan({ silent: true })
              if (isFirstTime) setShowFirstTimeModal(true)
            }
          )
        } catch (error) {
          console.error('Failed to stream post-morning AI prompt:', error)
          if (isFirstTime) {
            setPostMorningInsight(
              "You're focusing on what matters today. That's not random — it's where your energy wants to go."
            )
            setShowFirstTimeModal(true)
          }
        }
      } else if (isFirstTime) {
        setPostMorningInsight("You're focusing on what matters today. That's not random — it's where your energy wants to go.")
        setShowFirstTimeModal(true)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save. Please try again.'
      console.error('🔴 [SAVE] ERROR in save:', {
        error: err,
        message: errorMessage,
        stack: err instanceof Error ? err.stack : undefined,
      })
      console.error('Save plan error:', err)
      setError(`${errorMessage} Check console for details.`)
      if (isFirstTime) {
        window.dispatchEvent(new CustomEvent('toast', { detail: { message: errorMessage, type: 'error' } }))
      }
    } finally {
      setSaving(false)
      console.log('🔴 [SAVE] ===== SAVE ATTEMPT FINISHED =====')
    }
  }

  useEffect(() => {
    savePlanRef.current = savePlan
  })

  const toggleTaskCompletion = async (taskId: string, currentCompleted: boolean) => {
    const task = tasks.find((t) => t.id === taskId)
    if (!task?.dbId) return

    const session = await getUserSession()
    if (!session) return

    const newCompleted = !currentCompleted
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, completed: newCompleted } : t)))

    const { error } = await supabase
      .from('morning_tasks')
      .update({ completed: newCompleted, updated_at: new Date().toISOString() })
      .eq('id', task.dbId)
      .eq('user_id', session.user.id)

    if (error) {
      setError('Failed to update completion status')
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, completed: currentCompleted } : t)))
    } else {
      setPlanUpdatedAt(new Date())
      fetch('/api/analytics/feature-usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feature_name: 'task_completion',
          action: 'complete',
          page: '/morning',
          metadata: { is_needle_mover: task.needleMover === true },
        }),
      }).catch(() => {})
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 md:px-5 py-8 pt-24">
        <LoadingSpinner
          message="Mrs. Deer, your AI companion is thinking..."
          showMrsDeer={true}
          onRetry={() => setRetryTrigger((t) => t + 1)}
          timeoutMs={8000}
        />
      </div>
    )
  }

  // Simplified first-time flow: minimal form, no advanced options
  if (isFirstTime && !hasPlan) {
    // After save, show Mrs. Deer insight CTA while waiting for insight (or modal when ready)
    if (showFirstTimeInsightCTA) {
      return (
        <div className="max-w-2xl mx-auto px-4 md:px-5 py-8" style={{ paddingTop: spacing['xl'] }}>
          <div className="p-6 rounded-xl border-l-4 border-[#ef725c] bg-[#152b50]/5 dark:bg-[#152b50]/20">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              🦌 Mrs. Deer is reading your tasks...
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              She&apos;s looking for:
            </p>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 mb-4 list-disc list-inside">
              <li>What themes are emerging today</li>
              <li>Where your energy naturally wants to go</li>
              <li>One question to ask you tomorrow</li>
            </ul>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              This takes just a moment.
            </p>
            {postMorningInsight ? (
              <button
                type="button"
                onClick={() => setShowFirstTimeModal(true)}
                className="px-4 py-2 rounded-lg font-medium text-white hover:opacity-90 transition"
                style={{ backgroundColor: colors.coral.DEFAULT }}
              >
                See what she noticed →
              </button>
            ) : (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span className="inline-block w-4 h-4 rounded-full border-2 border-[#ef725c] border-t-transparent animate-spin" />
                Generating your insight...
              </div>
            )}
          </div>
          <FirstTimeSuccessModal
            isOpen={showFirstTimeModal}
            onClose={() => setShowFirstTimeModal(false)}
            insight={postMorningInsight}
          />
        </div>
      )
    }

    return (
      <div className="max-w-2xl mx-auto px-4 md:px-5 py-8" style={{ paddingTop: spacing['xl'] }}>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#152B50] dark:text-white mb-2">
            🌅 Plan your first day (2 minutes)
          </h1>
          {isResume && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Welcome back! You were about to plan your first day. Let&apos;s finish what you started.
            </p>
          )}
        </div>

        <div className="space-y-6">
          {[0, 1, 2].map((i) => (
            <div key={tasks[i]?.id ?? i} className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Task {i + 1}
              </label>
              <input
                type="text"
                value={tasks[i]?.description ?? ''}
                onChange={(e) => updateTask(tasks[i]?.id ?? '', { description: e.target.value })}
                placeholder="What do you want to accomplish?"
                className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#152b50] focus:border-transparent"
              />
              <details className="group">
                <summary className="text-xs text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300">
                  Why this matters (optional)
                </summary>
                <input
                  type="text"
                  value={tasks[i]?.whyThisMatters ?? ''}
                  onChange={(e) => updateTask(tasks[i]?.id ?? '', { whyThisMatters: e.target.value })}
                  placeholder="Helps Mrs. Deer understand your deeper motivations"
                  className="mt-2 w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#152b50] focus:border-transparent text-sm"
                />
              </details>
            </div>
          ))}

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              One decision today
            </label>
            <input
              type="text"
              value={decision.decision}
              onChange={(e) => setDecision((d) => ({ ...d, decision: e.target.value }))}
              placeholder="What decision will shape your day?"
              className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#152b50] focus:border-transparent"
            />
            <details className="group">
              <summary className="text-xs text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300">
                Why this decision (optional)
              </summary>
              <input
                type="text"
                value={decision.whyThisDecision}
                onChange={(e) => setDecision((d) => ({ ...d, whyThisDecision: e.target.value }))}
                placeholder="Your reasoning"
                className="mt-2 w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#152b50] focus:border-transparent text-sm"
              />
            </details>
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="button"
            data-debug="morning-save"
            onClick={() => savePlan()}
            disabled={saving || tasks.filter((t) => t.description?.trim()).length === 0}
            className="w-full py-3 rounded-lg font-medium text-white hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ backgroundColor: colors.coral.DEFAULT }}
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                🦌 Mrs. Deer is writing...
              </span>
            ) : (
              <>✨ See what Mrs. Deer noticed</>
            )}
          </button>
        </div>

        <FirstTimeSuccessModal
          isOpen={showFirstTimeModal}
          onClose={() => setShowFirstTimeModal(false)}
          insight={postMorningInsight}
        />
      </div>
    )
  }

  const tasksCompleted = tasks.filter((t) => t.completed).length

  return (
    <div 
      className="max-w-3xl mx-auto px-4 md:px-5 py-8 transition-all duration-200"
      style={{ paddingTop: spacing['xl'] }}
    >
      <FirstTimeSuccessModal
        isOpen={showFirstTimeModal}
        onClose={() => setShowFirstTimeModal(false)}
        insight={postMorningInsight}
      />
      {isTutorial && <TutorialProgress currentStep={2} />}

      <MicroLesson page="morning" />

      {/* Header with Mrs. Deer - responsive: avatar above on mobile, left on desktop */}
      <div className="mb-8" style={{ marginBottom: spacing['2xl'] }}>
        <div className="flex flex-col md:flex-row md:items-start gap-4 mb-4">
          <div className="flex justify-center md:justify-start">
            <MrsDeerAvatar expression="thoughtful" size="mobile" className="md:hidden" />
            <MrsDeerAvatar expression="thoughtful" size="large" className="hidden md:block" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h1 
              className="font-bold mb-2 text-[#152B50] dark:text-white"
              style={{ 
                fontSize: typography.pageTitle.fontSize, 
                fontWeight: typography.pageTitle.fontWeight,
                lineHeight: typography.pageTitle.lineHeight,
              }}
            >
              Morning Plan
            </h1>
            <p className="mb-4 text-gray-600 dark:text-gray-300">
              {hasPlan ? (isToday(new Date(planDate)) ? "Today's Plan" : `Plan for ${format(new Date(planDate), 'MMMM d, yyyy')}`) : 'Ready to own the day? Let\'s plan your focus.'}
            </p>
          </div>
        </div>
        <DateNavigator
          currentDate={planDate}
          onPrev={() => {
            const prev = format(subDays(new Date(planDate + 'T12:00:00'), 1), 'yyyy-MM-dd')
            if (prev >= format(subDays(new Date(), 30), 'yyyy-MM-dd')) setPlanDate(prev)
          }}
          onNext={() => {
            const next = format(subDays(new Date(planDate + 'T12:00:00'), -1), 'yyyy-MM-dd')
            const maxStr = format(subDays(new Date(), -1), 'yyyy-MM-dd')
            if (next <= maxStr) setPlanDate(next)
          }}
          onDateClick={() => {
            setDisplayedMonth(startOfMonth(new Date(planDate + 'T12:00:00')))
            setCalendarOpen(true)
          }}
          status={monthStatus[planDate] ?? 'empty'}
          canGoBack={planDate > format(subDays(new Date(), 30), 'yyyy-MM-dd')}
          canGoForward={planDate < format(subDays(new Date(), -1), 'yyyy-MM-dd')}
        />
        <CalendarModal
          isOpen={calendarOpen}
          onClose={() => setCalendarOpen(false)}
          currentMonth={displayedMonth}
          onMonthChange={(month) => {
            setDisplayedMonth(month)
            fetchMonthStatus(month)
          }}
          onSelectDate={(date) => {
            setPlanDate(date)
            setCalendarOpen(false)
            router.push(`/morning?date=${date}`)
          }}
          monthStatus={monthStatus}
          maxDate={subDays(new Date(), -1)}
        />
        <ReflectionPopup
          isOpen={showReflectionPopup && !!reflectionPopupVariant}
          onClose={() => {
            setShowReflectionPopup(false)
            setReflectionPopupVariant(null)
          }}
          variant={
            reflectionPopupVariant ?? { context: 'morning', type: 'morning_catchup' }
          }
          currentDate={new Date()}
          onGoToYesterdayEvening={() => {
            const yesterdayStr = format(
              new Date(Date.now() - 24 * 60 * 60 * 1000),
              'yyyy-MM-dd'
            )
            setShowReflectionPopup(false)
            setReflectionPopupVariant(null)
            router.push(`/evening?date=${yesterdayStr}`)
          }}
          onStartToday={() => {
            setShowReflectionPopup(false)
            setReflectionPopupVariant(null)
            savePlan(true)
          }}
        />
        {hasPlan && planCreatedAt && (
        <div className="flex gap-4 text-xs mt-2 text-gray-600 dark:text-gray-300">
            <span>Plan created: {format(planCreatedAt, 'h:mm a')}</span>
            {planUpdatedAt && planUpdatedAt.getTime() !== planCreatedAt.getTime() && (
              <span>Last updated: {format(planUpdatedAt, 'h:mm a')}</span>
            )}
          </div>
        )}
      </div>

      {/* Mrs. Deer AI Coach - Morning prompt: pre-generated from previous evening, shown at TOP before plan */}
      {morningInsight && (
        <AICoachPrompt
          message={morningInsight}
          trigger="morning_before"
          onClose={() => {}}
        />
      )}

      {/* Power List */}
      {hasPlan && !editingTasks ? (
        <Card highlighted className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                <Target className="w-5 h-5" style={{ color: colors.coral.DEFAULT }} />
                Today&apos;s Focus
              </CardTitle>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowTemplates(true)}
                  className="text-xs md:text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 underline-offset-2 hover:underline"
                >
                  📋 Templates
                </button>
                <Button variant="ghost" size="sm" onClick={() => setEditingTasks(true)}>
                  <Edit2 className="w-4 h-4 mr-1" />
                  Edit
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {tasks.length === 0 ? (
              <p className="text-sm italic text-gray-600 dark:text-gray-300">
                No tasks planned for today.
              </p>
            ) : (
              <div className="space-y-4">
                {tasks.map((task, index) => (
                    <motion.div
                      key={task.id}
                      initial={prefersReducedMotion ? false : { opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className={`flex items-start gap-4 p-4 rounded-lg transition-all duration-200 hover:shadow-sm ${task.completed ? 'bg-emerald-50 dark:bg-emerald-900/30' : 'bg-gray-50 dark:bg-gray-700'}`}
                      style={{ marginBottom: spacing.md }}
                    >
                      <motion.button
                        type="button"
                        onClick={() => toggleTaskCompletion(task.id, task.completed || false)}
                        className="mt-0.5 flex-shrink-0"
                        whileHover={prefersReducedMotion ? undefined : { scale: 1.1 }}
                        whileTap={prefersReducedMotion ? undefined : { scale: 0.9 }}
                      >
                        {task.completed ? (
                          <motion.div
                            initial={prefersReducedMotion ? false : { scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 300 }}
                          >
                            <Check className="w-5 h-5" style={{ color: colors.emerald.DEFAULT }} />
                          </motion.div>
                        ) : (
                          <Square className="w-5 h-5" style={{ color: colors.neutral.border }} />
                        )}
                      </motion.button>
                      <div className="flex-1 min-w-0 space-y-3">
                        <div>
                          <p className="text-xs font-medium mb-0.5 text-gray-600 dark:text-gray-300">Task</p>
                          <p className="text-gray-900 dark:text-white">
                            {task.description}
                          </p>
                        </div>
                        {task.needleMover !== null && (
                          <div>
                            <p className="text-xs font-medium mb-1 text-gray-600 dark:text-gray-300">{lang.needleMover}?</p>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {task.needleMover ? 'Yes' : 'No'}
                            </p>
                          </div>
                        )}
                        {task.isProactive !== null && (
                          <div>
                            <p className="text-xs font-medium mb-1 text-gray-600 dark:text-gray-300">Initiative</p>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {task.isProactive ? 'Proactive' : 'Reactive'}
                            </p>
                          </div>
                        )}
                        {task.actionPlan && (
                          <div>
                            <p className="text-xs font-medium mb-1 text-gray-600 dark:text-gray-300">Action Plan</p>
                            <p className="text-sm text-gray-900 dark:text-white">
                              {getActionPlanOptions(userGoal).find((o) => o.value === task.actionPlan)?.label || task.actionPlan}
                            </p>
                          </div>
                        )}
                        {task.whyThisMatters && (
                          <p className="text-sm mt-1 italic text-gray-600 dark:text-gray-300">
                            {task.whyThisMatters}
                          </p>
                        )}
                        <span className="text-xs block text-gray-600 dark:text-gray-300">
                          {task.completed ? '1/1' : '0/1'} completed
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteTask(task)}
                        className="flex-shrink-0 p-2 text-gray-500 hover:text-red-500 transition-colors"
                        aria-label="Delete task"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card
          highlighted
          className="mb-8"
          style={{ marginBottom: spacing['2xl'], borderLeft: `3px solid ${colors.coral.DEFAULT}` }}
        >
          <CardHeader style={{ padding: spacing['xl'], paddingBottom: spacing.lg }}>
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" style={{ color: colors.coral.DEFAULT }} />
                {lang.powerList}
              </CardTitle>
              <button
                type="button"
                onClick={() => setShowTemplates(true)}
                className="text-xs md:text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 underline-offset-2 hover:underline"
              >
                📋 Templates
              </button>
            </div>
          </CardHeader>
          <CardContent style={{ padding: spacing['xl'] }}>
            <div className="space-y-5">
              {tasks.map((task, index) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  index={index}
                  onChange={(updates) => updateTask(task.id, updates)}
                  onDelete={() => setConfirmDeleteTask(task)}
                  lang={lang}
                  userGoal={userGoal}
                  personalizedExamples={personalizedExamples}
                  highlightFirst={isTutorial && index === 0}
                  onSaveAsTemplate={() => {
                    setSelectedTaskIndex(index)
                    setShowSaveTemplate(true)
                  }}
                  onMoveToTomorrow={() => handleMoveTaskToTomorrow(task)}
                  onUndoMove={() => handleUndoMoveTask(task)}
                />
              ))}
            </div>
            {tasks.length < maxTasksForDisplay && (
              <Button variant="outline" onClick={handleAddTask} className="mt-4 w-full">
                + Add Task
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Visual Separator */}
      <div className="mb-8" style={{ marginBottom: spacing['2xl'], height: '1px', backgroundColor: colors.neutral.border, opacity: 0.3 }} />

      {/* Decision Log */}
      {hasPlan && !editingDecision && decision.decision && decision.decision.trim() ? (
        <Card className="mb-8 bg-gray-50 dark:bg-gray-800" style={{ marginBottom: spacing['2xl'], borderLeft: `4px solid ${colors.navy.DEFAULT}` }}>
          <CardHeader style={{ padding: spacing['xl'], paddingBottom: spacing.lg }}>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
                <Zap className="w-5 h-5" style={{ color: colors.navy.DEFAULT }} />
                {lang.decisionLog}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setEditingDecision(true)}>
                  <Edit2 className="w-4 h-4 mr-1" />
                  Edit
                </Button>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteDecision(true)}
                  className="p-2 text-gray-500 hover:text-red-500 transition-colors"
                  aria-label="Delete decision"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent style={{ padding: spacing['xl'] }}>
          <div className="space-y-3">
            <p className="font-medium text-lg mb-3 text-gray-900 dark:text-white">
              {decision.decision}
            </p>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Badge variant="neutral">
                {decision.decisionType === 'strategic' ? lang.strategicLabel : lang.tacticalLabel}
              </Badge>
              {planCreatedAt && (
                <span className="text-xs text-gray-600 dark:text-gray-300">
                  {format(planCreatedAt, 'h:mm a')}
                </span>
              )}
            </div>
            {decision.whyThisDecision && (
              <div className="mt-4 p-4 rounded-lg bg-white dark:bg-gray-700">
                <p className="text-sm italic leading-relaxed text-gray-600 dark:text-gray-300">
                  {decision.whyThisDecision}
                </p>
              </div>
            )}
          </div>
          </CardContent>
        </Card>
      ) : (
        <Card
          className="mb-8 bg-gray-50 dark:bg-gray-800"
          style={{ marginBottom: spacing['2xl'], borderLeft: `4px solid ${colors.navy.DEFAULT}` }}
          data-tutorial="decision-card"
        >
          <CardHeader style={{ padding: spacing['xl'] }}>
            <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-[#152B50]">
              <Zap className="w-5 h-5" style={{ color: colors.navy.DEFAULT }} />
              <span>Decision Log</span>
              <InfoTooltip text="Log important decisions and why you made them. This becomes your decision-making history." />
            </CardTitle>
          </CardHeader>
          <CardContent style={{ padding: spacing['xl'] }}>
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs text-gray-500">
                    One decision that will shape your day
                  </p>
                </div>
                {scheduledSuggestionsLoading && (
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <span className="inline-block w-3 h-3 rounded-full bg-gray-400 animate-pulse" />
                    Loading…
                  </span>
                )}
              </div>

              {/* Pre-generated suggestions (from night before) */}
              {scheduledSuggestions.length > 0 && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg space-y-2">
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                    Based on your recent patterns
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {scheduledSuggestions.map((suggestion, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() =>
                          setDecision((d) => ({ ...d, decision: suggestion }))
                        }
                        className="text-sm bg-white dark:bg-gray-800 px-3 py-1.5 rounded-full border border-blue-200 dark:border-blue-800 hover:border-blue-400 transition"
                      >
                        💡 {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Generate from tasks button */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleGenerateFromTasks}
                disabled={loadingTaskSuggestions || tasks.filter((t) => t.description?.trim()).length === 0}
              >
                {loadingTaskSuggestions ? (
                  <>
                    <span className="inline-block w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin mr-2" />
                    Generating…
                  </>
                ) : (
                  <>✨ Generate decision from my tasks</>
                )}
              </Button>

              {/* Task-based suggestions (on-demand) */}
              {taskBasedSuggestions.length > 0 && (
                <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg space-y-2">
                  <p className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
                    Based on today&apos;s tasks
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {taskBasedSuggestions.map((suggestion, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() =>
                          setDecision((d) => ({ ...d, decision: suggestion }))
                        }
                        className="text-sm bg-white dark:bg-gray-800 px-3 py-1.5 rounded-full border border-indigo-200 dark:border-indigo-800 hover:border-indigo-400 transition"
                      >
                        💡 {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {suggestionsError && (
                <p className="text-xs text-red-500">{suggestionsError}</p>
              )}

              {/* Decision input field */}
              <div>
                <label
                  htmlFor="decision"
                  className="block text-sm font-medium mb-1 text-gray-900 dark:text-white"
                >
                  What&apos;s ONE decision you want to be proud of today?
                </label>
                <textarea
                  id="decision"
                  value={decision.decision}
                  onChange={(e) =>
                    setDecision((d) => ({ ...d, decision: e.target.value }))
                  }
                  placeholder={
                    personalizedExamples.loading
                      ? "What's ONE decision you want to be proud of today?"
                      : `What's ONE decision you want to be proud of today? e.g. "${personalizedExamples.decision}"`
                  }
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border text-sm focus:ring-2 focus:ring-offset-2 transition-all duration-200 text-gray-900 dark:text-white bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 placeholder:text-gray-400"
                  data-tutorial="decision-input"
                />
              </div>

          <div data-tutorial="decision-reason">
            <label
              htmlFor="why-decision"
              className="block text-sm font-medium mb-1 text-gray-900 dark:text-white"
            >
              What's your gut telling you? Capture your reasoning.
            </label>
            <SpeechToTextInput
              as="textarea"
              id="why-decision"
              rows={3}
              value={decision.whyThisDecision}
              onChange={(e) =>
                setDecision((d) => ({ ...d, whyThisDecision: e.target.value }))
              }
              onKeyDown={(e: React.KeyboardEvent) => {
                // Prevent key events from bubbling up into the tutorial keyboard handler
                e.stopPropagation()
              }}
              placeholder="What's your gut telling you? Capture your reasoning..."
              className="w-full px-4 py-2 rounded-lg border text-sm focus:ring-2 focus:ring-offset-2 resize-none transition-all duration-200 text-gray-900 dark:text-white bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 placeholder:text-gray-400"
            />
          </div>

          <div data-tutorial="decision-type">
            <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
              {lang.strategicLabel} (🎯) vs {lang.tacticalLabel} (⚡)
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() =>
                  setDecision((d) => ({ ...d, decisionType: 'strategic' }))
                }
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all duration-200 ${decision.decisionType === 'strategic' ? 'bg-[#152B50] text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
              >
                🎯 {lang.strategicLabel}
              </button>
              <button
                type="button"
                onClick={() =>
                  setDecision((d) => ({ ...d, decisionType: 'tactical' }))
                }
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all duration-200 ${decision.decisionType === 'tactical' ? 'bg-[#152B50] text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
              >
                ⚡ {lang.tacticalLabel}
              </button>
            </div>
          </div>
        </div>
          </CardContent>
        </Card>
      )}

      {/* Save/Cancel Buttons */}
      {(editingTasks || editingDecision || !hasPlan) && (
        <div className="flex gap-3 mb-6 transition-all duration-200">
          <Button
            type="button"
            data-debug="morning-save"
            onClick={() => savePlan()}
            disabled={saving}
            variant="primary"
            className="flex-1"
            data-tutorial="save-morning"
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                {isTutorial ? 'Saving...' : 'Mrs. Deer is writing...'}
              </span>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {isTutorial ? 'Save & Continue to Evening →' : 'Save & Start My Day'}
              </>
            )}
          </Button>
          {(editingTasks || editingDecision) && (
            <Button
              type="button"
              onClick={() => {
                setEditingTasks(false)
                setEditingDecision(false)
                // Reload data to reset changes
                window.location.reload()
              }}
              variant="outline"
              className="flex items-center gap-2"
            >
              <XIcon className="w-4 h-4" />
              Cancel
            </Button>
          )}
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 rounded-lg flex items-center gap-2 transition-all duration-200" style={{ backgroundColor: '#FEF2F2', borderColor: '#FECACA', borderWidth: '1px', color: '#B91C1C' }}>
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Mrs. Deer AI Coach - Plan Review: post-morning insight at BOTTOM, after Power List and Decision Log */}
      {hasPlan && (postMorningInsight || isStreamingPostMorning || streamingError) && (
        <div data-tutorial="mrs-deer-insight">
          {isStreamingPostMorning && <StreamingIndicator className="mb-4" />}
          <AICoachPrompt
            message={isStreamingPostMorning ? (streamingInsight || '...') : (streamingError ? `[AI ERROR] ${streamingError}` : postMorningInsight!)}
            trigger="morning_after"
            onClose={() => {}}
            insightId={postMorningInsightId ?? undefined}
          />
        </div>
      )}

      <TemplateLibraryModal
        isOpen={showTemplates}
        onClose={() => setShowTemplates(false)}
        planDate={planDate}
        onApplyTemplate={async (templateId) => {
          if (!planDate) return
          try {
            const res = await fetch('/api/templates/apply', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ templateId, targetDate: planDate }),
            })
            const body = await res.json().catch(() => ({}))
            if (!res.ok || !body.success) {
              throw new Error(body.error || 'Failed to apply template')
            }
            setRetryTrigger((v) => v + 1)
            if (typeof window !== 'undefined') {
              window.dispatchEvent(
                new CustomEvent('toast', {
                  detail: {
                    message: 'Template applied to today\'s plan.',
                    type: 'success',
                  },
                })
              )
            }
          } catch (err) {
            console.error('[Morning] apply template error', err)
            if (typeof window !== 'undefined') {
              window.dispatchEvent(
                new CustomEvent('toast', {
                  detail: {
                    message: 'Could not apply template. Please try again.',
                    type: 'error',
                  },
                })
              )
            }
          }
        }}
        onInsertTaskFromTemplate={(tplTask) => {
          if (!typedFirstTaskRef.current && tplTask.description?.trim?.()) {
            typedFirstTaskRef.current = true
            trackJourneyStep('typed_first_task', { via: 'template' })
          }
          setTasks((prev) => {
            const maxTasks = maxTasksForDisplay
            const firstEmptyIndex = prev.findIndex(
              (t) => !t.description || !t.description.trim()
            )

            const fromTemplate: Partial<Task> = {
              description: tplTask.description,
              whyThisMatters: tplTask.why_important ?? '',
              needleMover: tplTask.is_needle_mover,
              isProactive: tplTask.is_proactive,
              actionPlan: (tplTask.action_plan as ActionPlanOption2) || 'my_zone',
              completed: false,
            }

            if (firstEmptyIndex !== -1) {
              // Fill the first blank task slot
              return prev.map((t, idx) =>
                idx === firstEmptyIndex
                  ? {
                      ...t,
                      ...fromTemplate,
                    }
                  : t
              )
            }

            if (prev.length >= maxTasks) {
              if (typeof window !== 'undefined') {
                window.dispatchEvent(
                  new CustomEvent('toast', {
                    detail: {
                      message: 'You already have the maximum number of tasks shown here.',
                      type: 'info',
                    },
                  })
                )
              }
              return prev
            }

            const newTask: Task = {
              id: generateTaskId(),
              description: tplTask.description,
              whyThisMatters: tplTask.why_important ?? '',
              needleMover: tplTask.is_needle_mover,
              isProactive: tplTask.is_proactive,
              actionPlan: (tplTask.action_plan as ActionPlanOption2) || 'my_zone',
              completed: false,
            }
            return [...prev, newTask]
          })
        }}
      />

      <SaveAsTemplateModal
        isOpen={showSaveTemplate && selectedTaskIndex !== null}
        onClose={() => {
          setShowSaveTemplate(false)
          setSelectedTaskIndex(null)
        }}
        task={
          selectedTaskIndex !== null
            ? {
                description: tasks[selectedTaskIndex]?.description ?? '',
                whyThisMatters: tasks[selectedTaskIndex]?.whyThisMatters ?? '',
                isProactive: tasks[selectedTaskIndex]?.isProactive ?? null,
                needleMover: tasks[selectedTaskIndex]?.needleMover ?? null,
                actionPlan: tasks[selectedTaskIndex]?.actionPlan ?? '',
              }
            : null
        }
      />

      {/* Quick Actions */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Link href="/history">
              <Button variant="outline" size="sm">
                View Full History
              </Button>
            </Link>
            <Link href="/evening">
              <Button variant="secondary" size="sm">
                Evening Review →
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Delete Task Confirmation */}
      <ConfirmModal
        isOpen={!!confirmDeleteTask}
        title="Delete task?"
        message="Are you sure you want to delete this task?"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleDeleteTaskConfirm}
        onCancel={() => setConfirmDeleteTask(null)}
      />

      {/* Delete Decision Confirmation */}
      <ConfirmModal
        isOpen={confirmDeleteDecision}
        title="Delete decision?"
        message="Are you sure you want to delete this decision?"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleDeleteDecisionConfirm}
        onCancel={() => setConfirmDeleteDecision(false)}
      />

      {/* 4th Task Warning Modal */}
      {showAddFourthModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={cancelAddFourthTask}
        >
          <div
            className="bg-white dark:bg-gray-800 dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 dark:text-white mb-2">
              Add 4th Task?
            </h3>
            <p className="text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-6">
              Research shows 3 tasks optimizes focus. Add anyway?
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={cancelAddFourthTask}
                className="flex-1 py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-lg font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 hover:bg-gray-50 dark:bg-gray-900 dark:bg-gray-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmAddFourthTask}
                className="flex-1 py-2 px-4 bg-[#ef725c] text-white rounded-lg font-medium hover:bg-[#e8654d]"
              >
                Add Anyway
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

function TaskCard({
  task,
  index,
  onChange,
  onDelete,
  lang,
  userGoal,
  personalizedExamples,
  highlightFirst,
  onSaveAsTemplate,
  onMoveToTomorrow,
  onUndoMove,
}: {
  task: Task
  index: number
  onChange: (updates: Partial<Task>) => void
  onDelete?: () => void
  lang: ReturnType<typeof useUserLanguage>
  userGoal: UserGoal | null
  personalizedExamples?: { task: string; action: Record<string, string>; loading: boolean }
  highlightFirst?: boolean
  onSaveAsTemplate?: () => void
  onMoveToTomorrow?: () => void
  onUndoMove?: () => void
}) {
  const moved = task.movedToTomorrow

  return (
    <div
      data-tutorial={highlightFirst ? 'power-list' : undefined}
      className={`p-4 rounded-lg border space-y-3 ${
        highlightFirst
          ? 'border-[#ef725c] ring-2 ring-[#ef725c]/40 bg-[#FFF0EC]/50 dark:bg-[#2D1F1C]/50 dark:border-[#ef725c]'
          : moved
            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800'
            : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 dark:text-white">
          Task {index + 1}
          {highlightFirst && (
            <span className="ml-2 text-xs font-normal text-[#ef725c]">— Start here</span>
          )}
        </span>
        <div className="flex items-center gap-1">
          {onSaveAsTemplate && (
            <button
              type="button"
              onClick={onSaveAsTemplate}
              className="text-gray-400 hover:text-yellow-500 transition-colors text-sm"
              title="Save as template"
            >
              ⭐
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="text-gray-500 dark:text-gray-400 hover:text-red-500 p-1 transition-colors"
              aria-label="Delete task"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Task, Why, How - stacked */}
      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1 flex items-center gap-1">
          Task <InfoTooltip text="What needs to get done today? Be specific." />
        </label>
        <SpeechToTextInput
          as="textarea"
          rows={1}
          value={task.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder={personalizedExamples?.loading ? lang.taskLabel : `e.g., ${personalizedExamples?.task ?? 'Write blog post, Research competitors'}`}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-[#152b50] dark:focus:ring-[#ef725c] focus:border-transparent text-gray-900 dark:text-gray-100 dark:text-white bg-white dark:bg-gray-800 dark:bg-gray-800 resize-none"
          data-tutorial={highlightFirst ? 'first-task' : undefined}
        />
      </div>
      <div data-tutorial={highlightFirst ? 'task-why' : undefined}>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">Why</label>
        <SpeechToTextInput
          as="textarea"
          rows={1}
          value={task.whyThisMatters}
          onChange={(e) => onChange({ whyThisMatters: e.target.value })}
          placeholder={lang.priorityLabel}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-[#152b50] dark:focus:ring-[#ef725c] focus:border-transparent text-gray-900 dark:text-gray-100 dark:text-white bg-white dark:bg-gray-800 dark:bg-gray-800 resize-none"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1 flex items-center gap-1">
          How <InfoTooltip text="Choose how you'll approach this task: Focus Time (deep work), Quick Win (fast task), Systemize (create a process), or Delegate (pass to someone else)." />
        </label>
        <select
          value={task.actionPlan}
          onChange={(e) => onChange({ actionPlan: e.target.value as ActionPlanOption2 })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-[#ef725c] focus:border-transparent text-gray-900 dark:text-gray-100 dark:text-white bg-white dark:bg-gray-800 dark:bg-gray-800"
          data-tutorial={highlightFirst ? 'action-plan' : undefined}
        >
          {getActionPlanOptions(userGoal).map((opt) => {
            const desc = !personalizedExamples?.loading && personalizedExamples?.action?.[opt.value]
              ? personalizedExamples.action[opt.value]
              : opt.description
            return (
              <option key={opt.value} value={opt.value}>
                {opt.emoji} {opt.label} - {desc}
              </option>
            )
          })}
        </select>
      </div>

      {/* Milestone Mover + Initiative on same line */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2" data-tutorial={highlightFirst ? 'needle-mover' : undefined}>
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300">{lang.needleMover}?</span>
          <InfoTooltip text={lang.needleMoverTooltip} />
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => onChange({ needleMover: true })}
              className={`py-1.5 px-3 rounded-lg text-xs font-medium transition ${
                task.needleMover === true ? 'bg-[#152b50] text-white' : 'bg-gray-50 dark:bg-gray-900 dark:bg-gray-800 text-gray-700 dark:text-gray-300 dark:text-gray-300 hover:bg-gray-50 dark:bg-gray-900 dark:bg-gray-800'
              }`}
            >
              Yes
            </button>
            <button
              type="button"
              onClick={() => onChange({ needleMover: false })}
              className={`py-1.5 px-3 rounded-lg text-xs font-medium transition ${
                task.needleMover === false ? 'bg-[#152b50] text-white' : 'bg-gray-50 dark:bg-gray-900 dark:bg-gray-800 text-gray-700 dark:text-gray-300 dark:text-gray-300 hover:bg-gray-50 dark:bg-gray-900 dark:bg-gray-800'
              }`}
            >
              No
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2" data-tutorial={highlightFirst ? 'initiative' : undefined}>
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300">Initiative</span>
          <InfoTooltip text="Did you initiate this (Proactive) or respond to something (Reactive)?" />
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => onChange({ isProactive: true })}
              className={`py-1.5 px-3 rounded-lg text-xs font-medium transition ${
                task.isProactive === true ? 'bg-[#152b50] text-white' : 'bg-gray-50 dark:bg-gray-900 dark:bg-gray-800 text-gray-700 dark:text-gray-300 dark:text-gray-300 hover:bg-gray-50 dark:bg-gray-900 dark:bg-gray-800'
              }`}
            >
              Proactive
            </button>
            <button
              type="button"
              onClick={() => onChange({ isProactive: false })}
              className={`py-1.5 px-3 rounded-lg text-xs font-medium transition ${
                task.isProactive === false ? 'bg-[#152b50] text-white' : 'bg-gray-50 dark:bg-gray-900 dark:bg-gray-800 text-gray-700 dark:text-gray-300 dark:text-gray-300 hover:bg-gray-50 dark:bg-gray-900 dark:bg-gray-800'
              }`}
            >
              Reactive
            </button>
          </div>
        </div>
        {onMoveToTomorrow && onUndoMove && task.dbId && (
          <div className="flex flex-col items-start sm:items-end gap-1 ml-auto">
            {!moved && (
              <button
                type="button"
                onClick={onMoveToTomorrow}
                className="text-xs text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 underline-offset-2 hover:underline"
              >
                Move to tomorrow
              </button>
            )}
            {moved && (
              <div className="flex items-center gap-2 text-xs text-blue-700 dark:text-blue-300">
                <span>Task moved to tomorrow</span>
                <button
                  type="button"
                  onClick={onUndoMove}
                  className="text-blue-600 dark:text-blue-400 hover:underline underline-offset-2"
                >
                  Undo
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
