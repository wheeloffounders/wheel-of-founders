'use client'

import { useState, useCallback, useEffect, useLayoutEffect, useRef, useMemo } from 'react'
import { flushSync } from 'react-dom'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { format, formatDistanceToNow, subDays, startOfMonth, addYears } from 'date-fns'
import { Target, Zap, X, AlertCircle, Edit2, Check, Square, HelpCircle, Trash2, Lock, Sun } from 'lucide-react'
import { InfoTooltip } from '@/components/InfoTooltip'
import SpeechToTextInput, { useSpeechDictation, SpeechTextField } from '@/components/SpeechToTextInput'
import { supabase } from '@/lib/supabase'
import { getUserSession, refreshSessionForWrite, isRlsOrAuthPermissionError } from '@/lib/auth'
import { AICoachPrompt } from '@/components/AICoachPrompt'
import { getFeatureAccess, isMorningFeatureLocked, isEmergencyFeatureLocked, type UserProfile } from '@/lib/features'
import { PageHeader } from '@/components/ui/PageHeader'
import { WeekNavigator } from '@/components/ui/WeekNavigator'
import { DatePickerModal } from '@/components/ui/DatePickerModal'
import type { DayStatus } from '@/lib/date-utils'
import { useUserLanguage } from '@/lib/use-user-language'
import { getUserGoal, getActionPlanOptions, type UserGoal } from '@/lib/user-language'
import { trackEvent } from '@/lib/analytics'
import { trackFunnelStep } from '@/lib/analytics/track-funnel'
import { trackJourneyStep } from '@/lib/analytics/journey-tracking'
import { LoadingWithMicroLesson } from '@/components/LoadingWithMicroLesson'
import { ProgressIndicator } from '@/components/ProgressIndicator'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ConfirmModal } from '@/components/ConfirmModal'
import { StreamingIndicator } from '@/components/StreamingIndicator'
import { useStreamingInsight } from '@/lib/hooks/useStreamingInsight'
import { usePersonalizedExamples } from '@/lib/hooks/usePersonalizedExamples'
import { useHasSeenMorningTour } from '@/lib/hooks/useHasSeenMorningTour'
import { useFirstBadgeCheck } from '@/lib/hooks/useFirstBadgeCheck'
import { colors, spacing } from '@/lib/design-tokens'
import { motion, useReducedMotion } from 'framer-motion'
import { TutorialProgress } from '@/components/TutorialProgress'
import { ReflectionPopup } from '@/components/ReflectionPopup'
import { getTimeAwareness } from '@/lib/time-utils'
import { useTutorial } from '@/lib/contexts/TutorialContext'
import { TemplateLibraryModal } from '@/components/TemplateLibraryModal'
import { SaveAsTemplateModal } from '@/components/SaveAsTemplateModal'
import { generateExamplesForUser } from '@/lib/profile-examples'
import { FirstTimeSuccessModal } from '@/components/FirstTimeSuccessModal'
import { isNewOnboardingEnabled } from '@/lib/feature-flags'
import { getClientAuthHeaders } from '@/lib/api/fetch-json'
import { trackErrorSync } from '@/lib/error-tracker'
import { getEffectiveUserTier, type TierProfileInput } from '@/lib/auth/tier-logic'
import { resolveProEntitlement } from '@/lib/auth/is-pro'
import { getTrialStatus } from '@/lib/auth/trial-status'
import { isTrialExpirySimulationEnabled } from '@/lib/trial-simulation'
import { ProMorningCanvas } from '@/components/morning/ProMorningCanvas'
import type { DecisionStrategyOption } from '@/lib/morning/pro-morning-oracle'
import {
  hasPrebakedDecisionStrategiesInAutosave,
  parsePrebakedDecisionStrategies,
} from '@/lib/morning/morning-plan-decision-json'
import { getDaysWithEntries } from '@/lib/founder-dna/days-with-entries'
import { isMorningInsightsUnlocked } from '@/lib/founder-dna/unlock-schedule-config'
import { morningTasksOrFilterForPlanDate, isTaskShowingAsMovedToTomorrow } from '@/lib/morning-tasks-plan-date-query'
import { getUserDaysActiveCalendar, getUserTimezoneFromProfile } from '@/lib/timezone'
import { FirstBadgeCelebration } from '@/components/founder-dna/FirstBadgeCelebration'
import { FirstDayBadgeModal } from '@/components/onboarding/FirstDayBadgeModal'
import { ReminderSetupScreen } from '@/components/onboarding/ReminderSetupScreen'
import {
  WOF_SESSION_INTENTION_PULSE_KEY,
  WOF_SESSION_MRS_DEER_HOOK_KEY,
  type MrsDeerDashboardHookPayload,
} from '@/lib/dashboard-onboarding-session'
import { CalendarReminderModal, type CalendarReminderType } from '@/components/CalendarReminderModal'
import { EmptyTasks } from '@/components/tasks/EmptyTasks'
import { handleCalendarAdd } from '@/lib/calendar'
import { getEffectivePlanDate, getPlanDateString } from '@/lib/effective-plan-date'
import { useMediaQuery } from '@/lib/hooks/useMediaQuery'
import { fetchUserProfileBundle } from '@/lib/user-profile-bundle-cache'
import { PageSidebar } from '@/components/layout/PageSidebar'
import { getActionPlanGuidance } from '@/lib/action-plan-guidance'
import { showFreemiumAuditLinks } from '@/lib/env'
import { useDebouncedAutoSave, type DraftSaveStatus } from '@/lib/hooks/useDebouncedAutoSave'
import { useEmergencyMode } from '@/components/emergency/EmergencyModeProvider'

export type ActionPlanOption2 = 'my_zone' | 'systemize' | 'delegate_founder' | 'eliminate_founder' | 'quick_win_founder'

// Legacy constant for backward compatibility - use getActionPlanOptions() instead
export const ACTION_PLAN_OPTIONS_2: { value: ActionPlanOption2; label: string; emoji: string; description: string }[] = [
  { value: 'my_zone', label: 'Milestone', emoji: '🎯', description: 'Deep work only you can do – core strengths/strategy' },
  { value: 'systemize', label: 'Systemize', emoji: '⚙️', description: 'Create process/template or automate this' },
  { value: 'delegate_founder', label: 'Delegate', emoji: '👥', description: 'Assign to team member or VA' },
  { value: 'eliminate_founder', label: 'Eliminate', emoji: '🗑️', description: 'A nice-to-have or could forget about it' },
  { value: 'quick_win_founder', label: 'Quick Win', emoji: '⚡', description: 'I can knock this out fast (do immediately)' },
] as const

export interface Task {
  id: string
  dbId?: string // Database ID for existing tasks
  description: string
  whyThisMatters: string
  needleMover: boolean | null
  isProactive: boolean | null
  actionPlan: ActionPlanOption2 | ''
  /** Single shared note; persists when switching action plans */
  actionPlanNote?: string
  completed?: boolean
  // Local-only flag to mark tasks moved to tomorrow in UI (used by dashboard & morning)
  movedToTomorrow?: boolean
  /** Pro: set when the founder saved Refine — feeds strategic memory quality signals. */
  userRefined?: boolean
  /** Pro: preset:… or freq:… when row came from a recurring blueprint. */
  recurringBlueprintKey?: string | null
  /** Pro: title snapshot when blueprint applied — clearing drift unlocks matrix again. */
  blueprintAnchorTitle?: string | null
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
  actionPlanNote: '',
}

const INITIAL_DECISION: Decision = {
  decision: '',
  decisionType: 'strategic',
  whyThisDecision: '',
}

/** True only when at least one task has text or the decision field is non-empty (avoids treating blank DB rows as a saved plan). */
function hasMeaningfulPlanContent(
  loadedTasks: Array<{ description?: string | null }>,
  decisionRow: { decision?: string | null } | null
): boolean {
  const hasTaskText = loadedTasks.some((t) => (t.description || '').trim().length > 0)
  const d = typeof decisionRow?.decision === 'string' ? decisionRow.decision.trim() : ''
  return hasTaskText || d.length > 0
}

function generateTaskId(): string {
  return crypto.randomUUID?.() ?? `task-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

type MorningPlanAutosaveRow = {
  tasks_json: unknown
  decision_json: unknown
  updated_at: string
}

type LoadedMorningTaskRow = {
  id: string
  description: string
  plan_date: string
  postponed_from_plan_date?: string | null
  why_this_matters?: string
  needle_mover: boolean
  is_proactive?: boolean | null
  action_plan?: string
  action_plan_note?: string | null
  completed?: boolean
  user_refined?: boolean
  recurring_blueprint_key?: string | null
  /** Autosave-only anchor for blueprint drift detection; inferred from description when loading from DB. */
  blueprint_anchor_title?: string | null
  created_at: string
  updated_at: string
}

function morningAutosaveJsonMeaningful(row: MorningPlanAutosaveRow | null): boolean {
  if (!row) return false
  const tj = row.tasks_json
  const dj = row.decision_json as { decision?: string } | null
  const tasksArr = Array.isArray(tj) ? tj : []
  const hasTask = tasksArr.some(
    (x: unknown) => typeof (x as { description?: string })?.description === 'string' && (x as { description: string }).description.trim().length > 0
  )
  const dec = dj && typeof dj.decision === 'string' ? dj.decision.trim() : ''
  return hasTask || dec.length > 0
}

function buildDisplayTasksFromAutosave(
  autosaveRow: MorningPlanAutosaveRow,
  loadedTasks: LoadedMorningTaskRow[],
  planDate: string,
  planningMode: 'full' | 'light'
): LoadedMorningTaskRow[] {
  const raw = Array.isArray(autosaveRow.tasks_json) ? autosaveRow.tasks_json : []
  const baseSlots = planningMode === 'light' ? 2 : 3
  const streamCap = planningMode === 'light' ? 3 : 4
  const len = Math.min(streamCap, Math.max(baseSlots, raw.length, loadedTasks.length))
  return Array.from({ length: len }, (_, i) => {
    const p = (raw[i] || {}) as Record<string, unknown>
    const db = loadedTasks[i]
    const desc = typeof p.description === 'string' ? p.description : ''
    const why = typeof p.whyThisMatters === 'string' ? p.whyThisMatters : typeof p.why_this_matters === 'string' ? p.why_this_matters : ''
    const ap = typeof p.actionPlan === 'string' ? p.actionPlan : typeof p.action_plan === 'string' ? p.action_plan : ''
    const apn = typeof p.actionPlanNote === 'string' ? p.actionPlanNote : typeof p.action_plan_note === 'string' ? p.action_plan_note : ''
    const finalDesc = (desc || db?.description || '').trim()
    const pBlueprintKey =
      typeof p.recurringBlueprintKey === 'string' && p.recurringBlueprintKey.trim()
        ? p.recurringBlueprintKey.trim()
        : null
    const dbBlueprintKey =
      typeof db?.recurring_blueprint_key === 'string' && db.recurring_blueprint_key.trim()
        ? db.recurring_blueprint_key.trim()
        : null
    const recurring_blueprint_key = pBlueprintKey ?? dbBlueprintKey ?? null
    const user_refined =
      typeof p.userRefined === 'boolean' ? p.userRefined : db?.user_refined ?? false
    const pAnchor =
      typeof p.blueprintAnchorTitle === 'string' && p.blueprintAnchorTitle.trim()
        ? p.blueprintAnchorTitle.trim()
        : null
    const blueprint_anchor_title =
      pAnchor ?? (recurring_blueprint_key ? finalDesc || null : null)
    return {
      id: db?.id ?? '',
      description: desc || db?.description || '',
      plan_date: planDate,
      postponed_from_plan_date: db?.postponed_from_plan_date ?? null,
      why_this_matters: why || db?.why_this_matters || '',
      needle_mover: typeof p.needleMover === 'boolean' ? p.needleMover : db?.needle_mover ?? false,
      is_proactive: typeof p.isProactive === 'boolean' ? p.isProactive : db?.is_proactive ?? null,
      action_plan: ap || db?.action_plan || undefined,
      action_plan_note: apn || db?.action_plan_note || null,
      completed: typeof p.completed === 'boolean' ? p.completed : db?.completed ?? false,
      user_refined,
      recurring_blueprint_key,
      blueprint_anchor_title,
      created_at: db?.created_at ?? autosaveRow.updated_at,
      updated_at: autosaveRow.updated_at,
    }
  })
}

type LoadedMorningDecisionRow = {
  id: string
  decision: string
  decision_type: string
  why_this_decision?: string | null
  created_at: string
  updated_at: string
}

function buildDisplayDecisionFromAutosave(
  autosaveRow: MorningPlanAutosaveRow,
  decisionRow: LoadedMorningDecisionRow | null
): LoadedMorningDecisionRow | null {
  const dj = autosaveRow.decision_json
  if (!dj || typeof dj !== 'object') return decisionRow
  const o = dj as Record<string, unknown>
  const decision = typeof o.decision === 'string' ? o.decision : decisionRow?.decision ?? ''
  const decision_type =
    typeof o.decisionType === 'string'
      ? o.decisionType
      : typeof o.decision_type === 'string'
        ? o.decision_type
        : decisionRow?.decision_type ?? 'strategic'
  const why =
    typeof o.whyThisDecision === 'string'
      ? o.whyThisDecision
      : typeof o.why_this_decision === 'string'
        ? o.why_this_decision
        : decisionRow?.why_this_decision ?? ''
  return {
    id: decisionRow?.id ?? '',
    decision,
    decision_type,
    why_this_decision: why || null,
    created_at: decisionRow?.created_at ?? autosaveRow.updated_at,
    updated_at: autosaveRow.updated_at,
  }
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
  const [tierProfileRow, setTierProfileRow] = useState<TierProfileInput | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [userTier, setUserTier] = useState<string>('beta')
  const [morningInsight, setMorningInsight] = useState<string | null>(null)
  const [postMorningInsight, setPostMorningInsight] = useState<string | null>(null)
  const [postMorningInsightId, setPostMorningInsightId] = useState<string | null>(null)
  /** True after save-time or manual stream fails so we still show the audit card + Retry. */
  const [postMorningInsightFetchFailed, setPostMorningInsightFetchFailed] = useState(false)
  const [showAddFourthModal, setShowAddFourthModal] = useState(false)
  /** `user_profiles.current_streak` for Mrs. Deer focus-friction copy (Pro + free modal). */
  const [userStreakDays, setUserStreakDays] = useState<number | null>(null)
  /** Onboarding / profile struggle ids → dynamic Pro pivot + stream section titles. */
  const [founderStruggleIds, setFounderStruggleIds] = useState<string[]>([])
  /** Session snapshot for freemium gates (Pro canvas, calibration, free decision AI). */
  const [freemiumSessionUser, setFreemiumSessionUser] = useState<UserProfile | null>(null)
  const [trialSimExpired, setTrialSimExpired] = useState(false)
  useEffect(() => {
    setTrialSimExpired(isTrialExpirySimulationEnabled())
    const onSim = () => setTrialSimExpired(isTrialExpirySimulationEnabled())
    window.addEventListener('wof-trial-sim-changed', onSim)
    return () => window.removeEventListener('wof-trial-sim-changed', onSim)
  }, [])
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
  const { showCelebration: showFirstSparkCelebration, setShowCelebration: setFirstSparkCelebration } =
    useFirstBadgeCheck()
  const { step: tutorialStep, nextStep: tutorialNextStep, isActive: tutorialActive, setCanProceed, setStep } = useTutorial()
  const hasAutoAdvancedFromPowerRef = useRef(false)
  const hasAutoAdvancedFromIntentionRef = useRef(false)
  const hasAutoAdvancedFromBrainDumpRef = useRef(false)
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
  const firstSaveMasterGateStartRef = useRef(0)
  const [showCalendarReminderModal, setShowCalendarReminderModal] = useState(false)
  const [calendarReminderTime, setCalendarReminderTime] = useState('20:00')
  const [calendarReminderType, setCalendarReminderType] = useState<CalendarReminderType | null>(null)
  const [showFirstDayBadgeModal, setShowFirstDayBadgeModal] = useState(false)
  const [showPostMorningReminderSetup, setShowPostMorningReminderSetup] = useState(false)
  /** Account-age days since signup (calendar); still used for analytics / display where relevant. */
  const [accountDaysActive, setAccountDaysActive] = useState<number | null>(null)
  /** Days-with-entries + evening count — gates Mrs. Deer morning / post-morning AI (matches journey). */
  const [insightActivityGate, setInsightActivityGate] = useState<{ dwe: number; ev: number } | null>(null)
  /** Pro strategy tray: hydrated from `morning_plan_autosave` (evening prebake) before AI. */
  const [proMorningStrategyHydration, setProMorningStrategyHydration] = useState<{
    strategies: DecisionStrategyOption[]
    prebakedAt: string | null
  } | null>(null)
  /** Anchor for Pro Morning Brain Dump — portal target on the morning page (above week strip on mobile). */
  const [brainDumpPortalHost, setBrainDumpPortalHost] = useState<HTMLDivElement | null>(null)
  const [morningBrainDumpListening, setMorningBrainDumpListening] = useState(false)

  const { isEmergencyActive } = useEmergencyMode()
  const emergencyNeedlePauseClass =
    isEmergencyActive && !isEmergencyFeatureLocked('morning_pause_grayscale', freemiumSessionUser)
      ? 'grayscale-[0.5] opacity-70 transition-[filter,opacity] duration-300'
      : ''

  const morningInsightsReady = useMemo(
    () =>
      insightActivityGate !== null &&
      isMorningInsightsUnlocked(insightActivityGate.dwe, insightActivityGate.ev),
    [insightActivityGate],
  )

  /** Post-morning AI: journey gate needs ≥1 evening — first morning has none yet; allow onboarding flows. */
  const postMorningInsightUnlocked = useMemo(
    () => morningInsightsReady || isFirstTime || isTutorial,
    [morningInsightsReady, isFirstTime, isTutorial],
  )

  /** Tier (Pro/beta): show post-morning stream + Mrs. Deer card — independent of journey gate. */
  const tierAllowsPostMorningInsight = useMemo(
    () => getFeatureAccess(freemiumSessionUser ?? null).dailyPostMorningPrompt,
    [freemiumSessionUser]
  )

  const effectiveMorningTier = useMemo(
    () => getEffectiveUserTier(tierProfileRow, { simulateExpired: trialSimExpired }),
    [tierProfileRow, trialSimExpired]
  )
  /** Pro canvas for all authenticated users (free morning layout removed). */
  const morningPlanView = 'pro' as const

  const morningEntitlement = useMemo(
    () =>
      resolveProEntitlement(
        {
          ...tierProfileRow,
          tier: tierProfileRow?.tier ?? freemiumSessionUser?.tier ?? null,
          pro_features_enabled: freemiumSessionUser?.pro_features_enabled,
        },
        Date.now(),
        { simulateExpired: trialSimExpired }
      ),
    [tierProfileRow, freemiumSessionUser, trialSimExpired]
  )

  const trialUx = useMemo(
    () =>
      getTrialStatus(
        {
          ...tierProfileRow,
          tier: tierProfileRow?.tier ?? freemiumSessionUser?.tier ?? null,
          pro_features_enabled: freemiumSessionUser?.pro_features_enabled,
        },
        { simulateExpired: trialSimExpired }
      ),
    [tierProfileRow, freemiumSessionUser, trialSimExpired]
  )

  const freemiumUserStrategic = useMemo((): UserProfile | null => {
    if (!freemiumSessionUser) return null
    if (trialUx.status !== 'expired') return freemiumSessionUser
    return { ...freemiumSessionUser, tier: 'free', pro_features_enabled: false }
  }, [freemiumSessionUser, trialUx.status])

  const showPostMorningInsightTier = useMemo(
    () => tierAllowsPostMorningInsight && trialUx.status !== 'expired',
    [tierAllowsPostMorningInsight, trialUx.status]
  )

  /** Tutorial-only mood/energy when the check-in card is shown (non-streamlined). */
  const [tutorialCheckInMood, setTutorialCheckInMood] = useState<number | null>(3)
  const [tutorialCheckInEnergy, setTutorialCheckInEnergy] = useState<number | null>(3)

  const pathname = usePathname()
  const showFreemiumMorningLink =
    showFreemiumAuditLinks &&
    morningPlanView === 'pro' &&
    Boolean(pathname && !pathname.includes('/morning/free'))

  const showBackToProMorningLink =
    showFreemiumAuditLinks && Boolean(pathname?.includes('/morning/free'))

  const backToProMorningHref = useMemo(() => {
    const q = searchParams?.toString()
    return q ? `/morning?${q}` : '/morning'
  }, [searchParams])

  const planTimestampsFooterText = useMemo(() => {
    if (!planCreatedAt) return ''
    const created = format(planCreatedAt, 'h:mm a')
    if (planUpdatedAt && planUpdatedAt.getTime() !== planCreatedAt.getTime()) {
      return `Plan created: ${created} · Last updated: ${format(planUpdatedAt, 'h:mm a')}`
    }
    return `Plan created: ${created}`
  }, [planCreatedAt, planUpdatedAt])

  const morningPlanViewRef = useRef(morningPlanView)
  morningPlanViewRef.current = morningPlanView

  const voiceLockedMorning = isMorningFeatureLocked('voice_to_text', freemiumUserStrategic)
  const decisionAiLockedMorning = isMorningFeatureLocked('decision_ai_suggestions', freemiumUserStrategic)
  const toneCalibrationLockedMorning = isMorningFeatureLocked('tone_calibration_adjust', freemiumUserStrategic)

  const pushMorningWithDate = useCallback(
    (date: string) => {
      const q = new URLSearchParams()
      q.set('date', date)
      const t = searchParams?.get('tutorial')
      if (t) q.set('tutorial', t)
      const f = searchParams?.get('first')
      if (f) q.set('first', f)
      const r = searchParams?.get('resume')
      if (r) q.set('resume', r)
      router.push(`/morning?${q.toString()}`)
    },
    [router, searchParams]
  )

  const isMobile = useMediaQuery('(max-width: 768px)')

  // ========== DEBUGGING SAVE ISSUE ==========
  const [debugSaveAttempted, setDebugSaveAttempted] = useState(false)
  const savePlanRef = useRef<() => Promise<void>>(() => Promise.resolve())

  const planDateAutoRef = useRef(planDate)
  planDateAutoRef.current = planDate
  const morningDraftSnapshotRef = useRef<{ tasks: Task[]; decision: Decision; planningMode: 'full' | 'light' }>({
    tasks: [],
    decision: INITIAL_DECISION,
    planningMode: 'full',
  })
  morningDraftSnapshotRef.current = { tasks, decision, planningMode }

  const morningDecisionStrategiesExtrasRef = useRef<{
    decision_strategies: DecisionStrategyOption[]
    decision_strategies_prebaked_at: string | null
  } | null>(null)

  const onProDecisionStrategiesPersist = useCallback(
    (payload: { strategies: DecisionStrategyOption[] | null; prebakedAt: string | null }) => {
      if (payload.strategies && payload.strategies.length >= 3) {
        morningDecisionStrategiesExtrasRef.current = {
          decision_strategies: payload.strategies,
          decision_strategies_prebaked_at: payload.prebakedAt,
        }
      } else {
        morningDecisionStrategiesExtrasRef.current = null
        setProMorningStrategyHydration(null)
      }
    },
    []
  )

  const persistMorningDraft = useCallback(async () => {
    const session = await getUserSession()
    if (!session?.user?.id) return
    const date = planDateAutoRef.current
    if (!date) return
    const snap = morningDraftSnapshotRef.current
    if (!hasMeaningfulPlanContent(snap.tasks, { decision: snap.decision.decision })) return

    const isProDraft = morningPlanViewRef.current === 'pro'
    const tasksJson = snap.tasks.map((t) => ({
      description: t.description,
      whyThisMatters: t.whyThisMatters,
      needleMover: isProDraft ? null : t.needleMover,
      isProactive: isProDraft ? null : t.isProactive,
      actionPlan: t.actionPlan,
      actionPlanNote: t.actionPlanNote ?? '',
      completed: t.completed ?? false,
      movedToTomorrow: t.movedToTomorrow ?? false,
      ...(isProDraft
        ? {
            userRefined: t.userRefined ?? false,
            recurringBlueprintKey: t.recurringBlueprintKey?.trim() || null,
            blueprintAnchorTitle: t.blueprintAnchorTitle?.trim() || null,
          }
        : {}),
    }))
    const extras = morningDecisionStrategiesExtrasRef.current
    const decisionJson = {
      decision: snap.decision.decision,
      decisionType: snap.decision.decisionType,
      ...(!isProDraft ? { whyThisDecision: snap.decision.whyThisDecision } : {}),
      ...(extras?.decision_strategies?.length
        ? {
            decision_strategies: extras.decision_strategies,
            decision_strategies_prebaked_at: extras.decision_strategies_prebaked_at ?? null,
          }
        : {}),
    }

    const run = () =>
      supabase.from('morning_plan_autosave').upsert(
        {
          user_id: session.user.id,
          plan_date: date,
          tasks_json: tasksJson,
          decision_json: decisionJson,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,plan_date' }
      )

    let { error } = await run()
    if (error && isRlsOrAuthPermissionError(error)) {
      const again = await refreshSessionForWrite()
      if (again.ok) ({ error } = await run())
    }
    if (error) throw error
  }, [])

  const {
    schedule: scheduleMorningDraft,
    flush: flushMorningDraft,
    status: morningDraftSaveStatus,
    setStatus: setMorningDraftSaveStatus,
  } = useDebouncedAutoSave({
    debounceMs: 2000,
    save: persistMorningDraft,
    enabled: !!planDate && !loading,
  })

  useEffect(() => {
    return () => {
      void flushMorningDraft()
    }
  }, [planDate, flushMorningDraft])

  useEffect(() => {
    if (loading || !planDate) return
    scheduleMorningDraft()
  }, [tasks, decision, planningMode, loading, planDate, scheduleMorningDraft])

  useEffect(() => {
    if (morningDraftSaveStatus !== 'saved') return
    const t = window.setTimeout(() => setMorningDraftSaveStatus('idle'), 2200)
    return () => window.clearTimeout(t)
  }, [morningDraftSaveStatus, setMorningDraftSaveStatus])

  const maybeShowCalendarReminder = useCallback(async (userId: string) => {
    if (typeof window === 'undefined') return
    try {
      const session = await getUserSession()
      if (!session || session.user.id !== userId) return
      const bundle = await fetchUserProfileBundle()
      const existingTime = bundle?.calendar_reminder_time
      const existingType = bundle?.calendar_reminder_type as CalendarReminderType | null | undefined

      if (existingTime) {
        setCalendarReminderTime(String(existingTime).slice(0, 5))
        if (existingType) setCalendarReminderType(existingType)
        return
      }

      const shownCount = Number.parseInt(localStorage.getItem('calendarModalShown') || '0', 10)
      if (shownCount < 3) {
        setShowCalendarReminderModal(true)
      }
    } catch {
      // ignore
    }
  }, [])
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

  // Tutorial: update canProceed based on current step and form state (URL tutorial only)
  useEffect(() => {
    if (!isTutorial) return
    const t0 = tasks[0]
    const proTutorial = morningPlanView === 'pro'
    switch (tutorialStep) {
      case 'morning_brain_dump':
        setCanProceed(true)
        break
      case 'morning_intention':
        setCanProceed(!!decision.decision?.trim())
        break
      case 'power_list':
        if (proTutorial) {
          setCanProceed(!!t0?.description?.trim() && !!t0?.actionPlan)
        } else {
          setCanProceed(
            !!t0?.description?.trim() &&
              t0?.needleMover !== null &&
              t0?.needleMover !== undefined &&
              !!t0?.actionPlan
          )
        }
        break
      case 'save_button':
        if (proTutorial) {
          setCanProceed(!!t0?.description?.trim() && !!t0?.actionPlan && !!decision.decision?.trim())
        } else {
          setCanProceed(
            !!t0?.description?.trim() &&
              t0?.needleMover !== null &&
              t0?.needleMover !== undefined &&
              !!decision.decision?.trim()
          )
        }
        break
      case 'insight_area':
      case 'post_morning':
        setCanProceed(true)
        break
      default:
        break
    }
  }, [
    isTutorial,
    tutorialStep,
    tasks,
    decision.decision,
    decision.decisionType,
    decision.whyThisDecision,
    setCanProceed,
    morningPlanView,
  ])

  /** Move past brain-dump step so intention/power auto-advance can run (no mood gate in streamlined flow). */
  useEffect(() => {
    if (!isTutorial || !tutorialActive) return
    if (tutorialStep !== 'morning_brain_dump') {
      hasAutoAdvancedFromBrainDumpRef.current = false
      return
    }
    if (hasAutoAdvancedFromBrainDumpRef.current) return
    hasAutoAdvancedFromBrainDumpRef.current = true
    const t = window.setTimeout(() => tutorialNextStep(), 400)
    return () => clearTimeout(t)
  }, [isTutorial, tutorialActive, tutorialStep, tutorialNextStep])

  /** Auto-advance tutorial steps (Pro hybrid: intention → tasks → save). */
  useEffect(() => {
    if (!isTutorial || !tutorialActive) return

    if (tutorialStep !== 'morning_intention') {
      hasAutoAdvancedFromIntentionRef.current = false
    }
    if (tutorialStep !== 'power_list') {
      hasAutoAdvancedFromPowerRef.current = false
    }

    if (tutorialStep === 'morning_intention' && decision.decision?.trim()) {
      if (!hasAutoAdvancedFromIntentionRef.current) {
        hasAutoAdvancedFromIntentionRef.current = true
        window.setTimeout(() => tutorialNextStep(), 600)
      }
      return
    }

    if (tutorialStep !== 'power_list') return

    const t0 = tasks[0]
    const proTutorial = morningPlanView === 'pro'
    const isComplete = proTutorial
      ? !!t0?.description?.trim() && !!t0?.actionPlan
      : !!t0?.description?.trim() &&
        t0?.needleMover === true &&
        !!t0?.actionPlan &&
        typeof t0?.isProactive === 'boolean'

    if (isComplete && !hasAutoAdvancedFromPowerRef.current) {
      hasAutoAdvancedFromPowerRef.current = true
      window.setTimeout(() => tutorialNextStep(), 800)
    }
  }, [
    isTutorial,
    tutorialActive,
    tutorialStep,
    tasks,
    tutorialNextStep,
    decision.decision,
    morningPlanView,
  ])

  // Load scheduled decision suggestions (pre-generated night before) when plan date changes
  useEffect(() => {
    if (!planDate) return

    const ac = new AbortController()
    let cancelled = false
    const loadScheduledSuggestions = async () => {
      setScheduledSuggestionsLoading(true)
      setSuggestionsError(null)
      try {
        const res = await fetch(`/api/suggestions/today?date=${encodeURIComponent(planDate)}`, {
          credentials: 'include',
          signal: ac.signal,
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error || 'Failed to load suggestions')
        }
        const body = (await res.json()) as { suggestions: string[]; basedOn?: string }
        if (cancelled) return
        setScheduledSuggestions(body.suggestions || [])
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
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
      ac.abort()
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
        setRetryTrigger((x) => x + 1)
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
        setRetryTrigger((x) => x + 1)
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

  // planDate from ?date= (always re-sync on param change — client nav does not remount the page)
  useEffect(() => {
    let cancelled = false
    const dateParam = searchParams?.get('date')
    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      setPlanDate(dateParam)
      return
    }

    const initDefaultPlanDate = async () => {
      const session = await getUserSession()
      if (cancelled) return
      if (!session?.user?.id) {
        setPlanDate(getEffectivePlanDate())
        return
      }
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('timezone')
        .eq('id', session.user.id)
        .maybeSingle()
      const tz = (profile as { timezone?: string | null } | null)?.timezone?.trim() || 'UTC'
      if (!cancelled) setPlanDate(getPlanDateString(tz))
    }
    void initDefaultPlanDate()
    return () => {
      cancelled = true
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

  const loadTodayPlan = useCallback(async (opts?: { silent?: boolean; signal?: AbortSignal }) => {
    const session = await getUserSession()
    if (!session) return
    if (opts?.signal?.aborted) return

    if (!opts?.silent) setLoading(true)
    try {
      const features = getFeatureAccess({ tier: session.user.tier, pro_features_enabled: session.user.pro_features_enabled })
      let prefsJson: { planning_mode?: 'full' | 'light' } = { planning_mode: 'full' }
      try {
        const r = await fetch('/api/user-preferences', {
          credentials: 'include',
          cache: 'no-store',
          signal: opts?.signal,
        })
        prefsJson = (await r.json()) as { planning_mode?: 'full' | 'light' }
      } catch (e) {
        if (opts?.signal?.aborted || (e instanceof Error && e.name === 'AbortError')) return
        prefsJson = { planning_mode: 'full' }
      }
      if (opts?.signal?.aborted) return

      const { data: profileForTasks } = await supabase
        .from('user_profiles')
        .select('timezone')
        .eq('id', session.user.id)
        .maybeSingle()
      if (opts?.signal?.aborted) return
      const tzForTasks = getUserTimezoneFromProfile(profileForTasks as { timezone?: string | null } | null)
      // Plan day only: primary filter is plan_date (plus postponed-to-tomorrow rows for undo)
      const morningTaskDayFilter = morningTasksOrFilterForPlanDate(planDate, tzForTasks)

      const [tasksRes, decisionsRes, commitRes, postMorningInsightRes, autosaveRes] = await Promise.all([
        supabase
          .from('morning_tasks')
          .select('*')
          .eq('user_id', session.user.id)
          .or(morningTaskDayFilter)
          .order('task_order', { ascending: true }),
        supabase.from('morning_decisions').select('*').eq('plan_date', planDate).eq('user_id', session.user.id).maybeSingle(),
        supabase.from('morning_plan_commits').select('committed_at').eq('user_id', session.user.id).eq('plan_date', planDate).maybeSingle(),
        features.dailyPostMorningPrompt
          ? (async () => {
              const { data, error } = await supabase.from('personal_prompts').select('id, prompt_text, prompt_type, prompt_date, generated_at').eq('user_id', session.user.id).eq('prompt_date', planDate).eq('prompt_type', 'post_morning').order('generated_at', { ascending: false }).limit(1).maybeSingle()
              return { data, error }
            })()
          : Promise.resolve({ data: null, error: null }),
        supabase.from('morning_plan_autosave').select('*').eq('user_id', session.user.id).eq('plan_date', planDate).maybeSingle(),
      ])
      if (opts?.signal?.aborted) return

      const planning_mode = prefsJson?.planning_mode ?? 'full'
      setPlanningMode(planning_mode)
      const loadedTasks = (tasksRes.data ?? []) as Array<{
        id: string
        description: string
        plan_date: string
        postponed_from_plan_date?: string | null
        why_this_matters?: string
        needle_mover: boolean
        is_proactive?: boolean | null
        action_plan?: string
        action_plan_note?: string | null
        completed?: boolean
        created_at: string
        updated_at: string
      }>
      const decisionRow = decisionsRes.data as LoadedMorningDecisionRow | null
      const hasCommittedPlan = !!(commitRes.data && !commitRes.error)

      const autosaveRow = (autosaveRes.data ?? null) as MorningPlanAutosaveRow | null
      const prebakedTray = autosaveRow ? parsePrebakedDecisionStrategies(autosaveRow.decision_json) : null
      if (prebakedTray) {
        morningDecisionStrategiesExtrasRef.current = {
          decision_strategies: prebakedTray.strategies,
          decision_strategies_prebaked_at: prebakedTray.prebakedAt,
        }
      } else {
        morningDecisionStrategiesExtrasRef.current = null
      }
      setProMorningStrategyHydration(prebakedTray)

      const autosaveTs = autosaveRow ? new Date(autosaveRow.updated_at).getTime() : 0
      const committedAtStr = (commitRes.data as { committed_at?: string } | null)?.committed_at
      const committedMs = committedAtStr ? new Date(committedAtStr).getTime() : 0
      const dbTaskMs = loadedTasks.reduce((m, t) => Math.max(m, new Date(t.updated_at).getTime()), 0)
      const dbDecMs = decisionRow ? new Date(decisionRow.updated_at).getTime() : 0
      const dbMax = Math.max(dbTaskMs, dbDecMs)

      let useAutosave = false
      if (autosaveRow && morningAutosaveJsonMeaningful(autosaveRow)) {
        if (hasCommittedPlan && committedMs > 0 && autosaveTs > committedMs) useAutosave = true
        if (!hasCommittedPlan && autosaveTs > dbMax) useAutosave = true
      }

      let displayTasks: LoadedMorningTaskRow[] = loadedTasks
      let displayDecision: LoadedMorningDecisionRow | null = decisionRow
      if (useAutosave && autosaveRow) {
        displayTasks = buildDisplayTasksFromAutosave(autosaveRow, loadedTasks, planDate, planning_mode)
        displayDecision = buildDisplayDecisionFromAutosave(autosaveRow, decisionRow)
      }

      const hasMeaningfulPlan = hasMeaningfulPlanContent(displayTasks, displayDecision)

      if (process.env.NODE_ENV === 'development') {
        console.log('[Morning] loadTodayPlan', planDate, {
          taskDescriptions: displayTasks.map((t) => t.description),
          decisionText: displayDecision?.decision ?? null,
          hasMeaningfulPlan,
          hasCommittedPlan,
          useAutosave,
        })
      }

      if (hasMeaningfulPlan && postMorningInsightRes?.data) {
        const row = postMorningInsightRes.data as { id?: string; prompt_text?: string }
        if (row.id) setPostMorningInsightId(row.id)
        const insight = row.prompt_text?.trim()
        if (insight) {
          if (
            insight.includes('top priority') ||
            insight.includes('Needle Mover') ||
            insight.includes('Smart Constraint') ||
            insight.includes('🌿')
          ) {
            console.warn('[MORNING] Banned phrases in DB insight, showing anyway')
          }
          setPostMorningInsight(insight)
          setPostMorningInsightFetchFailed(false)
        }
      } else if (!hasMeaningfulPlan) {
        setPostMorningInsight(null)
        setPostMorningInsightId(null)
        setPostMorningInsightFetchFailed(false)
      }
      if (hasMeaningfulPlan) {
        setHasPlan(hasCommittedPlan && !isFirstTime)
        if (displayTasks.length > 0) {
          setTasks(
            displayTasks.map((t) => ({
              id: generateTaskId(),
              dbId: t.id && t.id.length >= 32 ? t.id : undefined,
              description: t.description,
              whyThisMatters: t.why_this_matters || '',
              needleMover: t.needle_mover ?? null,
              isProactive: t.is_proactive ?? null,
              actionPlan: (t.action_plan as ActionPlanOption2) || 'my_zone',
              actionPlanNote: t.action_plan_note ?? '',
              completed: t.completed || false,
              userRefined: t.user_refined === true,
              recurringBlueprintKey: t.recurring_blueprint_key ?? null,
              blueprintAnchorTitle: t.blueprint_anchor_title ?? (t.recurring_blueprint_key ? t.description : null),
              movedToTomorrow: isTaskShowingAsMovedToTomorrow(planDate, tzForTasks, {
                plan_date: t.plan_date,
                postponed_from_plan_date: t.postponed_from_plan_date ?? null,
              }),
            }))
          )
          setPlanCreatedAt(new Date(displayTasks[0].created_at))
          setPlanUpdatedAt(new Date(displayTasks[0].updated_at))
        } else {
          const maxTasks = planning_mode === 'light' ? 2 : 3
          setTasks(Array.from({ length: maxTasks }, () => ({ ...EMPTY_TASK, id: generateTaskId() })))
        }
        if (displayDecision) {
          setDecision({
            decision: displayDecision.decision ?? '',
            decisionType: displayDecision.decision_type as 'strategic' | 'tactical',
            whyThisDecision: '',
          })
          setDecisionDbId(displayDecision.id && displayDecision.id.length >= 32 ? displayDecision.id : null)
          setPlanCreatedAt((prev) => prev ?? new Date(displayDecision.created_at))
          setPlanUpdatedAt(new Date(displayDecision.updated_at))
        } else {
          setDecision(INITIAL_DECISION)
          setDecisionDbId(null)
        }
      } else {
        setHasPlan(false)
        const maxTasks = planning_mode === 'light' ? 2 : 3
        setTasks(Array.from({ length: maxTasks }, () => ({ ...EMPTY_TASK, id: generateTaskId() })))
        setPostMorningInsight(null)
        setPostMorningInsightFetchFailed(false)
        setDecision(INITIAL_DECISION)
        setDecisionDbId(null)
        setPlanCreatedAt(null)
        setPlanUpdatedAt(null)
      }
      trackEvent('morning_page_view', { has_existing_plan: hasCommittedPlan, plan_date: planDate })
      trackJourneyStep('viewed_morning', { has_existing_plan: hasCommittedPlan })
      fireFunnelStep(1, 'morning_page_view')
    } catch (err) {
      if (opts?.signal?.aborted || (err instanceof Error && err.name === 'AbortError')) return
      setError(err instanceof Error ? err.message : 'Failed to load plan')
    } finally {
      if (opts?.signal?.aborted) return
      if (!opts?.silent) setLoading(false)
    }
  }, [planDate, fireFunnelStep, showPostMorningInsightTier, isFirstTime])

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return
    const showSaveButton = editingTasks || editingDecision || !hasPlan
    const branch = loading
      ? 'loading'
      : isFirstTime && !hasPlan && saving
        ? 'firstTime_saving'
        : isFirstTime && !hasPlan
          ? 'firstTime_form'
          : 'main'
    const saveHiddenReason =
      showSaveButton || branch !== 'main'
        ? null
        : hasPlan && !editingTasks && !editingDecision
          ? 'Plan exists: primary save is hidden; use Edit on Today\'s Focus or Decision, then Save.'
          : 'unknown'
    console.log('[MORNING STATE]', {
      hasPlan,
      saving,
      editFlags: { editingTasks, editingDecision },
      showSaveButton,
      branch,
      isFirstTime,
      isTutorial,
      morningInsightPresent: !!morningInsight,
      ...(saveHiddenReason ? { saveHiddenReason } : {}),
    })
  }, [
    hasPlan,
    saving,
    editingTasks,
    editingDecision,
    morningInsight,
    loading,
    isFirstTime,
    isTutorial,
  ])

  const generateFreshPostMorningInsight = useCallback(
    async (opts?: { celebrateFirstTime?: boolean }) => {
    /** Tier (Pro/beta) — not the Founder DNA “first evening” journey gate. */
    const tierFeatures = getFeatureAccess(freemiumSessionUser ?? null)
    if (!tierFeatures.dailyPostMorningPrompt) {
      console.log('[generateFreshPostMorningInsight] Skipped — dailyPostMorningPrompt false for tier')
      return
    }
    setPostMorningInsightFetchFailed(false)
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
    const planForFreshInsight = tasks
      .filter((t) => t.description.trim())
      .map((t) => ({
        description: t.description.trim(),
        action_plan: t.actionPlan || undefined,
        action_plan_note: t.actionPlanNote?.trim() || undefined,
        why_this_matters: t.whyThisMatters?.trim() || undefined,
        user_refined: t.userRefined === true,
        recurring_blueprint_key: t.recurringBlueprintKey?.trim() || undefined,
      }))
    try {
      const freshOutcome = await startStream(
        {
          promptType: 'post_morning',
          userId: session.user.id,
          promptDate: planDate,
          postMorningOverride: {
            todayPlan: planForFreshInsight,
            todayDecision: decision.decision.trim()
              ? {
                  decision: decision.decision.trim(),
                  decision_type: decision.decisionType,
                }
              : null,
          },
        },
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
            if (opts?.celebrateFirstTime) setFirstSparkCelebration(true)
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
          const existingRowId = (existing as { id?: string } | null)?.id
          if (existingRowId) setPostMorningInsightId(existingRowId)

          const performSave = async (): Promise<{
            primaryFailed: boolean
            fallbackFailed: boolean
            resolvedId: string | null
          }> => {
            let primaryFailed = false
            let fallbackFailed = false
            let resolvedId: string | null = existingRowId ?? null

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
              .select('id')

            if (upsertError) {
              primaryFailed = true
              trackErrorSync(new Error(`Post-morning insight save failed: ${upsertError.message}`), {
                component: 'morning',
                action: 'save_insight',
                severity: 'medium',
                metadata: { code: upsertError.code, planDate, insightUserId },
                userId: insightUserId,
              })
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
                  if (apiData.id) {
                    resolvedId = apiData.id
                    setPostMorningInsightId(apiData.id)
                  }
                } else {
                  fallbackFailed = true
                  console.error('❌ [INSIGHT SAVE] API fallback failed:', apiData.error)
                }
              } else {
                fallbackFailed = true
              }
            } else {
              const rows = (savedRow ?? []) as { id?: string }[]
              const savedId = rows[0]?.id
              if (savedId) {
                resolvedId = savedId
                setPostMorningInsightId(savedId)
              } else {
                const { data: idRow } = await supabase
                  .from('personal_prompts')
                  .select('id')
                  .eq('user_id', insightUserId)
                  .eq('prompt_type', 'post_morning')
                  .eq('prompt_date', planDate)
                  .maybeSingle()
                const fetchedId = (idRow as { id?: string } | null)?.id
                if (fetchedId) {
                  resolvedId = fetchedId
                  setPostMorningInsightId(fetchedId)
                }
              }
            }
            return { primaryFailed, fallbackFailed, resolvedId }
          }

          const handleRetry = async () => {
            const { primaryFailed: pf, fallbackFailed: ff, resolvedId: rid } = await performSave()
            if (rid) {
              flushSync(() => setPostMorningInsightId(rid))
            }
            loadTodayPlan({ silent: true })
            if (opts?.celebrateFirstTime) setFirstSparkCelebration(true)
            if (!pf) {
              window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Insight saved', type: 'success' } }))
            } else if (pf && !ff) {
              window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Insight taking longer than usual — it will appear shortly', type: 'info' } }))
            } else {
              window.dispatchEvent(new CustomEvent('toast', {
                detail: { message: 'Failed to save insight. Please try again.', type: 'error', onRetry: handleRetry },
              }))
            }
          }

          const { primaryFailed, fallbackFailed, resolvedId } = await performSave()
          if (resolvedId) {
            flushSync(() => setPostMorningInsightId(resolvedId))
          }
          loadTodayPlan({ silent: true })

          if (!primaryFailed) {
            window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Insight saved', type: 'success' } }))
          } else if (primaryFailed && !fallbackFailed) {
            window.dispatchEvent(new CustomEvent('toast', {
              detail: { message: 'Insight taking longer than usual — it will appear shortly', type: 'info' },
            }))
          } else {
            window.dispatchEvent(new CustomEvent('toast', {
              detail: { message: 'Failed to save insight. Please try again.', type: 'error', onRetry: handleRetry },
            }))
          }
          if (opts?.celebrateFirstTime) setFirstSparkCelebration(true)
        }
      )
      if (!freshOutcome.ok) {
        console.error('[generateFreshPostMorningInsight] stream failed:', freshOutcome.error)
        setPostMorningInsightFetchFailed(true)
        if (opts?.celebrateFirstTime) setFirstSparkCelebration(true)
        window.dispatchEvent(
          new CustomEvent('toast', {
            detail: {
              message: `Couldn't refresh insight: ${freshOutcome.error}`,
              type: 'error',
            },
          })
        )
      }
    } catch (err) {
      console.error('[MORNING] Failed to stream fresh insight:', err)
      setPostMorningInsightFetchFailed(true)
      if (opts?.celebrateFirstTime) setFirstSparkCelebration(true)
    }
  },
  [
    planDate,
    logBannedPhrasesIfAny,
    startStream,
    loadTodayPlan,
    tasks,
    decision,
    morningPlanView,
    setFirstSparkCelebration,
    freemiumSessionUser,
  ],
  )

  useEffect(() => {
    let cancelled = false
    const checkAuth = async () => {
      const session = await getUserSession()
      if (!session) {
        if (!cancelled) router.push('/auth/login')
        return
      }
      if (cancelled) return
      setUserTier(session.user.tier || 'beta')
      setFreemiumSessionUser({
        tier: session.user.tier,
        pro_features_enabled: session.user.pro_features_enabled,
      })

      // Load user's goal for personalized action plans
      const goal = await getUserGoal(session.user.id)
      if (cancelled) return
      setUserGoal(goal)

      const bundle = await fetchUserProfileBundle()
      if (cancelled) return
      setTierProfileRow(
        bundle
          ? {
              tier: bundle.tier ?? session.user.tier ?? null,
              created_at: bundle.created_at ?? null,
              trial_starts_at: bundle.trial_starts_at ?? null,
              trial_ends_at: bundle.trial_ends_at ?? null,
              stripe_subscription_status: bundle.stripe_subscription_status ?? null,
              pro_features_enabled: session.user.pro_features_enabled,
            }
          : null
      )
      {
        const sr = bundle?.current_streak
        setUserStreakDays(
          typeof sr === 'number' && Number.isFinite(sr) ? Math.max(0, Math.floor(sr)) : null
        )
      }
      {
        const raw = bundle?.struggles
        setFounderStruggleIds(
          Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string' && x.length > 0) : []
        )
      }
      const row = bundle
        ? { created_at: bundle.created_at ?? undefined, timezone: bundle.timezone ?? null }
        : null
      const tz = getUserTimezoneFromProfile(row)
      const dActive = getUserDaysActiveCalendar(row?.created_at ?? null, tz)
      setAccountDaysActive(dActive)

      const dwe = await getDaysWithEntries(session.user.id, supabase)
      const { count: evCount } = await supabase
        .from('evening_reviews')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', session.user.id)
      if (cancelled) return
      const ev = evCount ?? 0
      setInsightActivityGate({ dwe, ev })
      const insightsUnlockedNow = isMorningInsightsUnlocked(dwe, ev)

      const features = getFeatureAccess({
        tier: session.user.tier,
        pro_features_enabled: session.user.pro_features_enabled,
      })

      // Skip insight loading in tutorial mode (no morning prompt exists yet for new users)
      const tutorialParam = searchParams?.get('tutorial')
      if (tutorialParam === 'true' || tutorialParam === 'start') {
        return
      }

      if (features.dailyMorningPrompt && planDate && insightsUnlockedNow) {
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
              .select('id, prompt_text, prompt_type, stage_context, generated_at')
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
            const pmId = (postMorningRes.data as { id?: string }).id
            if (pmId) setPostMorningInsightId(pmId)
            console.log('[MORNING LOAD] Found post-morning insight for', planDate)
          } else if (fallbackRes.data?.length) {
            const postFromFallback = fallbackRes.data.find((p) => p.prompt_type === 'post_morning')
            if (postFromFallback) {
              postMorningInsightToShow = postFromFallback.prompt_text
              const fid = (postFromFallback as { id?: string }).id
              if (fid) setPostMorningInsightId(fid)
            }
          }

          console.log('[checkAuth] Setting insights - morning:', !!morningInsightToShow, 'postMorning:', !!postMorningInsightToShow)
          if (cancelled) return
          setMorningInsight(morningInsightToShow)
          setPostMorningInsight(postMorningInsightToShow)
          if (postMorningInsightToShow) {
            setPostMorningInsightFetchFailed(false)
          } else {
            setPostMorningInsightId(null)
          }
        } catch (error) {
          console.error('[MORNING LOAD] Exception:', error)
        }
      } else if (features.dailyMorningPrompt && planDate && !insightsUnlockedNow) {
        if (cancelled) return
        setMorningInsight(null)
        setPostMorningInsight(null)
        setPostMorningInsightId(null)
      }
    }
    void checkAuth()
    return () => {
      cancelled = true
    }
  }, [router, planDate, searchParams])

  useEffect(() => {
    const onSync = () => {
      void (async () => {
        const session = await getUserSession()
        if (!session) return
        const dwe = await getDaysWithEntries(session.user.id, supabase)
        const { count } = await supabase
          .from('evening_reviews')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', session.user.id)
        setInsightActivityGate({ dwe, ev: count ?? 0 })
      })()
    }
    window.addEventListener('data-sync-request', onSync)
    return () => window.removeEventListener('data-sync-request', onSync)
  }, [])

  useEffect(() => {
    if (!planDate) return
    const ac = new AbortController()
    void loadTodayPlan({ signal: ac.signal })
    return () => ac.abort()
  }, [planDate, retryTrigger, loadTodayPlan])

  /** Wipe local plan state when the URL / selected day changes (client nav does not remount the page). */
  useLayoutEffect(() => {
    if (!planDate) return
    setTasks([])
    setDecision(INITIAL_DECISION)
    setDecisionDbId(null)
    setEditingTasks(false)
    setEditingDecision(false)
  }, [planDate])

  const fetchMonthStatus = useCallback(async (month: Date, signal?: AbortSignal) => {
    const session = await getUserSession()
    if (!session) return
    const monthStr = format(month, 'yyyy-MM')
    try {
      const res = await fetch(`/api/user/month-status?month=${monthStr}`, {
        credentials: 'include',
        signal,
      })
      if (signal?.aborted) return
      if (res.ok) {
        const data = (await res.json()) as Record<string, DayStatus>
        if (signal?.aborted) return
        setMonthStatus(data)
      }
    } catch (e) {
      if (signal?.aborted || (e instanceof Error && e.name === 'AbortError')) return
    }
  }, [])

  useEffect(() => {
    if (!planDate) return
    const month = startOfMonth(new Date(planDate + 'T12:00:00'))
    const ac = new AbortController()
    void fetchMonthStatus(month, ac.signal)
    return () => ac.abort()
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

  const persistActionPlanNote = useCallback(async (task: Task) => {
    if (!task.dbId) return
    const session = await getUserSession()
    if (!session) return
    const writeAuth = await refreshSessionForWrite()
    if (!writeAuth.ok) return
    const note = task.actionPlanNote?.trim() || null
    const { error } = await supabase
      .from('morning_tasks')
      .update({
        action_plan_note: note,
        updated_at: new Date().toISOString(),
      })
      .eq('id', task.dbId)
      .eq('user_id', session.user.id)
    if (error) {
      console.error('[Morning] persist action_plan_note', error)
      return
    }
    setPlanUpdatedAt(new Date())
  }, [])

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
    if (isFirstTime && !isTutorial) {
      firstSaveMasterGateStartRef.current = performance.now()
    }
    setError(null)
    await new Promise((r) => setTimeout(r, 0))

    const session = await getUserSession()
    const filteredTasks = tasks.filter((t) => t.description.trim())
    const tasksForDb = filteredTasks.filter((t) => !t.movedToTomorrow)

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

    const writeAuth = await refreshSessionForWrite()
    if (!writeAuth.ok) {
      setSaving(false)
      setError(writeAuth.message)
      window.dispatchEvent(new CustomEvent('toast', { detail: { message: writeAuth.message, type: 'error' } }))
      router.push('/auth/login')
      return
    }

    try {
      const isProMorningSave = morningPlanView === 'pro'
      // Database allows unlimited tasks (migration 002). Tasks marked moved-to-tomorrow stay on their
      // next-day row until save finalizes (clears postponed_from_plan_date); do not re-insert them here.
      const firstNeedleIndex =
        isFirstTime && !isProMorningSave ? tasksForDb.findIndex((t) => t.description.trim()) : -1
      const tasksToSave = tasksForDb.map((t, i) => ({
        user_id: session.user.id,
        plan_date: planDate,
        task_order: i + 1,
        description: t.description.trim(),
        why_this_matters: t.whyThisMatters.trim() || null,
        needle_mover: isProMorningSave
          ? null
          : isFirstTime
            ? t.description.trim()
              ? i === firstNeedleIndex
              : null
            : (t.needleMover ?? null),
        is_proactive: isProMorningSave ? null : t.isProactive ?? null,
        action_plan: t.actionPlan || null,
        action_plan_note: t.actionPlanNote?.trim() || null,
        completed: t.completed || false,
        user_refined: isProMorningSave ? Boolean(t.userRefined) : false,
        recurring_blueprint_key:
          isProMorningSave && t.recurringBlueprintKey?.trim()
            ? t.recurringBlueprintKey.trim()
            : null,
      }))

      const persistMorningTasks = async () => {
        console.log('🔴 [SAVE] Calling Supabase: delete + insert tasks')
        const { error: delErr } = await supabase
          .from('morning_tasks')
          .delete()
          .eq('plan_date', planDate)
          .eq('user_id', session.user.id)
        if (delErr) return { data: null as { id: string }[] | null, error: delErr }
        if (tasksToSave.length === 0) return { data: [] as { id: string }[], error: null }
        return supabase.from('morning_tasks').insert(tasksToSave).select()
      }

      let { data: insertedTasks, error: insertTasksError } = await persistMorningTasks()
      if (insertTasksError && isRlsOrAuthPermissionError(insertTasksError)) {
        const again = await refreshSessionForWrite()
        if (again.ok) {
          ;({ data: insertedTasks, error: insertTasksError } = await persistMorningTasks())
        }
      }
      console.log('🔴 [SAVE] Supabase insert result:', {
        inserted: insertedTasks?.length,
        errorMessage: insertTasksError?.message,
        errorCode: (insertTasksError as { code?: string })?.code,
      })
      if (insertTasksError) {
        const e = insertTasksError as { message?: string; code?: string; details?: string; hint?: string }
        console.error('Error inserting tasks (detailed):', {
          message: e?.message,
          code: e?.code,
          details: e?.details,
          hint: e?.hint,
          error: insertTasksError,
        })
        throw insertTasksError
      }
      {
        let insertIdx = 0
        setTasks((prev) =>
          prev.map((t) => {
            const clearedMoved = t.movedToTomorrow ? { ...t, movedToTomorrow: false as const } : t
            if (t.movedToTomorrow) return clearedMoved
            const newId = insertedTasks?.[insertIdx++]?.id
            return newId ? { ...clearedMoved, dbId: newId } : clearedMoved
          })
        )
      }
      if (insertedTasks && insertedTasks.length > 0) {
        if (!planCreatedAt) setPlanCreatedAt(new Date())
        setPlanUpdatedAt(new Date())
      }

      if (decision.decision.trim()) {
        if (decisionDbId) {
          const runDecisionUpdate = () =>
            supabase
              .from('morning_decisions')
              .update({
                decision: decision.decision.trim(),
                decision_type: decision.decisionType,
                why_this_decision: isProMorningSave ? null : decision.whyThisDecision.trim() || null,
                updated_at: new Date().toISOString(),
              })
              .eq('id', decisionDbId)
          let { error: updateError } = await runDecisionUpdate()
          if (updateError && isRlsOrAuthPermissionError(updateError)) {
            const again = await refreshSessionForWrite()
            if (again.ok) ({ error: updateError } = await runDecisionUpdate())
          }
          if (updateError) throw updateError
        } else {
          const persistDecision = async () => {
            await supabase.from('morning_decisions').delete().eq('plan_date', planDate).eq('user_id', session.user.id)
            return supabase
              .from('morning_decisions')
              .insert({
                user_id: session.user.id,
                plan_date: planDate,
                decision: decision.decision.trim(),
                decision_type: decision.decisionType,
                why_this_decision: isProMorningSave ? null : decision.whyThisDecision.trim() || null,
              })
              .select()
              .single()
          }
          let { data: insertedDec, error: insertDecError } = await persistDecision()
          if (insertDecError && isRlsOrAuthPermissionError(insertDecError)) {
            const again = await refreshSessionForWrite()
            if (again.ok) ({ data: insertedDec, error: insertDecError } = await persistDecision())
          }
          if (insertDecError) throw insertDecError
          if (insertedDec) {
            setDecisionDbId(insertedDec.id)
            if (!planCreatedAt) setPlanCreatedAt(new Date())
          }
        }
        setPlanUpdatedAt(new Date())
      }

      const runPlanCommit = () =>
        supabase.from('morning_plan_commits').upsert(
          {
            user_id: session.user.id,
            plan_date: planDate,
            committed_at: new Date().toISOString(),
            original_task_count: filteredTasks.length,
          },
          { onConflict: 'user_id,plan_date' }
        )
      let { error: planCommitError } = await runPlanCommit()
      if (planCommitError && isRlsOrAuthPermissionError(planCommitError)) {
        const again = await refreshSessionForWrite()
        if (again.ok) ({ error: planCommitError } = await runPlanCommit())
      }
      if (planCommitError) throw planCommitError

      await supabase.from('morning_plan_autosave').delete().eq('user_id', session.user.id).eq('plan_date', planDate)

      const runFinalizePostponed = () =>
        supabase
          .from('morning_tasks')
          .update({ postponed_from_plan_date: null })
          .eq('user_id', session.user.id)
          .eq('postponed_from_plan_date', planDate)
      let { error: finalizePostponedError } = await runFinalizePostponed()
      if (finalizePostponedError && isRlsOrAuthPermissionError(finalizePostponedError)) {
        const again = await refreshSessionForWrite()
        if (again.ok) ({ error: finalizePostponedError } = await runFinalizePostponed())
      }
      if (finalizePostponedError) throw finalizePostponedError

      // For first-time flow, don't set hasPlan yet — stay in simplified view until insight/modal
      if (!isFirstTime) {
        setHasPlan(true)
      }
      setEditingTasks(false)
      setEditingDecision(false)

      window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Plan saved!', type: 'success' } }))
      console.log('🔴 [SAVE] DB save complete, starting insight generation...')

      const features = getFeatureAccess({
        tier: session.user.tier,
        pro_features_enabled: session.user.pro_features_enabled,
      })
      // Refresh journey counts so the “Almost there” card updates (commit is now in DB).
      try {
        const dwe = await getDaysWithEntries(session.user.id, supabase)
        const { count: evCount } = await supabase
          .from('evening_reviews')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', session.user.id)
        setInsightActivityGate({ dwe, ev: evCount ?? 0 })
      } catch (gateErr) {
        console.warn('[MORNING SAVE] insightActivityGate refresh failed:', gateErr)
      }

      // First non-tutorial save: master gate = min 8s on overlay + post-morning stream done, then badge modal.
      const firstSaveMasterGate = isFirstTime && !isTutorial
      if (firstSaveMasterGate) {
        let insightPromise: Promise<unknown> = Promise.resolve()
        if (features.dailyPostMorningPrompt) {
          setPostMorningInsightFetchFailed(false)
          insightPromise = generateFreshPostMorningInsight({ celebrateFirstTime: true })
        }
        const minWaitMs = 8000
        const minWait = new Promise<void>((resolve) => {
          const start = firstSaveMasterGateStartRef.current || performance.now()
          const elapsed = performance.now() - start
          const remaining = Math.max(0, minWaitMs - elapsed)
          window.setTimeout(resolve, remaining)
        })
        await Promise.all([insightPromise, minWait])

        if (!features.dailyPostMorningPrompt || !postMorningInsightUnlocked) {
          setPostMorningInsight(
            "You're focusing on what matters today. That's not random — it's where your energy wants to go."
          )
          setFirstSparkCelebration(true)
        }

        await (supabase.from('user_profiles') as any)
          .update({ onboarding_step: 2, updated_at: new Date().toISOString() })
          .eq('id', session.user.id)

        flushSync(() => {
          setShowFirstDayBadgeModal(true)
        })
        setSaving(false)
      } else if (!isTutorial && features.dailyPostMorningPrompt) {
        setPostMorningInsightFetchFailed(false)
        await generateFreshPostMorningInsight({ celebrateFirstTime: isFirstTime })
      } else if (!isTutorial && !features.dailyPostMorningPrompt) {
        console.log('[MORNING SAVE] Post-morning insight skipped — dailyPostMorningPrompt false for tier')
      }

      if (!firstSaveMasterGate) {
        maybeShowCalendarReminder(session.user.id)
      }

      // Tutorial mode: stay on morning page, show insight area step, then completion modal (no live AI)
      if (isTutorial) {
        await (supabase.from('user_profiles') as any)
          .update({ onboarding_step: 2, updated_at: new Date().toISOString() })
          .eq('id', session.user.id)
        setStep('insight_area')
        setCanProceed(true)
        setPostMorningInsightFetchFailed(false)
        setPostMorningInsight(
          'Nice work — your plan is saved. Come back this evening for a short reflection; that’s when Mrs. Deer connects the dots.'
        )
        setSaving(false)
        return
      }

      // Funnel step 3: plan complete
      fireFunnelStep(3, 'plan_complete')

      // Generate post-morning insight only (morning prompt is generated the previous evening)
      trackEvent('morning_plan_saved', {
        task_count: tasks.filter((t) => t.description.trim()).length,
        has_decision_log: !!(decision.decision?.trim()),
        needle_mover_count: isProMorningSave ? 0 : tasks.filter((t) => t.needleMover === true).length,
        plan_date: planDate,
      })
      // Founder analytics: enqueue pattern extraction from decision
      const decisionText = isProMorningSave
        ? (decision.decision?.trim() || '')
        : [decision.decision?.trim(), decision.whyThisDecision?.trim()].filter(Boolean).join('\n')
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
            task_count: filteredTasks.length,
            has_needle_mover: isProMorningSave ? false : filteredTasks.some((t) => t.needleMover === true),
          },
        }),
      }).catch(() => {})
      // Fallback: if they saved with tasks, they must have typed (track if we missed it)
      if (!typedFirstTaskRef.current && filteredTasks.length > 0) {
        typedFirstTaskRef.current = true
        trackJourneyStep('typed_first_task', { via: 'save_fallback' })
      }
      trackJourneyStep('saved_morning', { task_count: filteredTasks.length })

      console.log('[MORNING PLAN SAVE] dailyPostMorningPrompt:', features.dailyPostMorningPrompt)
    } catch (err) {
      const maybeMessage =
        err && typeof err === 'object' && 'message' in err ? (err as { message?: string }).message : undefined
      const errorMessage =
        maybeMessage || (err instanceof Error ? err.message : 'Failed to save. Please try again.')
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

  useEffect(() => {
    if (!(isFirstTime && !hasPlan && showFirstDayBadgeModal)) return
    if (typeof window === 'undefined') return
    window.scrollTo(0, 0)
  }, [isFirstTime, hasPlan, showFirstDayBadgeModal])

  const showMicroLessonToast = useCallback(async (fallback: string) => {
    try {
      const headers = await getClientAuthHeaders()
      const res = await fetch('/api/micro-lesson?location=morning', { credentials: 'include', headers })
      const json = await res.json()
      const msg = (json?.lesson?.message as string | undefined) ?? fallback
      window.dispatchEvent(new CustomEvent('toast', { detail: { message: msg, type: 'success' } }))
    } catch {
      window.dispatchEvent(new CustomEvent('toast', { detail: { message: fallback, type: 'success' } }))
    }
  }, [])

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
      if (newCompleted) {
        void showMicroLessonToast("Task done. That's one brick in the wall you're building.")
      }
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

  /** Day-1 / URL tutorial: sticky save + cockpit styling in ProMorningCanvas */
  const streamlinedMorningOnboarding = isTutorial || (isFirstTime && !hasPlan)

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 md:px-5 py-8 pt-24">
        <LoadingWithMicroLesson
          message="Mrs. Deer, your AI companion is thinking..."
          onRetry={() => setRetryTrigger((t) => t + 1)}
          timeoutMs={8000}
          location="morning"
        />
      </div>
    )
  }

  // Simplified first-time flow: minimal form, no advanced options
  if (isFirstTime && !hasPlan) {
    return (
      <div
        className="min-h-[100svh] overflow-y-auto max-w-3xl mx-auto px-4 md:px-5 pt-2 pb-44 max-lg:pb-48 md:pb-40"
        style={{ paddingTop: spacing['xl'] }}
      >
        {morningBrainDumpListening ? (
          <div
            className="pointer-events-none fixed inset-0 z-[35] bg-black/20 transition-opacity duration-300 dark:bg-black/35"
            aria-hidden
          />
        ) : null}
        {isResume && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Welcome back! You were about to plan your first day. Let&apos;s finish what you started.
          </p>
        )}

        <div ref={setBrainDumpPortalHost} className="mb-4 w-full" />

        <div className={emergencyNeedlePauseClass}>
          <ProMorningCanvas
            key={`${planDate || 'morning-first'}-first-plan`}
            planDate={planDate || getEffectivePlanDate()}
            planningMode={planningMode}
            tasks={tasks}
            setTasks={setTasks}
            decision={decision}
            setDecision={setDecision}
            draftStatus={morningDraftSaveStatus}
            onCommitPlan={() => savePlan()}
            saving={saving}
            hydratedDecisionStrategies={proMorningStrategyHydration}
            onDecisionStrategiesPersist={onProDecisionStrategiesPersist}
            brainDumpPortalHost={brainDumpPortalHost}
            onBrainDumpListeningChange={setMorningBrainDumpListening}
            streakDays={userStreakDays}
            founderStruggleIds={founderStruggleIds}
            freemiumUser={freemiumUserStrategic}
            tutorialMode={isTutorial || isFirstTime}
            tutorialCheckInMood={tutorialCheckInMood}
            tutorialCheckInEnergy={tutorialCheckInEnergy}
            onTutorialCheckInMoodChange={setTutorialCheckInMood}
            onTutorialCheckInEnergyChange={setTutorialCheckInEnergy}
            strategicProLocked={trialUx.status === 'expired'}
            streamlinedOnboarding
            stickySaveBar={streamlinedMorningOnboarding}
            saveOverlayMasterGate={isFirstTime && !isTutorial}
          />
        </div>

        {error && (
          <div className="mt-4 p-4 rounded-lg flex items-center gap-2 transition-all duration-200" style={{ backgroundColor: '#FEF2F2', borderColor: '#FECACA', borderWidth: '1px', color: '#B91C1C' }}>
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            {error}
          </div>
        )}

        {!isFirstTime && (
          <FirstTimeSuccessModal
            isOpen={showFirstTimeModal}
            onClose={() => setShowFirstTimeModal(false)}
            insight={postMorningInsight}
          />
        )}

        <FirstDayBadgeModal
          isOpen={showFirstDayBadgeModal}
          onClose={() => setShowFirstDayBadgeModal(false)}
          onContinue={() => {
            setShowFirstDayBadgeModal(false)
            setShowPostMorningReminderSetup(true)
          }}
          insight={postMorningInsight}
        />
        <ReminderSetupScreen
          isOpen={showPostMorningReminderSetup}
          onComplete={() => {
            setShowPostMorningReminderSetup(false)
            try {
              if (typeof window !== 'undefined') {
                sessionStorage.setItem(WOF_SESSION_INTENTION_PULSE_KEY, '1')
                const focus =
                  decision.decision?.trim() ||
                  tasks.find((t) => t.description.trim())?.description.trim() ||
                  ''
                if (focus) {
                  const payload: MrsDeerDashboardHookPayload = { focus }
                  sessionStorage.setItem(WOF_SESSION_MRS_DEER_HOOK_KEY, JSON.stringify(payload))
                }
              }
            } catch {
              // non-blocking
            }
            router.push('/dashboard?discovery=1')
          }}
          personalizationHint={
            tasks.find((t) => t.description.trim())?.description.trim() ||
            (decision.decision.trim() ? decision.decision.trim() : null) ||
            null
          }
        />
      </div>
    )
  }

  const tasksCompleted = tasks.filter((t) => t.completed).length

  const minMorningDateStr = format(subDays(new Date(), 30), 'yyyy-MM-dd')
  const maxMorningDateStr = format(subDays(new Date(), -1), 'yyyy-MM-dd')
  const todayStrNav = format(new Date(), 'yyyy-MM-dd')
  const isDesktopSidebar = !isMobile && !!planDate

  return (
    <div className={isDesktopSidebar ? 'flex min-h-screen' : undefined}>
      {isDesktopSidebar ? (
        <aside
          className="flex w-64 shrink-0 min-h-screen flex-col border-r border-white/10 bg-transparent"
          aria-label="Morning date navigation"
        >
          <PageSidebar
            variant="morning"
            title="Morning Plan"
            subtitle="Plan your day"
            titleIcon={<Sun className="h-6 w-6 text-white" aria-hidden />}
            selectedDate={planDate}
            minDate={minMorningDateStr}
            maxDate={maxMorningDateStr}
            todayStr={todayStrNav}
            onSelectDate={(date) => {
              setPlanDate(date)
              pushMorningWithDate(date)
            }}
            onPickDate={() => {
              setDisplayedMonth(startOfMonth(new Date(planDate + 'T12:00:00')))
              setCalendarOpen(true)
            }}
          />
        </aside>
      ) : null}
      <div
        className={
          isDesktopSidebar
            ? 'flex min-h-0 min-h-screen flex-1 flex-col overflow-y-auto bg-gray-50 pb-40 dark:bg-gray-950'
            : 'max-w-3xl mx-auto px-4 pb-40 pt-2 transition-all duration-200 md:px-5'
        }
      >
        {morningBrainDumpListening ? (
          <div
            className="pointer-events-none fixed inset-0 z-[35] bg-black/20 transition-opacity duration-300 dark:bg-black/35"
            aria-hidden
          />
        ) : null}
        <div className={isDesktopSidebar ? 'mx-auto max-w-3xl px-4 pb-40 pt-2 md:px-5' : 'contents'}>
      {showFreemiumAuditLinks && showFreemiumMorningLink ? (
        <div className="mb-1 flex justify-end">
          <Link
            href="/morning/free"
            className="text-xs font-medium text-slate-500 underline-offset-2 hover:underline dark:text-slate-400"
          >
            Preview free tier
          </Link>
        </div>
      ) : showFreemiumAuditLinks && showBackToProMorningLink ? (
        <div className="mb-1 flex justify-end">
          <Link
            href={backToProMorningHref}
            className="text-xs font-medium text-slate-500 underline-offset-2 hover:underline dark:text-slate-400"
          >
            Back to Pro tier
          </Link>
        </div>
      ) : null}
      {!isFirstTime && (
        <FirstTimeSuccessModal
          isOpen={showFirstTimeModal}
          onClose={() => setShowFirstTimeModal(false)}
          insight={postMorningInsight}
        />
      )}
      {isTutorial && <TutorialProgress currentStep={2} />}

      {planDate && isMobile ? (
        <>
          <WeekNavigator
            variant="morning"
            selectedDate={planDate}
            minDate={format(subDays(new Date(), 30), 'yyyy-MM-dd')}
            maxDate={format(addYears(new Date(), 5), 'yyyy-MM-dd')}
            monthStatus={monthStatus}
            selectedPillClassName="bg-[#152b50]"
            onSelectDate={(date) => {
              setPlanDate(date)
              pushMorningWithDate(date)
            }}
          />
          <PageHeader
            variant="morning"
            title="Morning Plan"
            titleIcon={<Sun className="w-6 h-6 text-white" aria-hidden />}
            subtitle={format(new Date(planDate + 'T12:00:00'), 'EEEE, MMMM d, yyyy')}
            onCalendarClick={() => {
              setDisplayedMonth(startOfMonth(new Date(planDate + 'T12:00:00')))
              setCalendarOpen(true)
            }}
          />
        </>
      ) : null}

      {/* Pro flow: Slot 1 — Morning spark (briefing), then Slot 2 — voice portal; pivot + stream follow in ProMorningCanvas. */}
      {trialUx.status === 'expired' && !isTutorial ? (
        <Card className="mb-6 border-[#152b50]/20 bg-gradient-to-br from-white via-slate-50/80 to-slate-50 dark:border-sky-900/30 dark:from-gray-900 dark:via-gray-900/95 dark:to-gray-950">
          <CardContent className="pt-6 pb-6">
            <p className="text-sm leading-relaxed text-gray-800 dark:text-gray-100">
              You&apos;ve completed your first week! To keep using my strategic alignment and emergency tools, let&apos;s
              officially move you to a Pro plan.
            </p>
            <Link href="/pricing" className="mt-4 inline-block">
              <Button variant="primary" type="button">
                View Pro plans
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : morningInsight ? (
        <AICoachPrompt message={morningInsight} trigger="morning_before" onClose={() => {}} />
      ) : null}

      <div ref={setBrainDumpPortalHost} className="mb-4 w-full" />

      <div className="mb-6 md:mb-8">
        <DatePickerModal
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
            pushMorningWithDate(date)
          }}
          monthStatus={monthStatus}
          selectedDate={planDate || undefined}
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
      </div>

      {/* Morning AI: after first full day (activity + evening) — matches Founder DNA journey */}
      {insightActivityGate !== null &&
        !morningInsightsReady &&
        !isFirstTime &&
        !isTutorial && (
        <Card className="mb-6 border-amber-200/80 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20">
          <CardContent className="pt-6 pb-6">
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-[#ef725c] shrink-0 mt-0.5" aria-hidden />
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {insightActivityGate.dwe < 1
                    ? 'Morning insights after your first founder day'
                    : 'Almost there — one evening to go'}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 leading-relaxed">
                  {insightActivityGate.dwe < 1 ? (
                    <>
                      You&apos;re building the arc: set the morning, then close the loop with your{' '}
                      <span className="font-semibold text-gray-900 dark:text-gray-100">first evening reflection</span>.
                      Mrs. Deer&apos;s tailored morning and post-plan insights unlock after that full founder day—the
                      first insight for tomorrow morning is generated when you finish the evening.
                    </>
                  ) : (
                    <>
                      You&apos;ve cleared the fog and locked today&apos;s plan. One step left: complete your{' '}
                      <span className="font-semibold text-gray-900 dark:text-gray-100">first evening reflection</span>{' '}
                      tonight to unlock Mrs. Deer&apos;s morning message and post-plan insight—including tomorrow&apos;s
                      tailored opening.
                    </>
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className={emergencyNeedlePauseClass}>
          <ProMorningCanvas
            key={planDate || 'morning-plan-date'}
            planDate={planDate || getEffectivePlanDate()}
            planningMode={planningMode}
            tasks={tasks}
            setTasks={setTasks}
            decision={decision}
            setDecision={setDecision}
            draftStatus={morningDraftSaveStatus}
            onCommitPlan={() => savePlan()}
            saving={saving}
            hydratedDecisionStrategies={proMorningStrategyHydration}
            onDecisionStrategiesPersist={onProDecisionStrategiesPersist}
            brainDumpPortalHost={brainDumpPortalHost}
            onBrainDumpListeningChange={setMorningBrainDumpListening}
            streakDays={userStreakDays}
            founderStruggleIds={founderStruggleIds}
            freemiumUser={freemiumUserStrategic}
            tutorialMode={isTutorial}
            tutorialCheckInMood={tutorialCheckInMood}
            tutorialCheckInEnergy={tutorialCheckInEnergy}
            onTutorialCheckInMoodChange={setTutorialCheckInMood}
            onTutorialCheckInEnergyChange={setTutorialCheckInEnergy}
            strategicProLocked={trialUx.status === 'expired'}
            streamlinedOnboarding={streamlinedMorningOnboarding}
            stickySaveBar={streamlinedMorningOnboarding}
          />
        </div>

      {error && (
        <div className="mb-4 p-4 rounded-lg flex items-center gap-2 transition-all duration-200" style={{ backgroundColor: '#FEF2F2', borderColor: '#FECACA', borderWidth: '1px', color: '#B91C1C' }}>
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Mrs. Deer AI Coach - Plan Review: post-morning insight at BOTTOM, after Power List and Decision Log */}
      {hasPlan &&
        showPostMorningInsightTier &&
        (postMorningInsight ||
          isStreamingPostMorning ||
          streamingError ||
          postMorningInsightFetchFailed) && (
        <div data-tutorial="mrs-deer-insight" className="scroll-mt-4">
          <AICoachPrompt
            key={postMorningInsightId ?? (isStreamingPostMorning ? 'streaming' : 'no-id')}
            topSlot={
              isStreamingPostMorning ? (
                <div
                  className="rounded-xl border border-dashed border-amber-200/80 bg-amber-50/40 px-4 py-3 dark:border-amber-800/40 dark:bg-amber-950/25"
                  role="status"
                  aria-live="polite"
                >
                  <p className="text-sm font-medium text-amber-950/90 dark:text-amber-100">
                    Mrs. Deer is reviewing your strategy…
                  </p>
                  <p className="mt-0.5 text-xs text-amber-800/80 dark:text-amber-200/75">
                    Plan saved — your audit streams in below.
                  </p>
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-amber-200/80 dark:bg-amber-900/50">
                    <div className="h-full w-2/5 animate-pulse rounded-full bg-[#ef725c]/70 dark:bg-[#f0886c]/60" />
                  </div>
                  <StreamingIndicator className="mt-3 opacity-90" />
                </div>
              ) : null
            }
            message={
              isStreamingPostMorning
                ? streamingInsight?.trim() || '…'
                : streamingError || postMorningInsightFetchFailed
                  ? `[AI ERROR] ${streamingError || 'Mrs. Deer could not finish your note. Use Retry below.'}`
                  : postMorningInsight!
            }
            trigger="morning_after"
            onClose={() => {}}
            insightId={postMorningInsightId ?? undefined}
            auditStreaming={isStreamingPostMorning}
            toneAdjustLocked={toneCalibrationLockedMorning}
          />
          {!isStreamingPostMorning && (streamingError || postMorningInsightFetchFailed) ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void generateFreshPostMorningInsight()}
              >
                Retry Mrs. Deer&apos;s note
              </Button>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Your plan is already saved — this only regenerates the bottom insight.
              </span>
            </div>
          ) : null}
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
              actionPlanNote: '',
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
            <Link href={`/evening?date=${getEffectivePlanDate()}#evening-form`}>
              <Button variant="secondary" size="sm">
                Evening Review →
              </Button>
            </Link>
          </div>
          {hasPlan && planCreatedAt && planTimestampsFooterText ? (
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800/80">
              <div
                className="flex items-center gap-2 text-[10px] text-slate-400 opacity-60 uppercase font-mono tracking-wider"
                role="group"
                aria-label={planTimestampsFooterText}
              >
                <InfoTooltip
                  text={planTimestampsFooterText}
                  presentation="popover"
                  position="top"
                />
                <span aria-hidden="true">Plan times</span>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <p
        className="mb-8 text-center text-[10px] leading-snug text-slate-500 opacity-40 dark:text-slate-400"
        aria-label="Optional keyboard shortcuts for Pro morning"
      >
        <span className="font-mono tracking-wide">
          ⌘J / Ctrl+J · prism · ⌘K / Ctrl+K · ideas · ⌘↵ / Ctrl+Enter · refine row · ⌘E / Ctrl+E · refine field · Tab →
          Task 1 · ⌥1–⌥3 · strategy cards
        </span>
      </p>

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

      {/* Threshold nudge when adding beyond recommended core task count (never blocks). */}
      {showAddFourthModal ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
          onClick={cancelAddFourthTask}
          role="presentation"
        >
          <div
            className="w-full max-w-md rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50/30 p-6 shadow-xl dark:border-amber-900/50 dark:bg-amber-950/20"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="focus-friction-modal-title"
          >
            <h3
              id="focus-friction-modal-title"
              className="mb-2 text-lg font-semibold text-amber-950 dark:text-amber-50"
            >
              <span aria-hidden>✨ </span>Mrs. Deer&apos;s Note: Protecting Your Focus
            </h3>
            <p className="mb-6 text-sm leading-relaxed text-amber-950/90 dark:text-amber-100/90">
              {(() => {
                const core = planningMode === 'light' ? 2 : 3
                const nextN = tasks.length + 1
                const ord =
                  nextN === 2 ? '2nd' : nextN === 3 ? '3rd' : nextN === 4 ? '4th' : `${nextN}th`
                const clause =
                  userStreakDays !== null &&
                  typeof userStreakDays === 'number' &&
                  Number.isFinite(userStreakDays) &&
                  userStreakDays >= 2
                    ? `to maintain your ${userStreakDays}-day momentum`
                    : `to build your momentum`
                return (
                  <>
                    Research suggests humans are most effective with {core} core priorities. Adding this {ord} task
                    shifts your energy—ensure it&apos;s worth the extra lift {clause}.
                  </>
                )
              })()}
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={cancelAddFourthTask}
                className="flex-1 min-w-[8rem] rounded-lg border border-amber-200/80 bg-white/90 py-2.5 px-4 text-sm font-medium text-amber-950 shadow-sm transition hover:bg-white dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-50 dark:hover:bg-amber-900/35"
              >
                Focus on {planningMode === 'light' ? 2 : 3}
              </button>
              <button
                type="button"
                onClick={confirmAddFourthTask}
                className="flex-1 min-w-[8rem] rounded-lg py-2.5 px-4 text-sm font-medium text-amber-900/95 underline-offset-2 hover:underline dark:text-amber-200/95"
              >
                I need this one
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <FirstBadgeCelebration
        isOpen={isFirstTime && showFirstSparkCelebration}
        onClose={() => {
          setFirstSparkCelebration(false)
        }}
        insight={postMorningInsight}
      />

      <CalendarReminderModal
        isOpen={showCalendarReminderModal}
        reminderTime={calendarReminderTime}
        onChangeTime={setCalendarReminderTime}
        onClose={() => setShowCalendarReminderModal(false)}
        onChooseCalendar={async (type) => {
          setCalendarReminderType(type)
          // Consider this "completed": don't nag again
          if (typeof window !== 'undefined') localStorage.setItem('calendarModalShown', '3')
          await handleCalendarAdd(type, calendarReminderTime)
          setShowCalendarReminderModal(false)
        }}
        onDontShowAgain={() => {
          if (typeof window !== 'undefined') localStorage.setItem('calendarModalShown', '3')
          setShowCalendarReminderModal(false)
        }}
        onLater={() => {
          const count = Number.parseInt(localStorage.getItem('calendarModalShown') || '0', 10) + 1
          localStorage.setItem('calendarModalShown', String(count))
          setShowCalendarReminderModal(false)
        }}
      />

        </div>
      </div>
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
  hideVoiceInput = false,
  highlightFirst,
  onSaveAsTemplate,
  onMoveToTomorrow,
  onUndoMove,
  onActionPlanNoteBlur,
}: {
  task: Task
  index: number
  onChange: (updates: Partial<Task>) => void
  onDelete?: () => void
  lang: ReturnType<typeof useUserLanguage>
  userGoal: UserGoal | null
  personalizedExamples?: { task: string; action: Record<string, string>; loading: boolean }
  hideVoiceInput?: boolean
  highlightFirst?: boolean
  onSaveAsTemplate?: () => void
  onMoveToTomorrow?: () => void
  onUndoMove?: () => void
  /** Persist `action_plan_note` when the optional field blurs (task must have dbId) */
  onActionPlanNoteBlur?: (task: Task) => void
}) {
  const moved = task.movedToTomorrow
  const taskDescRef = useRef<HTMLTextAreaElement | null>(null)
  const onTaskDescriptionChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange({ description: e.target.value }),
    [onChange]
  )
  const { MicButton } = useSpeechDictation(taskDescRef, task.description, onTaskDescriptionChange, {
    enabled: !hideVoiceInput,
  })
  const taskPlanEmoji =
    getActionPlanOptions(userGoal).find((o) => o.value === task.actionPlan)?.emoji ?? '🎯'

  return (
    <div
      data-tutorial={highlightFirst ? 'power-list' : undefined}
      className={`flex flex-col p-4 rounded-lg border space-y-3 ${
        highlightFirst
          ? 'border-[#ef725c] ring-2 ring-[#ef725c]/40 bg-[#FFF0EC]/50 dark:bg-[#2D1F1C]/50 dark:border-[#ef725c]'
          : moved
            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800'
            : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'
      }`}
    >
      <div className="flex w-full min-w-0 shrink-0 items-center justify-between gap-2">
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900 dark:text-gray-100 dark:text-white">
          <span className="tabular-nums">{index + 1}.</span>{' '}
          <span aria-hidden>{taskPlanEmoji}</span>
          {highlightFirst && (
            <span className="ml-2 text-xs font-normal text-[#ef725c]">— Start here</span>
          )}
        </span>
        <div className="flex shrink-0 items-center gap-0.5">
          {MicButton}
          {onSaveAsTemplate && (
            <button
              type="button"
              onClick={onSaveAsTemplate}
              className="p-1 text-sm text-gray-400 transition-colors hover:text-yellow-500"
              title="Save as template"
            >
              ⭐
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="p-1 text-gray-500 transition-colors hover:text-red-500 dark:text-gray-400"
              aria-label="Delete task"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex w-full min-w-0 max-w-full flex-col">
        <label className="mb-1 flex w-full items-center gap-1 text-xs font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300">
          Task <InfoTooltip text="What needs to get done today? Be specific." />
        </label>
        <SpeechTextField
          ref={taskDescRef}
          as="textarea"
          rows={1}
          hideSpeechButton
          value={task.description}
          onChange={onTaskDescriptionChange}
          placeholder={
            personalizedExamples?.loading
              ? lang.taskLabel
              : `e.g., ${personalizedExamples?.task ?? 'Write blog post, Research competitors'}`
          }
          className="box-border w-full max-w-full min-w-0 resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-transparent focus:ring-2 focus:ring-[#152b50] dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:ring-[#ef725c]"
          data-tutorial={highlightFirst ? 'first-task' : undefined}
        />
      </div>
      <div data-tutorial={highlightFirst ? 'task-why' : undefined}>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">Why</label>
        <SpeechToTextInput
          as="textarea"
          rows={1}
          hideSpeechButton={hideVoiceInput}
          value={task.whyThisMatters}
          onChange={(e) => onChange({ whyThisMatters: e.target.value })}
          placeholder={lang.priorityLabel}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-[#152b50] dark:focus:ring-[#ef725c] focus:border-transparent text-gray-900 dark:text-gray-100 dark:text-white bg-white dark:bg-gray-800 dark:bg-gray-800 resize-none"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1 flex items-center gap-1">
          How <InfoTooltip text="Choose how you'll approach this task: Milestone (deep work), Quick Win (fast task), Systemize (create a process), or Delegate (pass to someone else)." />
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

      {(() => {
        const guidance = task.actionPlan ? getActionPlanGuidance(task.actionPlan) : null
        if (!guidance) return null
        return (
          <div className="mt-1 pl-4 md:pl-6 border-l-2 border-gray-200 dark:border-gray-700 space-y-2">
            <p className="text-xs italic text-gray-500 dark:text-gray-400">
              ✨ {guidance.prompt}
            </p>
            <input
              type="text"
              value={task.actionPlanNote ?? ''}
              onChange={(e) => onChange({ actionPlanNote: e.target.value })}
              onBlur={(e) =>
                onActionPlanNoteBlur?.({ ...task, actionPlanNote: e.currentTarget.value })
              }
              placeholder={guidance.placeholder}
              className="w-full px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-none bg-transparent text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-[#ef725c]/40"
              aria-label="Optional note for your action plan"
            />
          </div>
        )
      })()}

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
