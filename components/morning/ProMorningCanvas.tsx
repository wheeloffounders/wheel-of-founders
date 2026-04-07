'use client'

import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'
import { format, parseISO, subDays } from 'date-fns'
import { flushSync } from 'react-dom'
import { Brain, Mic, MicOff, Pencil, Plus, Sparkles, Trash2, X } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { getUserSession } from '@/lib/auth'
import type { ActionPlanOption2, Task } from '@/app/morning/page'
import { ACTION_PLAN_OPTIONS_2 } from '@/app/morning/page'
import type { DecisionStrategyOption } from '@/lib/morning/pro-morning-oracle'
import {
  composeMrsDeerDecisionStrategies,
  fetchProOracleContext,
  fetchProMorningDecisionStrategies,
} from '@/lib/morning/pro-morning-oracle'
import { generateMetadata, suggestThreeTasksFromDecision } from '@/lib/morning/pro-ghostwriter'
import {
  isActionPlanMatrixKey,
  matrixKeyToPrismActionLabel,
  PRO_ACTION_PLAN_EMOJI,
  PRO_MATRIX_MANIFESTO_DISPLAY,
  proRefineThirdFieldCopy,
} from '@/lib/morning/pro-action-matrix'
import { formatProTaskRefinement, parseProTaskRefinement } from '@/lib/morning/pro-task-refinement'
import { normalizeTaskTitleKey, taskTitlesSimilar } from '@/lib/morning/task-title-similarity'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { colors } from '@/lib/design-tokens'
import type { DraftSaveStatus } from '@/lib/hooks/useDebouncedAutoSave'
import {
  processMorningBrainDump,
  type MorningBrainDumpResult,
  type BrainDumpTask,
} from '@/lib/morning/process-morning-brain-dump'
import {
  appendOverflowLines,
  countFilledBaseSlots,
  filterUniqueNewTasks,
  mergeCoreObjectiveText,
  mergeNewTasksIntoRows,
  sanitizeOverflowLine,
} from '@/lib/morning/morning-brain-dump-merge'
import { BrainDumpCard } from '@/components/BrainDumpCard'
import { MorningSaveProcessingOverlay } from '@/components/morning/MorningSaveProcessingOverlay'
import {
  dedupeRedundantWhyLines,
  sanitizeAiCardLabelText,
  stripDailyPivotMirrorFromWhy,
} from '@/lib/morning/sanitize-ai-json-text'
import { ProMorningAIError } from '@/lib/morning/pro-morning-api'
import { resolveStruggleMorningTitles } from '@/lib/morning/struggle-morning-titles'
import type { UserProfile } from '@/lib/features'
import { isMorningFeatureLocked } from '@/lib/features'
import { StrategicProLockOverlay } from '@/components/pro/StrategicProLockOverlay'
import {
  MorningTaskRowShell,
  morningTaskDescriptionInputClassName,
  morningTaskListGapClass,
  morningTaskRowActionBtnClass,
  morningStrategicCardWrapperClass,
  MORNING_COMPACT_TASK_THRESHOLD,
} from '@/components/morning/MorningTaskRow'
import { AutosizeTextarea } from '@/components/morning/AutosizeTextarea'

/** Mirrors morning `Decision`; Prism why is not shown in Pro UI and is cleared on save/autosave. */
type ProDecision = {
  decision: string
  decisionType: 'strategic' | 'tactical'
  whyThisDecision: string
}

export type ProMorningCanvasProps = {
  planDate: string
  planningMode: 'full' | 'light'
  tasks: Task[]
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>
  decision: ProDecision
  setDecision: React.Dispatch<React.SetStateAction<ProDecision>>
  draftStatus: DraftSaveStatus
  /** Persists to `morning_tasks` / `morning_decisions` / commit (same as Free save). */
  onCommitPlan: () => void | Promise<void>
  saving: boolean
  /** From `morning_plan_autosave.decision_json` (evening prebake); shown before any AI round-trip. */
  hydratedDecisionStrategies?: { strategies: DecisionStrategyOption[]; prebakedAt: string | null } | null
  /** Keeps parent autosave merge in sync with tray state (3 cards or cleared). */
  onDecisionStrategiesPersist?: (payload: {
    strategies: DecisionStrategyOption[] | null
    prebakedAt: string | null
  }) => void
  /** When set, Morning Brain Dump renders here (portal anchor on the morning page, above the week strip on mobile). */
  brainDumpPortalHost?: HTMLElement | null
  /** Ghost brain dump: sync page dim overlay with mic (Pro morning). */
  onBrainDumpListeningChange?: (listening: boolean) => void
  /** `user_profiles.current_streak` for focus-friction copy; null/undefined uses momentum fallback wording. */
  streakDays?: number | null
  /** Onboarding / profile "Biggest Struggles" ids — drives pivot + stream section labels. */
  founderStruggleIds?: string[] | null
  /** Session tier flags — freemium gates when `GLOBAL_BETA_OVERRIDE` is false. */
  freemiumUser?: UserProfile | null
  /** Onboarding tutorial: Pro shell + static welcome, no brain dump / oracle AI. */
  tutorialMode?: boolean
  tutorialCheckInMood?: number | null
  tutorialCheckInEnergy?: number | null
  onTutorialCheckInMoodChange?: (v: number) => void
  onTutorialCheckInEnergyChange?: (v: number) => void
  /** Trial expired (Day 8): lock Strategy Prism / alignment UX; task rows stay editable. */
  strategicProLocked?: boolean
  /**
   * First session / guided tutorial: lead with brain dump + top priorities, no mood/energy, no “add 4th row”,
   * minimal footer copy.
   */
  streamlinedOnboarding?: boolean
  /** Day-1 / URL tutorial: fixed save bar on small screens so CTA stays visible */
  stickySaveBar?: boolean
}

function highlightStreakPhrases(text: string): ReactNode[] {
  if (!text) return []
  const re = /(\d{1,4}\s*[-–]?\s*days?\b|\d{1,4}\s+days?\s+of\b)/gi
  const out: ReactNode[] = []
  let last = 0
  let m: RegExpExecArray | null
  let k = 0
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const chunk = m[0]
    out.push(
      <span
        key={`streak-${k++}`}
        className="inline-flex items-center gap-0.5 font-semibold text-[#ef725c] dark:text-[#f0886c]"
      >
        <span aria-hidden>🔥</span>
        {chunk}
      </span>
    )
    last = m.index + chunk.length
  }
  if (last < text.length) out.push(text.slice(last))
  return out.length ? out : [text]
}

function RefineFieldSkeleton({ lines = 2 }: { lines?: number }) {
  return (
    <div className="space-y-2" aria-hidden>
      {Array.from({ length: lines }, (_, i) => (
        <div
          key={i}
          className="h-3 w-full animate-pulse rounded bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700"
          style={{ animationDelay: `${i * 120}ms` }}
        />
      ))}
    </div>
  )
}

function newTaskRow(): Task {
  return {
    id: crypto.randomUUID?.() ?? `t-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    description: '',
    whyThisMatters: '',
    needleMover: null,
    isProactive: null,
    actionPlan: 'my_zone',
    actionPlanNote: '',
    completed: false,
    movedToTomorrow: false,
    userRefined: false,
    recurringBlueprintKey: null,
    blueprintAnchorTitle: null,
  }
}

type TraySuggestion = {
  id: string
  text: string
  suggestedActionPlan?: ActionPlanOption2
  actionTypeWhy?: string
}

type PendingTaskUndo = { slotIndex: number; task: Task }

function taskRowHasDeletableContent(task: Task): boolean {
  if (task.description.trim()) return true
  if (task.whyThisMatters.trim()) return true
  const { how, onlyICanDo } = parseProTaskRefinement(task.actionPlanNote)
  return Boolean(how.trim() || onlyICanDo.trim())
}

function taskRowHasRefinementDraft(task: Task): boolean {
  if (task.whyThisMatters.trim()) return true
  const { how, onlyICanDo } = parseProTaskRefinement(task.actionPlanNote)
  return Boolean(how.trim() || onlyICanDo.trim())
}

function rowHasStrategicInlineContent(task: Task): boolean {
  const { how, onlyICanDo } = parseProTaskRefinement(task.actionPlanNote)
  return Boolean(task.whyThisMatters.trim() || how.trim() || onlyICanDo.trim())
}

type TaskBlueprintChip = {
  description: string
  actionPlan: ActionPlanOption2
  count: number
  blueprintKey: string
  source: 'preset' | 'freq'
}

/** First-run smart triggers — matrix locked until title drifts from anchor. */
const PRESET_TASK_BLUEPRINTS: TaskBlueprintChip[] = [
  {
    description: 'Weekly marketing plan',
    actionPlan: 'my_zone',
    count: 0,
    blueprintKey: 'preset:weekly_marketing',
    source: 'preset',
  },
  {
    description: 'Team sync',
    actionPlan: 'systemize',
    count: 0,
    blueprintKey: 'preset:team_sync',
    source: 'preset',
  },
  {
    description: 'Product roadmap review',
    actionPlan: 'my_zone',
    count: 0,
    blueprintKey: 'preset:product_roadmap',
    source: 'preset',
  },
]

const TRAY_CELEBRATION_LINES = [
  'Excellent choices. Your day is set.',
  'Strategic alignment achieved. ✨',
] as const

/** Dashboard widget parity: white surface + subtle lift (see `components/ui/card`) */
const DASHBOARD_MORNING_CARD =
  'rounded-none border-2 border-gray-200 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.07)] dark:border-gray-700 dark:bg-gray-800 dark:shadow-[0_4px_24px_rgba(0,0,0,0.35)]'

/** Gradient CTA only — native `<button>` so we never mix `Button`’s `backgroundColor` with `background` shorthand */
const COCKPIT_SAVE_BUTTON_CLASS =
  'flex min-h-[48px] w-full items-center justify-center rounded-none border-2 border-orange-600 bg-gradient-to-r from-orange-500 to-red-500 px-6 text-base font-semibold text-white shadow-[0_8px_28px_rgba(249,115,22,0.35)] transition hover:opacity-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-200 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none'

function getSpeechRecognitionCtor(): (new () => any) | null {
  if (typeof window === 'undefined') return null
  const w = window as Window & { SpeechRecognition?: new () => any; webkitSpeechRecognition?: new () => any }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export function ProMorningCanvas({
  planDate,
  planningMode,
  tasks,
  setTasks,
  decision,
  setDecision,
  draftStatus,
  onCommitPlan,
  saving,
  hydratedDecisionStrategies = null,
  onDecisionStrategiesPersist,
  brainDumpPortalHost = null,
  onBrainDumpListeningChange,
  streakDays = null,
  founderStruggleIds = null,
  freemiumUser = null,
  tutorialMode = false,
  tutorialCheckInMood = null,
  tutorialCheckInEnergy = null,
  onTutorialCheckInMoodChange,
  onTutorialCheckInEnergyChange,
  strategicProLocked = false,
  streamlinedOnboarding = false,
  stickySaveBar = false,
}: ProMorningCanvasProps) {
  const cockpitOnboarding = tutorialMode || streamlinedOnboarding
  const router = useRouter()
  const tasksRef = useRef(tasks)
  tasksRef.current = tasks
  const { headerTitle: pivotHeaderTitle, sectionTitle: streamSectionTitle } = useMemo(
    () => resolveStruggleMorningTitles(founderStruggleIds),
    [founderStruggleIds]
  )
  const streamTasksPhrase = streamSectionTitle.toLowerCase()
  const lockStrategicUx = strategicProLocked && !tutorialMode

  const voiceLocked = useMemo(
    () => isMorningFeatureLocked('voice_to_text', freemiumUser),
    [freemiumUser]
  )
  const strategicLocked = useMemo(
    () => isMorningFeatureLocked('refine_strategic_context', freemiumUser),
    [freemiumUser]
  )
  const decisionAiLocked = useMemo(
    () => isMorningFeatureLocked('decision_ai_suggestions', freemiumUser),
    [freemiumUser]
  )
  const blueprintsLocked = useMemo(
    () => isMorningFeatureLocked('pro_blueprints', freemiumUser),
    [freemiumUser]
  )

  /** Default 3 strategic rows (full) or 2 (light); optional +1 via “+ Add Strategic Action”; consultant note when tasks.length > 3. */
  const baseStreamSlots = planningMode === 'light' ? 2 : 3
  /** Hard cap on priority rows (Rule-of-3 base + expanded stream). */
  const maxStreamSlots = 10
  const [streamExtraSlot, setStreamExtraSlot] = useState(false)
  const [blueprintUpgradeOpen, setBlueprintUpgradeOpen] = useState(false)
  const slotCount = streamExtraSlot ? maxStreamSlots : baseStreamSlots
  const traySuggestCount: 2 | 3 = baseStreamSlots === 2 ? 2 : 3
  const [decisionStrategies, setDecisionStrategies] = useState<DecisionStrategyOption[] | null>(null)
  /** Set when strategies came from evening prebake (`decision_strategies_prebaked_at`). */
  const [strategiesPrebakedAt, setStrategiesPrebakedAt] = useState<string | null>(null)
  /** Strategy prism tray is pull-on-demand (not shown until user asks). */
  const [strategyPrismOpen, setStrategyPrismOpen] = useState(false)
  const [oracleLoading, setOracleLoading] = useState(false)
  const [suggestLoading, setSuggestLoading] = useState(false)
  const [traySuggestions, setTraySuggestions] = useState<TraySuggestion[] | null>(null)
  const [traySuccessLine, setTraySuccessLine] = useState<string | null>(null)
  const [flyInSlot, setFlyInSlot] = useState<number | null>(null)
  const [inputHighlightSlot, setInputHighlightSlot] = useState<number | null>(null)
  const [trayRefreshLockedUntil, setTrayRefreshLockedUntil] = useState(0)
  const [refineIndex, setRefineIndex] = useState<number | null>(null)
  const [refineWhy, setRefineWhy] = useState('')
  const [refineHow, setRefineHow] = useState('')
  const [refineOnly, setRefineOnly] = useState('')
  const [refineActionPlan, setRefineActionPlan] = useState<ActionPlanOption2>('my_zone')
  /** User edited Why / How / third field — changing approach must confirm; no auto ghostwriter steamroll. */
  const [refineStrategicDirty, setRefineStrategicDirty] = useState(false)
  /**
   * Iron gate: Why / How / details stay read-only until this session explicitly confirms the action approach
   * (Confirm button, change matrix + ghostwriter done, or ✨ draft finished). Never inferred from existing AI text.
   */
  const [refineApproachConfirmed, setRefineApproachConfirmed] = useState(false)
  const ghostwritingRef = useRef<Set<number>>(new Set())
  const ghostWriteGenRef = useRef<Map<number, number>>(new Map())
  const [ghostwritingSlots, setGhostwritingSlots] = useState<number[]>([])
  const prevGhostwritingRef = useRef<Set<number>>(new Set())
  const [refineFieldsReveal, setRefineFieldsReveal] = useState(0)
  /** Freemium: task title edited inside refine while strategic fields are locked. */
  const [refineTaskTitle, setRefineTaskTitle] = useState('')
  /** True only after user clicks “Add Strategic Action” from the 3-slot (or 2-slot) baseline — not on hydrate. */
  const [showFocusFriction, setShowFocusFriction] = useState(false)
  const [taskBlueprints, setTaskBlueprints] = useState<TaskBlueprintChip[]>([])
  const oracleRanForPlanRef = useRef<string | null>(null)
  const prevDecisionTrimRef = useRef(decision.decision.trim())
  const traySuggestionsRef = useRef(traySuggestions)
  traySuggestionsRef.current = traySuggestions
  const decisionStrategiesRef = useRef<DecisionStrategyOption[] | null>(null)
  decisionStrategiesRef.current = decisionStrategies
  const decisionTextRef = useRef(decision.decision)
  decisionTextRef.current = decision.decision
  const focusedProTaskSlotRef = useRef<number | null>(null)
  const prefersReducedMotion = useReducedMotion()

  const [pendingTaskUndo, setPendingTaskUndo] = useState<PendingTaskUndo | null>(null)
  const pendingTaskUndoRef = useRef<PendingTaskUndo | null>(null)
  pendingTaskUndoRef.current = pendingTaskUndo
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const exclusiveSpeechStopRef = useRef<(() => void) | null>(null)
  const [speechSupported, setSpeechSupported] = useState(false)
  useEffect(() => {
    setSpeechSupported(Boolean(getSpeechRecognitionCtor()))
  }, [])
  const [morningBrainDumpText, setMorningBrainDumpText] = useState('')
  const [brainDumpInterruptEpoch, setBrainDumpInterruptEpoch] = useState(0)
  const [brainDumpProcessing, setBrainDumpProcessing] = useState(false)
  const [brainDumpOverflow, setBrainDumpOverflow] = useState<string[] | null>(null)
  /** Rule of 3: too many new tasks vs filled base slots — user picks add-all vs holding pen. */
  const [brainDumpPriorityModal, setBrainDumpPriorityModal] = useState<{
    uniqueNew: BrainDumpTask[]
    res: MorningBrainDumpResult
    pivotAfterMerge: string
    existingFilled: number
  } | null>(null)
  const [decisionHighlightFromBrainDump, setDecisionHighlightFromBrainDump] = useState(false)
  const [brainDumpReviewBanner, setBrainDumpReviewBanner] = useState(false)
  const rowSpeechRecognitionRef = useRef<any>(null)
  const [rowSpeechSlot, setRowSpeechSlot] = useState<number | null>(null)
  /** True when row dictation was stopped on purpose — blocks auto-restart after `onend`. */
  const rowSpeechUserStopRef = useRef(false)
  const voiceLockedForRowSpeechRef = useRef(voiceLocked)
  const brainDumpProcessingForRowSpeechRef = useRef(brainDumpProcessing)
  const savingForRowSpeechRef = useRef(saving)
  voiceLockedForRowSpeechRef.current = voiceLocked
  brainDumpProcessingForRowSpeechRef.current = brainDumpProcessing
  savingForRowSpeechRef.current = saving

  const [saveProcessingOverlayDismissed, setSaveProcessingOverlayDismissed] = useState(false)
  useEffect(() => {
    if (!saving) setSaveProcessingOverlayDismissed(false)
  }, [saving])

  const clearUndoTimer = useCallback(() => {
    if (undoTimerRef.current !== null) {
      clearTimeout(undoTimerRef.current)
      undoTimerRef.current = null
    }
  }, [])

  useEffect(() => () => clearUndoTimer(), [clearUndoTimer])

  useEffect(() => {
    clearUndoTimer()
    setPendingTaskUndo(null)
    setShowFocusFriction(false)
    setStreamExtraSlot(false)
    setBrainDumpOverflow(null)
    setDecisionHighlightFromBrainDump(false)
    setBrainDumpReviewBanner(false)
    setMorningBrainDumpText('')
    setBrainDumpInterruptEpoch((n) => n + 1)
    rowSpeechUserStopRef.current = true
    try {
      rowSpeechRecognitionRef.current?.stop()
    } catch {
      /* ignore */
    }
    rowSpeechRecognitionRef.current = null
    setRowSpeechSlot(null)
    exclusiveSpeechStopRef.current = null
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset speech on date change only
  }, [planDate, clearUndoTimer])

  useEffect(() => {
    if (tutorialMode) {
      setTaskBlueprints([])
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const session = await getUserSession()
        if (!session?.user?.id || cancelled) return
        const since = format(subDays(new Date(), 30), 'yyyy-MM-dd')
        const { data, error } = await supabase
          .from('morning_tasks')
          .select('description, action_plan')
          .eq('user_id', session.user.id)
          .gte('plan_date', since)
        if (cancelled) return
        if (error || !data?.length) {
          setTaskBlueprints([])
          return
        }
        const freq = new Map<string, { count: number; actionPlan: ActionPlanOption2; label: string }>()
        for (const row of data) {
          const d = typeof row.description === 'string' ? row.description.trim() : ''
          if (d.length < 4) continue
          const key = d.toLowerCase()
          const rawAp = row.action_plan
          const plan: ActionPlanOption2 =
            typeof rawAp === 'string' && isActionPlanMatrixKey(rawAp) ? rawAp : 'my_zone'
          const prev = freq.get(key)
          if (!prev) freq.set(key, { count: 1, actionPlan: plan, label: d })
          else {
            prev.count += 1
            freq.set(key, prev)
          }
        }
        const top = [...freq.values()]
          .sort((a, b) => b.count - a.count)
          .slice(0, 3)
          .map((v) => ({
            description: v.label,
            actionPlan: v.actionPlan,
            count: v.count,
            blueprintKey: `freq:${normalizeTaskTitleKey(v.label)}`,
            source: 'freq' as const,
          }))
        setTaskBlueprints(top)
      } catch {
        if (!cancelled) setTaskBlueprints([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [planDate, tutorialMode])

  /** Ensure the stream always has at least the default row count (3 full / 2 light). */
  useEffect(() => {
    setTasks((prev) => {
      if (prev.length >= baseStreamSlots) return prev
      const next = [...prev]
      while (next.length < baseStreamSlots) next.push(newTaskRow())
      return next
    })
  }, [planDate, planningMode, baseStreamSlots, setTasks])

  useEffect(() => {
    const hasBeyondBase = tasks.slice(baseStreamSlots).some(
      (row) => row && (row.description.trim() || taskRowHasDeletableContent(row))
    )
    if (hasBeyondBase) setStreamExtraSlot(true)
  }, [planDate, planningMode, tasks, baseStreamSlots])

  const addStrategicStreamSlot = useCallback(() => {
    if (streamExtraSlot) return
    if (tasks.length === baseStreamSlots) {
      setShowFocusFriction(true)
    }
    setStreamExtraSlot(true)
    setTasks((prev) => {
      const next = [...prev]
      while (next.length < maxStreamSlots) next.push(newTaskRow())
      return next
    })
  }, [tasks.length, baseStreamSlots, maxStreamSlots, streamExtraSlot, setTasks])

  const taskAt = useCallback(
    (i: number): Task => tasks[i] ?? newTaskRow(),
    [tasks]
  )

  const showProtectingFocusNote =
    showFocusFriction && streamExtraSlot && tasks.length > baseStreamSlots

  const dismissFocusFrictionKeepFourth = useCallback(() => {
    setShowFocusFriction(false)
  }, [])

  const focusOnThreeRemoveFourth = useCallback(() => {
    setShowFocusFriction(false)
    setStreamExtraSlot(false)
    setTasks((prev) => prev.slice(0, baseStreamSlots))
  }, [baseStreamSlots, setTasks])

  useEffect(() => {
    if (tasks.length <= baseStreamSlots) setShowFocusFriction(false)
  }, [tasks.length, baseStreamSlots])

  const momentumClause = useMemo(() => {
    const n =
      typeof streakDays === 'number' && Number.isFinite(streakDays) ? Math.max(0, Math.floor(streakDays)) : 0
    return n >= 2 ? `to maintain your ${n}-day momentum` : `to build your momentum`
  }, [streakDays])

  useEffect(() => {
    if (tutorialMode) return
    if (decisionAiLocked) return
    const trimmed = decision.decision.trim()
    if (trimmed) {
      setDecisionStrategies(null)
      setStrategiesPrebakedAt(null)
      setStrategyPrismOpen(false)
      return
    }
    if (!planDate || !strategyPrismOpen) return

    if (decisionStrategies && decisionStrategies.length >= 3) return

    const pre = hydratedDecisionStrategies
    if (pre?.strategies && pre.strategies.length >= 3) {
      setDecisionStrategies(pre.strategies)
      setStrategiesPrebakedAt(pre.prebakedAt ?? null)
      oracleRanForPlanRef.current = planDate
      setOracleLoading(false)
      onDecisionStrategiesPersist?.({
        strategies: pre.strategies,
        prebakedAt: pre.prebakedAt ?? null,
      })
      return
    }

    if (oracleRanForPlanRef.current === planDate) return

    let cancelled = false
    setOracleLoading(true)
    ;(async () => {
      try {
        const session = await getUserSession()
        if (!session?.user?.id || cancelled) return
        try {
          const strategies = await fetchProMorningDecisionStrategies(planDate)
          if (cancelled) return
          setDecisionStrategies(strategies)
          setStrategiesPrebakedAt(null)
          onDecisionStrategiesPersist?.({ strategies, prebakedAt: null })
        } catch {
          const ctx = await fetchProOracleContext(supabase, session.user.id, planDate)
          if (cancelled) return
          const fb = composeMrsDeerDecisionStrategies(ctx)
          setDecisionStrategies(fb)
          setStrategiesPrebakedAt(null)
          onDecisionStrategiesPersist?.({ strategies: fb, prebakedAt: null })
        }
        oracleRanForPlanRef.current = planDate
      } finally {
        if (!cancelled) setOracleLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [
    planDate,
    decision.decision,
    strategyPrismOpen,
    decisionStrategies,
    hydratedDecisionStrategies,
    onDecisionStrategiesPersist,
    decisionAiLocked,
    tutorialMode,
  ])

  useEffect(() => {
    if (!decisionAiLocked) return
    setStrategyPrismOpen(false)
    setOracleLoading(false)
    setTraySuggestions(null)
    setTraySuccessLine(null)
  }, [decisionAiLocked])

  useEffect(() => {
    oracleRanForPlanRef.current = null
    setStrategyPrismOpen(false)
    setDecisionStrategies(null)
    setStrategiesPrebakedAt(null)
  }, [planDate])

  useEffect(() => {
    const t = decision.decision.trim()
    if (prevDecisionTrimRef.current.length > 0 && t.length === 0) {
      oracleRanForPlanRef.current = null
    }
    prevDecisionTrimRef.current = t
  }, [decision.decision])

  /** Hide tray only; keep cards in memory for instant reopen + autosave merge. */
  const dismissDecisionStrategies = useCallback(() => {
    setStrategyPrismOpen(false)
  }, [])

  const invokeStrategyPrism = useCallback(() => {
    if (decisionAiLocked) return
    if (decision.decision.trim()) return
    setStrategyPrismOpen(true)
  }, [decision.decision, decisionAiLocked])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return
      if (e.key !== 'j' && e.key !== 'J') return
      if (decisionTextRef.current.trim()) return
      if (decisionAiLocked) return
      const el = e.target as HTMLElement | null
      if (el?.closest('[role="dialog"][aria-labelledby="pro-refine-title"]')) return
      e.preventDefault()
      invokeStrategyPrism()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [decisionAiLocked, invokeStrategyPrism])

  const updateRowDescription = useCallback(
    (index: number, description: string) => {
      setTasks((prev) => {
        const next = [...prev]
        while (next.length <= index) next.push(newTaskRow())
        const cur = next[index] ?? newTaskRow()
        let row = { ...cur, description }
        const anchor = cur.blueprintAnchorTitle?.trim()
        if (cur.recurringBlueprintKey && anchor && description.trim()) {
          if (!taskTitlesSimilar(description, anchor)) {
            row = {
              ...row,
              recurringBlueprintKey: null,
              blueprintAnchorTitle: null,
            }
          }
        }
        next[index] = row
        return next
      })
    },
    [setTasks]
  )

  const onTaskDescriptionInputChange = useCallback(
    (index: number, value: string) => {
      updateRowDescription(index, value)
    },
    [updateRowDescription]
  )

  const runGhostwriterForRow = useCallback(
    async (
      index: number,
      forcedDescription?: string,
      forcedActionPlan?: ActionPlanOption2,
      forcedDecision?: string
    ) => {
      if (strategicLocked) return
      const name = (forcedDescription !== undefined ? forcedDescription : taskAt(index).description).trim()
      if (!name) return
      if (ghostwritingRef.current.has(index) && forcedActionPlan === undefined) return

      const nextGen = (ghostWriteGenRef.current.get(index) ?? 0) + 1
      ghostWriteGenRef.current.set(index, nextGen)

      ghostwritingRef.current.add(index)
      setGhostwritingSlots((a) => (a.includes(index) ? a : [...a, index]))
      try {
        const plan = forcedActionPlan ?? taskAt(index).actionPlan ?? 'my_zone'
        const dec = (forcedDecision ?? decision.decision).trim()
        const meta = await generateMetadata(name, dec || decision.decision, plan)
        if (ghostWriteGenRef.current.get(index) !== nextGen) return
        setTasks((prev) => {
          const next = [...prev]
          while (next.length <= index) next.push(newTaskRow())
          const cur = next[index] ?? newTaskRow()
          const { how: h0, onlyICanDo: o0 } = parseProTaskRefinement(cur.actionPlanNote)
          const note = formatProTaskRefinement(
            meta.how || h0,
            meta.onlyICanDo || o0
          )
          next[index] = {
            ...cur,
            whyThisMatters: meta.why || cur.whyThisMatters,
            actionPlanNote: note || cur.actionPlanNote,
            actionPlan: forcedActionPlan !== undefined ? forcedActionPlan : cur.actionPlan,
          }
          return next
        })
      } finally {
        if (ghostWriteGenRef.current.get(index) === nextGen) {
          ghostwritingRef.current.delete(index)
          setGhostwritingSlots((a) => a.filter((x) => x !== index))
        }
      }
    },
    [decision.decision, setTasks, taskAt]
  )

  const appendToRowDescription = useCallback(
    (index: number, piece: string) => {
      const c = piece.trim()
      if (!c) return
      setTasks((prev) => {
        const next = [...prev]
        while (next.length <= index) next.push(newTaskRow())
        const cur = next[index] ?? newTaskRow()
        const d = cur.description.trim()
        next[index] = { ...cur, description: d ? `${d} ${c}` : c }
        return next
      })
    },
    [setTasks]
  )

  const stopRowSpeechRecognition = useCallback(() => {
    rowSpeechUserStopRef.current = true
    try {
      rowSpeechRecognitionRef.current?.stop()
    } catch {
      /* ignore */
    }
    rowSpeechRecognitionRef.current = null
    setRowSpeechSlot(null)
  }, [])

  const toggleRowSpeech = useCallback(
    (index: number) => {
      if (voiceLocked || brainDumpProcessing || saving || !getSpeechRecognitionCtor()) return
      if (rowSpeechSlot === index) {
        stopRowSpeechRecognition()
        exclusiveSpeechStopRef.current = null
        return
      }
      exclusiveSpeechStopRef.current?.()
      setBrainDumpInterruptEpoch((n) => n + 1)
      stopRowSpeechRecognition()

      const Ctor = getSpeechRecognitionCtor()
      if (!Ctor) return

      rowSpeechUserStopRef.current = false

      const recognition = new Ctor()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'en-US'

      recognition.onresult = (event: any) => {
        let final = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const r = event.results[i]
          if (r.isFinal) final += r[0]?.transcript ?? ''
        }
        const chunk = final.trim()
        if (chunk) appendToRowDescription(index, chunk)
      }

      recognition.onerror = (event: { error?: string }) => {
        if (event.error === 'not-allowed' || event.error === 'aborted') {
          rowSpeechUserStopRef.current = true
        }
        rowSpeechRecognitionRef.current = null
        setRowSpeechSlot(null)
        exclusiveSpeechStopRef.current = null
      }

      recognition.onend = () => {
        if (rowSpeechRecognitionRef.current !== recognition) return
        if (
          rowSpeechUserStopRef.current ||
          voiceLockedForRowSpeechRef.current ||
          brainDumpProcessingForRowSpeechRef.current ||
          savingForRowSpeechRef.current
        ) {
          rowSpeechRecognitionRef.current = null
          setRowSpeechSlot(null)
          exclusiveSpeechStopRef.current = null
          return
        }
        window.setTimeout(() => {
          if (rowSpeechRecognitionRef.current !== recognition || rowSpeechUserStopRef.current) return
          if (
            voiceLockedForRowSpeechRef.current ||
            brainDumpProcessingForRowSpeechRef.current ||
            savingForRowSpeechRef.current
          ) {
            rowSpeechRecognitionRef.current = null
            setRowSpeechSlot(null)
            exclusiveSpeechStopRef.current = null
            return
          }
          try {
            recognition.start()
          } catch {
            rowSpeechRecognitionRef.current = null
            setRowSpeechSlot(null)
            exclusiveSpeechStopRef.current = null
          }
        }, 0)
      }

      rowSpeechRecognitionRef.current = recognition
      exclusiveSpeechStopRef.current = stopRowSpeechRecognition

      try {
        recognition.start()
        setRowSpeechSlot(index)
      } catch {
        rowSpeechRecognitionRef.current = null
        setRowSpeechSlot(null)
        exclusiveSpeechStopRef.current = null
      }
    },
    [
      appendToRowDescription,
      brainDumpProcessing,
      rowSpeechSlot,
      saving,
      stopRowSpeechRecognition,
      voiceLocked,
    ]
  )

  const scrollToDailyPivotAfterDump = useCallback(() => {
    if (typeof window === 'undefined') return
    const el = document.getElementById('morning-daily-pivot')
    if (!el) return
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' })
    })
  }, [])

  const applyMergeTasksToStream = useCallback(
    async (tasksSnapshot: Task[], uniqueNew: BrainDumpTask[], pivotForWhys: string) => {
      const { nextTasks, ghostRows, overflowTitles, needExtraSlots } = mergeNewTasksIntoRows(
        tasksSnapshot,
        uniqueNew,
        baseStreamSlots,
        maxStreamSlots,
        newTaskRow
      )
      if (needExtraSlots) {
        setStreamExtraSlot(true)
        setShowFocusFriction(true)
      }
      setTasks(nextTasks)
      if (overflowTitles.length) {
        setBrainDumpOverflow((prev) => appendOverflowLines(prev, overflowTitles))
      }
      for (const g of ghostRows) {
        await runGhostwriterForRow(g.index, g.title, g.actionPlan)
      }
      const pivot = pivotForWhys.trim()
      setTasks((prev) => {
        const whys = Array.from({ length: baseStreamSlots }, (_, i) => prev[i]?.whyThisMatters?.trim() ?? '')
        let deduped = dedupeRedundantWhyLines(whys)
        if (pivot) {
          deduped = deduped.map((line) => stripDailyPivotMirrorFromWhy(line, pivot))
        }
        if (!deduped.some((w, idx) => w !== whys[idx])) return prev
        const next = [...prev]
        for (let i = 0; i < baseStreamSlots; i++) {
          const cur = next[i]
          if (cur && deduped[i]) next[i] = { ...cur, whyThisMatters: deduped[i] }
        }
        return next
      })
    },
    [
      baseStreamSlots,
      maxStreamSlots,
      runGhostwriterForRow,
      setTasks,
      setStreamExtraSlot,
      setShowFocusFriction,
      setBrainDumpOverflow,
    ]
  )

  const runBrainDumpSort = useCallback(
    async (transcript: string) => {
      if (voiceLocked) return
      let completedOk = false
      try {
        const res = await processMorningBrainDump({
          transcript,
          decision: decision.decision,
          maxTasks: maxStreamSlots,
        })

        const uniqueNew = filterUniqueNewTasks(tasks, res.tasks)
        const overflowLines = res.overflow.map(sanitizeOverflowLine).filter(Boolean)
        if (overflowLines.length) {
          setBrainDumpOverflow((prev) => appendOverflowLines(prev, overflowLines))
        }

        let pivot = decision.decision.trim()
        const m1 = mergeCoreObjectiveText(pivot, res.core_objective)
        if (m1) pivot = m1
        const m2 = mergeCoreObjectiveText(pivot, res.decision)
        if (m2) pivot = m2
        const coreUpdated = pivot !== decision.decision.trim()
        if (coreUpdated) {
          setDecision((d) => ({
            ...d,
            decision: pivot,
            decisionType: 'strategic',
            whyThisDecision: '',
          }))
          setDecisionHighlightFromBrainDump(true)
          setBrainDumpReviewBanner(true)
          window.dispatchEvent(
            new CustomEvent('toast', {
              detail: {
                type: 'success',
                message: 'Core objective updated — review your Daily pivot.',
              },
            })
          )
        }

        const apiHadNothing =
          (res.tasks?.length ?? 0) === 0 &&
          overflowLines.length === 0 &&
          !res.core_objective?.trim() &&
          !res.decision?.trim()

        if (apiHadNothing) {
          window.dispatchEvent(
            new CustomEvent('toast', {
              detail: { type: 'info', message: 'No new tasks found. Mental cache cleared.' },
            })
          )
          completedOk = true
          setMorningBrainDumpText('')
          return
        }

        if (uniqueNew.length === 0 && !coreUpdated && overflowLines.length === 0) {
          window.dispatchEvent(
            new CustomEvent('toast', {
              detail: { type: 'info', message: 'No new tasks found. Mental cache cleared.' },
            })
          )
          completedOk = true
          setMorningBrainDumpText('')
          return
        }

        if (uniqueNew.length === 0) {
          if (overflowLines.length && !coreUpdated) {
            window.dispatchEvent(
              new CustomEvent('toast', {
                detail: {
                  type: 'info',
                  message: `More ideas are in the holding pen below.`,
                },
              })
            )
          }
          completedOk = true
          setMorningBrainDumpText('')
          return
        }

        const existingFilled = countFilledBaseSlots(tasks, baseStreamSlots)
        if (existingFilled + uniqueNew.length > baseStreamSlots) {
          setBrainDumpPriorityModal({
            uniqueNew,
            res,
            pivotAfterMerge: pivot,
            existingFilled,
          })
          completedOk = true
          setMorningBrainDumpText('')
          return
        }

        await applyMergeTasksToStream(tasks, uniqueNew, pivot)

        window.dispatchEvent(
          new CustomEvent('toast', {
            detail: {
              type: 'success',
              message: `Added ${uniqueNew.length} ${uniqueNew.length === 1 ? 'priority' : 'priorities'} to your stream.`,
            },
          })
        )
        completedOk = true
        setMorningBrainDumpText('')
      } catch (e) {
        const msg =
          e instanceof ProMorningAIError
            ? e.message
            : e instanceof Error
              ? e.message
              : 'Could not process brain dump.'
        window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'error', message: msg } }))
      } finally {
        setBrainDumpProcessing(false)
        exclusiveSpeechStopRef.current = null
      }
      if (completedOk) {
        window.setTimeout(() => scrollToDailyPivotAfterDump(), 80)
      }
    },
    [
      applyMergeTasksToStream,
      baseStreamSlots,
      decision.decision,
      maxStreamSlots,
      runGhostwriterForRow,
      scrollToDailyPivotAfterDump,
      setDecision,
      setTasks,
      tasks,
      voiceLocked,
    ]
  )

  type BrainDumpPriorityPayload = NonNullable<typeof brainDumpPriorityModal>

  const confirmBrainDumpPriorityChoice = useCallback(
    async (choice: 'add-all' | 'holding-pen' | 'cancel', payload?: BrainDumpPriorityPayload) => {
      if (choice === 'cancel') {
        setBrainDumpPriorityModal(null)
        return
      }
      const p = payload
      if (!p) return
      setBrainDumpPriorityModal(null)
      setBrainDumpProcessing(true)
      try {
        if (choice === 'holding-pen') {
          const lines = p.uniqueNew.map((t) => sanitizeOverflowLine(t.title)).filter(Boolean)
          if (lines.length) {
            setBrainDumpOverflow((prev) => appendOverflowLines(prev, lines))
          }
          window.dispatchEvent(
            new CustomEvent('toast', {
              detail: {
                type: 'info',
                message: `Moved ${p.uniqueNew.length} ${p.uniqueNew.length === 1 ? 'item' : 'items'} to the holding pen.`,
              },
            })
          )
        } else {
          await applyMergeTasksToStream(tasksRef.current, p.uniqueNew, p.pivotAfterMerge)
          window.dispatchEvent(
            new CustomEvent('toast', {
              detail: {
                type: 'success',
                message: `Added ${p.uniqueNew.length} ${p.uniqueNew.length === 1 ? 'priority' : 'priorities'} to your stream.`,
              },
            })
          )
        }
        window.setTimeout(() => scrollToDailyPivotAfterDump(), 80)
      } finally {
        setBrainDumpProcessing(false)
        exclusiveSpeechStopRef.current = null
      }
    },
    [applyMergeTasksToStream, scrollToDailyPivotAfterDump, tasks]
  )

  const runMorningBrainDumpSortFromCard = useCallback(
    async (dumpText?: string) => {
      const raw = (dumpText ?? morningBrainDumpText).trim()
      if (raw.length < 8) return
      await runBrainDumpSort(raw)
    },
    [morningBrainDumpText, runBrainDumpSort]
  )

  const handleBrainDumpListeningChange = useCallback(
    (listening: boolean) => {
      onBrainDumpListeningChange?.(listening)
      if (listening) {
        exclusiveSpeechStopRef.current?.()
        stopRowSpeechRecognition()
      }
    },
    [onBrainDumpListeningChange, stopRowSpeechRecognition]
  )

  useEffect(() => {
    return () => {
      try {
        rowSpeechRecognitionRef.current?.stop()
      } catch {
        /* ignore */
      }
    }
  }, [])

  const applyDecisionStrategy = useCallback(
    (opt: DecisionStrategyOption) => {
      if (decisionAiLocked) return
      const rawDec = opt.text.trim()
      const decisionText = rawDec ? sanitizeAiCardLabelText(rawDec) || rawDec : ''
      const plan = opt.suggestedActionPlan

      setDecision((d) => ({ ...d, decision: decisionText }))

      setTasks((prev) => {
        const next = [...prev]
        while (next.length < slotCount) next.push(newTaskRow())
        for (let i = 0; i < slotCount; i++) {
          const cur = next[i] ?? newTaskRow()
          if (plan && (i === 0 || !cur.description.trim())) {
            next[i] = { ...cur, actionPlan: plan }
          }
        }
        const t0 = (next[0] ?? newTaskRow()).description.trim()
        if (plan && t0) {
          queueMicrotask(() => void runGhostwriterForRow(0, t0, plan, decisionText))
        }
        return next
      })

      if (plan && refineIndex === 0) {
        setRefineActionPlan(plan)
        setRefineFieldsReveal((x) => x + 1)
      }

      setDecisionStrategies(null)
      setStrategiesPrebakedAt(null)
      setStrategyPrismOpen(false)
      onDecisionStrategiesPersist?.({ strategies: null, prebakedAt: null })
    },
    [
      decisionAiLocked,
      onDecisionStrategiesPersist,
      refineIndex,
      runGhostwriterForRow,
      setDecision,
      setTasks,
      slotCount,
    ]
  )

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!e.altKey || e.metaKey || e.ctrlKey) return
      if (e.key !== '1' && e.key !== '2' && e.key !== '3') return
      const list = decisionStrategiesRef.current
      if (decisionAiLocked) return
      if (!strategyPrismOpen || !list?.length || decisionTextRef.current.trim()) return
      const el = e.target as HTMLElement | null
      const field = el?.closest('input, textarea, select, [contenteditable="true"]')
      if (field) {
        const id = (field as HTMLInputElement).id
        if (id !== 'pro-decision') return
      }
      const i = Number(e.key) - 1
      const opt = list[i]
      if (!opt) return
      e.preventDefault()
      applyDecisionStrategy(opt)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [applyDecisionStrategy, decisionAiLocked, strategyPrismOpen])

  const fetchSuggestionsToTray = useCallback(
    async (opts?: { fromTrayRefresh?: boolean }) => {
      if (decisionAiLocked) return
      if (opts?.fromTrayRefresh) {
        setTrayRefreshLockedUntil(Date.now() + 2000)
      }
      setTraySuccessLine(null)
      setSuggestLoading(true)
      try {
        const lines = await suggestThreeTasksFromDecision(decision.decision, traySuggestCount)
        const stamp = Date.now()
        const rows = lines
          .map((line, i) => {
            const text = line.text.trim()
            if (!text) return null
            const row: TraySuggestion = { id: `tray-${stamp}-${i}`, text }
            if (line.suggestedActionPlan) row.suggestedActionPlan = line.suggestedActionPlan
            if (line.actionTypeWhy) row.actionTypeWhy = line.actionTypeWhy
            return row
          })
          .filter((s): s is TraySuggestion => s !== null)
        setTraySuggestions(rows.length > 0 ? rows : null)
      } finally {
        setSuggestLoading(false)
      }
    },
    [decision.decision, traySuggestCount]
  )

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'k') return
      if (!decisionTextRef.current.trim()) return
      if (suggestLoading) return
      const el = e.target as HTMLElement | null
      if (el?.closest('[role="dialog"][aria-labelledby="pro-refine-title"]')) return
      if (traySuggestions !== null && traySuggestions.length > 0) return
      e.preventDefault()
      void fetchSuggestionsToTray()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [decisionAiLocked, fetchSuggestionsToTray, suggestLoading, traySuggestions])

  useEffect(() => {
    if (trayRefreshLockedUntil <= Date.now()) return
    const ms = trayRefreshLockedUntil - Date.now()
    const id = window.setTimeout(() => setTrayRefreshLockedUntil(0), ms)
    return () => clearTimeout(id)
  }, [trayRefreshLockedUntil])

  const dismissTray = useCallback(() => {
    setTraySuggestions(null)
    setTraySuccessLine(null)
  }, [])

  const firstEmptySlot = useCallback((): number | null => {
    for (let i = 0; i < slotCount; i++) {
      if (!taskAt(i).description.trim()) return i
    }
    return null
  }, [slotCount, taskAt])

  const hasEmptySlot = firstEmptySlot() !== null

  const filledStreamSlots = useMemo(
    () => tasks.slice(0, slotCount).filter((t) => t.description.trim()).length,
    [tasks, slotCount]
  )

  /** Marathon mode: many filled priorities — tighten rows so Core Objective / CTA stay in view. */
  const compactRows = filledStreamSlots > MORNING_COMPACT_TASK_THRESHOLD
  /** Expanded stream with several empty slots — slim placeholders so they don’t stack full height. */
  const slimEmptyRows =
    streamExtraSlot &&
    slotCount > baseStreamSlots &&
    filledStreamSlots < slotCount &&
    slotCount - filledStreamSlots >= 2

  const presetTitleNorms = useMemo(
    () => new Set(PRESET_TASK_BLUEPRINTS.map((p) => normalizeTaskTitleKey(p.description))),
    []
  )

  const freqBlueprintsFiltered = useMemo(
    () => taskBlueprints.filter((b) => !presetTitleNorms.has(normalizeTaskTitleKey(b.description))),
    [taskBlueprints, presetTitleNorms]
  )

  const blueprintChipsRow = useMemo(
    () => [...PRESET_TASK_BLUEPRINTS, ...freqBlueprintsFiltered],
    [freqBlueprintsFiltered]
  )

  const showBlueprintsSection =
    !tutorialMode && filledStreamSlots < 3 && blueprintChipsRow.length > 0

  const addSuggestionToPlan = useCallback(
    (suggestion: TraySuggestion) => {
      const slot = firstEmptySlot()
      if (slot === null) return
      const plan = suggestion.suggestedActionPlan ?? 'my_zone'
      const rawLine = suggestion.text.trim()
      const line = rawLine ? sanitizeAiCardLabelText(rawLine) || rawLine : ''
      if (!line) return
      setTasks((prev) => {
        const next = [...prev]
        while (next.length <= slot) next.push(newTaskRow())
        const cur = next[slot] ?? newTaskRow()
        next[slot] = {
          ...cur,
          description: line,
          actionPlan: plan,
        }
        return next
      })
      setInputHighlightSlot(slot)
      window.setTimeout(() => setInputHighlightSlot(null), 520)
      setTraySuggestions((prev) => {
        if (!prev) return null
        const next = prev.filter((s) => s.id !== suggestion.id)
        if (next.length === 0) {
          queueMicrotask(() => {
            setTraySuccessLine(
              TRAY_CELEBRATION_LINES[Math.floor(Math.random() * TRAY_CELEBRATION_LINES.length)]
            )
          })
          return []
        }
        return next
      })
      if (!prefersReducedMotion) {
        setFlyInSlot(slot)
        window.setTimeout(() => setFlyInSlot(null), 520)
      }
      void runGhostwriterForRow(slot, line, plan)
    },
    [firstEmptySlot, prefersReducedMotion, runGhostwriterForRow, setTasks]
  )

  const applyBlueprint = useCallback(
    (bp: TaskBlueprintChip) => {
      if (blueprintsLocked) return
      const slot = firstEmptySlot()
      if (slot === null) {
        window.dispatchEvent(
          new CustomEvent('toast', {
            detail: { message: 'No open slot — clear a row to use a blueprint.', type: 'info' },
          })
        )
        return
      }
      const text = bp.description.trim()
      setTasks((prev) => {
        const next = [...prev]
        while (next.length <= slot) next.push(newTaskRow())
        const cur = next[slot] ?? newTaskRow()
        next[slot] = {
          ...cur,
          description: text,
          actionPlan: bp.actionPlan,
          recurringBlueprintKey: bp.blueprintKey,
          blueprintAnchorTitle: text,
        }
        return next
      })
      setInputHighlightSlot(slot)
      window.setTimeout(() => setInputHighlightSlot(null), 520)
      if (!prefersReducedMotion) {
        setFlyInSlot(slot)
        window.setTimeout(() => setFlyInSlot(null), 520)
      }
      void runGhostwriterForRow(slot, text, bp.actionPlan)
    },
    [blueprintsLocked, firstEmptySlot, prefersReducedMotion, runGhostwriterForRow, setTasks]
  )

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const list = traySuggestionsRef.current
      const open = list !== null && list.length > 0 && !suggestLoading
      if (!open) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const el = e.target as HTMLElement | null
      if (el?.closest('input, textarea, select, [contenteditable="true"]')) return
      if (e.key !== '1' && e.key !== '2' && e.key !== '3') return
      const i = Number(e.key) - 1
      const suggestion = list[i]
      if (!suggestion) return
      e.preventDefault()
      addSuggestionToPlan(suggestion)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [suggestLoading, addSuggestionToPlan])

  const persistRefineForIndex = useCallback(
    (i: number, why: string, how: string, only: string, actionPlan: ActionPlanOption2) => {
      setTasks((prev) => {
        const next = [...prev]
        while (next.length <= i) next.push(newTaskRow())
        const cur = next[i] ?? newTaskRow()
        next[i] = {
          ...cur,
          whyThisMatters: why.trim(),
          actionPlanNote: formatProTaskRefinement(how, only),
          actionPlan,
          userRefined: true,
        }
        return next
      })
    },
    [setTasks]
  )

  const recordStrategicPreference = useCallback(
    async (taskTitle: string, why: string, how: string, only: string) => {
      const title = taskTitle.trim()
      const howT = how.trim()
      if (!title || title.length < 3 || howT.length < 15) return
      const parts: string[] = []
      if (why.trim()) parts.push(`Why: ${why.trim().slice(0, 400)}`)
      parts.push(`How: ${howT.slice(0, 800)}`)
      if (only.trim()) parts.push(`Only I can: ${only.trim().slice(0, 400)}`)
      const preferenceText = parts.join(' | ').slice(0, 3900)
      try {
        await fetch('/api/user/strategic-preference', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ taskTitle: title, preferenceText }),
        })
      } catch {
        /* non-blocking */
      }
    },
    []
  )

  const openRefine = useCallback(
    (index: number) => {
      if (refineIndex === index) return
      if (refineIndex !== null && refineIndex !== index) {
        if (strategicLocked) {
          updateRowDescription(refineIndex, refineTaskTitle)
        } else {
          const prevTask = taskAt(refineIndex)
          void recordStrategicPreference(prevTask.description, refineWhy, refineHow, refineOnly)
          persistRefineForIndex(refineIndex, refineWhy, refineHow, refineOnly, refineActionPlan)
        }
      }
      const t = taskAt(index)
      const { how, onlyICanDo } = parseProTaskRefinement(t.actionPlanNote)
      setRefineWhy(t.whyThisMatters || '')
      setRefineHow(how)
      setRefineOnly(onlyICanDo)
      setRefineActionPlan(t.actionPlan || 'my_zone')
      setRefineTaskTitle(t.description || '')
      setRefineStrategicDirty(false)
      setRefineApproachConfirmed(strategicLocked)
      setRefineIndex(index)
      setRefineFieldsReveal((x) => x + 1)
      prevGhostwritingRef.current = new Set(ghostwritingSlots)
    },
    [
      ghostwritingSlots,
      persistRefineForIndex,
      recordStrategicPreference,
      refineActionPlan,
      refineHow,
      refineIndex,
      refineOnly,
      refineTaskTitle,
      refineWhy,
      strategicLocked,
      taskAt,
      updateRowDescription,
    ]
  )

  const onRowKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>, index: number) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        openRefine(index)
        return
      }
      if (e.key === 'Enter' && e.shiftKey) {
        e.preventDefault()
        void runGhostwriterForRow(index)
        if (index + 1 < slotCount) {
          const nextEl = document.querySelector<HTMLTextAreaElement>(`[data-pro-task-slot="${index + 1}"]`)
          nextEl?.focus()
        }
        return
      }
      if (e.key === 'Enter') {
        return
      }
    },
    [openRefine, runGhostwriterForRow, slotCount]
  )

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'e') return
      const el = e.target as HTMLElement | null
      if (el?.closest('[role="dialog"][aria-labelledby="pro-refine-title"]')) return
      const slot = focusedProTaskSlotRef.current
      if (slot === null || slot < 0 || slot >= slotCount) return
      e.preventDefault()
      openRefine(slot)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [openRefine, slotCount])

  useEffect(() => {
    if (refineIndex === null) return
    const now = new Set(ghostwritingSlots)
    const prev = prevGhostwritingRef.current
    if (prev.has(refineIndex) && !now.has(refineIndex)) {
      const t = taskAt(refineIndex)
      const { how, onlyICanDo } = parseProTaskRefinement(t.actionPlanNote)
      setRefineWhy(t.whyThisMatters || '')
      setRefineHow(how)
      setRefineOnly(onlyICanDo)
      setRefineFieldsReveal((x) => x + 1)
      setRefineApproachConfirmed(true)
    }
    prevGhostwritingRef.current = now
  }, [ghostwritingSlots, refineIndex, tasks, taskAt])

  const saveRefine = useCallback(() => {
    if (refineIndex === null) return
    const t = taskAt(refineIndex)
    void recordStrategicPreference(t.description, refineWhy, refineHow, refineOnly)
    persistRefineForIndex(refineIndex, refineWhy, refineHow, refineOnly, refineActionPlan)
    setRefineStrategicDirty(false)
    setRefineApproachConfirmed(true)
    setRefineIndex(null)
  }, [
    persistRefineForIndex,
    recordStrategicPreference,
    refineActionPlan,
    refineHow,
    refineIndex,
    refineOnly,
    refineWhy,
    taskAt,
  ])

  const regenerateRefineDraft = useCallback(() => {
    if (strategicLocked) return
    if (refineIndex === null) return
    if (ghostwritingSlots.includes(refineIndex)) return
    setRefineStrategicDirty(false)
    void runGhostwriterForRow(refineIndex, undefined, refineActionPlan)
  }, [ghostwritingSlots, refineActionPlan, refineIndex, runGhostwriterForRow, strategicLocked])

  /** Accept current matrix for this session: unlock if copy exists; otherwise run ghostwriter first (unlock when it finishes). */
  const confirmRefineApproach = useCallback(() => {
    if (strategicLocked) return
    if (refineIndex === null || refineApproachConfirmed) return
    if (ghostwritingSlots.includes(refineIndex)) return
    const allEmpty =
      !refineWhy.trim() && !refineHow.trim() && !refineOnly.trim()
    if (allEmpty) {
      void runGhostwriterForRow(refineIndex, undefined, refineActionPlan)
    } else {
      setRefineApproachConfirmed(true)
    }
  }, [
    ghostwritingSlots,
    refineActionPlan,
    refineApproachConfirmed,
    refineHow,
    refineIndex,
    refineOnly,
    refineWhy,
    runGhostwriterForRow,
    strategicLocked,
  ])

  const restoreDeletedTask = useCallback(() => {
    const p = pendingTaskUndoRef.current
    if (!p) return
    clearUndoTimer()
    setTasks((prev) => {
      const next = [...prev]
      while (next.length <= p.slotIndex) next.push(newTaskRow())
      next[p.slotIndex] = { ...p.task }
      return next
    })
    setPendingTaskUndo(null)
  }, [clearUndoTimer, setTasks])

  const softDeleteTaskSlot = useCallback(
    (index: number) => {
      clearUndoTimer()
      if (pendingTaskUndoRef.current) {
        setPendingTaskUndo(null)
      }

      const base = taskAt(index)
      const merged: Task =
        refineIndex === index
          ? strategicLocked
            ? { ...base, description: refineTaskTitle.trim() || base.description }
            : {
                ...base,
                whyThisMatters: refineWhy,
                actionPlanNote: formatProTaskRefinement(refineHow, refineOnly),
                actionPlan: refineActionPlan,
              }
          : { ...base }

      if (!taskRowHasDeletableContent(merged)) return

      ghostwritingRef.current.delete(index)
      setGhostwritingSlots((a) => a.filter((x) => x !== index))

      if (refineIndex === index) {
        setRefineStrategicDirty(false)
        setRefineApproachConfirmed(true)
        setRefineIndex(null)
      }

      setTasks((prev) => {
        const next = [...prev]
        while (next.length <= index) next.push(newTaskRow())
        next[index] = newTaskRow()
        return next
      })

      setPendingTaskUndo({ slotIndex: index, task: { ...merged } })
      undoTimerRef.current = setTimeout(() => {
        undoTimerRef.current = null
        setPendingTaskUndo((p) => (p?.slotIndex === index ? null : p))
      }, 10_000)
    },
    [
      clearUndoTimer,
      refineActionPlan,
      refineHow,
      refineIndex,
      refineOnly,
      refineTaskTitle,
      refineWhy,
      setTasks,
      strategicLocked,
      taskAt,
    ]
  )

  /** Flush open refinements into `tasks` before commit so Save & Start My Day never misses drawer edits. */
  const commitPlanWithRefineFlush = useCallback(() => {
    clearUndoTimer()
    // Drop undo snapshot: commit empty row to DB on Save & Start My Day.
    setPendingTaskUndo(null)
    if (refineIndex !== null) {
      if (strategicLocked) {
        flushSync(() => {
          updateRowDescription(refineIndex, refineTaskTitle)
          setRefineStrategicDirty(false)
          setRefineApproachConfirmed(true)
          setRefineIndex(null)
        })
      } else {
        const t = taskAt(refineIndex)
        void recordStrategicPreference(t.description, refineWhy, refineHow, refineOnly)
        flushSync(() => {
          persistRefineForIndex(refineIndex, refineWhy, refineHow, refineOnly, refineActionPlan)
          setRefineStrategicDirty(false)
          setRefineApproachConfirmed(true)
          setRefineIndex(null)
        })
      }
    }
    return onCommitPlan()
  }, [
    clearUndoTimer,
    onCommitPlan,
    persistRefineForIndex,
    recordStrategicPreference,
    refineActionPlan,
    refineHow,
    refineIndex,
    refineOnly,
    refineTaskTitle,
    refineWhy,
    strategicLocked,
    taskAt,
    updateRowDescription,
  ])

  useEffect(() => {
    if (refineIndex === null) return
    if (ghostwritingSlots.includes(refineIndex)) return
    const t = window.setTimeout(() => {
      if (strategicLocked) {
        document.getElementById('refine-task-title')?.focus()
        return
      }
      if (refineApproachConfirmed) {
        document.getElementById('refine-why')?.focus()
      } else {
        const confirmBtn = document.getElementById('refine-confirm-approach')
        if (confirmBtn) confirmBtn.focus()
        else document.getElementById('refine-action-plan')?.focus()
      }
    }, 0)
    return () => clearTimeout(t)
  }, [refineIndex, ghostwritingSlots, refineFieldsReveal, refineApproachConfirmed, strategicLocked])

  const draftLabel =
    draftStatus === 'syncing'
      ? 'Syncing…'
      : draftStatus === 'saved'
        ? 'Draft saved'
        : draftStatus === 'error'
          ? 'Could not sync draft'
          : null

  const refineThirdCopy = refineIndex !== null ? proRefineThirdFieldCopy(refineActionPlan) : null

  const refineRowHasBlueprint =
    refineIndex !== null && Boolean(taskAt(refineIndex).recurringBlueprintKey?.trim())

  const showTaskConsultantTrigger =
    !decisionAiLocked &&
    Boolean(decision.decision.trim()) &&
    !(traySuggestions !== null && traySuggestions.length > 0)
  const showSuggestConsultantLoading =
    showTaskConsultantTrigger &&
    suggestLoading &&
    (traySuggestions === null || traySuggestions.length === 0)

  const morningActionBlurb = (
    <>
      Capture your thoughts. Speak or type freely, then Mrs. Deer will help distill your{' '}
      <span className="font-medium text-indigo-600 dark:text-indigo-400">Core Objective</span> and{' '}
      <span className="font-medium text-orange-600 dark:text-orange-400">{baseStreamSlots} Needle Movers</span>.
    </>
  )

  const brainDumpSubtitle = `Capture your thoughts. Speak or type freely, then Mrs. Deer will help distill your Core Objective and ${baseStreamSlots} Needle Movers.`

  const morningBrainDumpBlock = voiceLocked ? null : (
    <div
      className="relative z-[45] w-full"
      data-tutorial={tutorialMode ? 'morning-brain-dump' : undefined}
    >
      {cockpitOnboarding ? (
        <>
          <div
            className={`mb-4 py-2 px-4 md:py-2.5 md:px-5 ${DASHBOARD_MORNING_CARD} border-l-4 border-indigo-500 bg-white dark:bg-gray-800`}
          >
            <h2 className="flex flex-wrap items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
              <Brain className="h-5 w-5 shrink-0 text-[#152b50] dark:text-sky-200" aria-hidden />
              Clear the Path
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-700 dark:text-gray-200">{morningActionBlurb}</p>
          </div>
          <BrainDumpCard
            context="morning"
            title="Morning brain dump"
            hideHeader
            subtitle=""
            value={morningBrainDumpText}
            onChange={setMorningBrainDumpText}
            accent="sage"
            id="morning-brain-dump"
            enableSortIntoReview
            sortLoading={brainDumpProcessing || saving}
            ghostSortStatusMessage="Clearing the path..."
            onSortBegin={() => setBrainDumpProcessing(true)}
            onSortCancel={() => setBrainDumpProcessing(false)}
            onSortIntoReview={(text) => void runMorningBrainDumpSortFromCard(text)}
            onListeningChange={handleBrainDumpListeningChange}
            interruptListeningEpoch={brainDumpInterruptEpoch}
            saveHint={draftLabel ?? undefined}
            cockpitVisual
            className="mb-0"
          />
        </>
      ) : (
        <BrainDumpCard
          context="morning"
          title="Clear the Path"
          subtitle={brainDumpSubtitle}
          value={morningBrainDumpText}
          onChange={setMorningBrainDumpText}
          accent="sage"
          id="morning-brain-dump"
          enableSortIntoReview
          sortLoading={brainDumpProcessing || saving}
          ghostSortStatusMessage="Clearing the path..."
          onSortBegin={() => setBrainDumpProcessing(true)}
          onSortCancel={() => setBrainDumpProcessing(false)}
          onSortIntoReview={(text) => void runMorningBrainDumpSortFromCard(text)}
          onListeningChange={handleBrainDumpListeningChange}
          interruptListeningEpoch={brainDumpInterruptEpoch}
          saveHint={draftLabel ?? undefined}
          className="mb-0"
        />
      )}
    </div>
  )

  return (
    <>
      <MorningSaveProcessingOverlay
        open={saving && !saveProcessingOverlayDismissed}
        brainDumpPreview={morningBrainDumpText}
        coreObjectivePreview={decision.decision}
        onDismiss={() => setSaveProcessingOverlayDismissed(true)}
      />
      {brainDumpPriorityModal ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="brain-dump-priority-title"
          onClick={() => confirmBrainDumpPriorityChoice('cancel')}
          onKeyDown={(e) => e.key === 'Escape' && confirmBrainDumpPriorityChoice('cancel')}
        >
          <div
            className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              id="brain-dump-priority-title"
              className="text-lg font-semibold text-gray-900 dark:text-white"
            >
              More than {baseStreamSlots} priorities?
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
              You already have {brainDumpPriorityModal.existingFilled} filled{' '}
              {brainDumpPriorityModal.existingFilled === 1 ? 'priority' : 'priorities'} and{' '}
              {brainDumpPriorityModal.uniqueNew.length} new from this dump. Add them to your stream or move the new
              ones to the holding pen?
            </p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="sm:min-w-[100px]"
                onClick={() => void confirmBrainDumpPriorityChoice('cancel')}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="outline"
                className="sm:min-w-[140px]"
                onClick={() =>
                  brainDumpPriorityModal &&
                  void confirmBrainDumpPriorityChoice('holding-pen', brainDumpPriorityModal)
                }
              >
                Holding pen
              </Button>
              <Button
                type="button"
                variant="primary"
                className="sm:min-w-[100px]"
                onClick={() =>
                  brainDumpPriorityModal &&
                  void confirmBrainDumpPriorityChoice('add-all', brainDumpPriorityModal)
                }
              >
                Add all
              </Button>
            </div>
          </div>
        </div>
      ) : null}
      {morningBrainDumpBlock
        ? brainDumpPortalHost
          ? createPortal(morningBrainDumpBlock, brainDumpPortalHost)
          : (
              <div className="mb-4 w-full">{morningBrainDumpBlock}</div>
            )
        : null}
    <div
      className={`mb-8 space-y-8 ${stickySaveBar ? 'max-lg:pb-[calc(6.5rem+5.5rem+env(safe-area-inset-bottom,0px))]' : ''}`}
      aria-label="Pro morning strategic canvas"
    >
      <StrategicProLockOverlay active={lockStrategicUx} variant="morning_prism">
      <div
        id="morning-daily-pivot"
        data-tutorial={tutorialMode ? 'morning-intention' : undefined}
        className={
          cockpitOnboarding
            ? `scroll-mt-4 p-4 md:p-5 ${DASHBOARD_MORNING_CARD} border-l-4 border-l-[#152b50] dark:border-l-sky-500/60`
            : 'scroll-mt-4 rounded-xl border-2 border-[#152b50]/20 bg-white p-5 dark:border-sky-400/25 dark:bg-gray-900/40'
        }
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2
            className={
              cockpitOnboarding
                ? 'text-lg font-semibold text-gray-900 dark:text-white'
                : 'text-lg font-semibold text-[#152b50] dark:text-sky-100'
            }
          >
            {pivotHeaderTitle}
          </h2>
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            {draftLabel ? <span className="tabular-nums">{draftLabel}</span> : null}
          </div>
        </div>

        {!tutorialMode && !decision.decision.trim() && !strategyPrismOpen && !decisionAiLocked ? (
          <div className="mb-3">
            <button
              type="button"
              onClick={invokeStrategyPrism}
              title="Shortcut: ⌘J or Ctrl+J (also listed at bottom of page)"
              className="inline-flex w-full max-w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-yellow-200/60 bg-yellow-50/30 px-3 py-2.5 text-left text-sm text-yellow-950/90 transition hover:border-yellow-300 hover:bg-yellow-50/50 dark:border-yellow-800/50 dark:bg-yellow-950/20 dark:text-yellow-50 dark:hover:border-yellow-600/80 dark:hover:bg-yellow-950/35 sm:justify-start"
            >
              <Sparkles className="h-4 w-4 shrink-0 text-[#ef725c] dark:text-[#f0886c]" aria-hidden />
              <span>
                <span className="font-medium">Stuck?</span> Ask Mrs. Deer for three strategic angles.
              </span>
            </button>
          </div>
        ) : null}

        <AnimatePresence>
          {strategyPrismOpen &&
          !decision.decision.trim() &&
          oracleLoading &&
          !(decisionStrategies && decisionStrategies.length >= 3) ? (
            <motion.div
              key="decision-strategy-loading"
              role="status"
              initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0, y: -4 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="mb-4 rounded-xl border-2 border-dashed border-yellow-200/60 bg-yellow-50/30 px-4 py-3 text-sm text-yellow-950/90 dark:border-yellow-800/50 dark:bg-yellow-950/25 dark:text-yellow-50"
            >
              <span className="inline-flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#ef725c] border-t-transparent dark:border-[#f0886c]" />
                Mrs. Deer is thinking…
              </span>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <AnimatePresence>
          {strategyPrismOpen && decisionStrategies && decisionStrategies.length > 0 && !decision.decision.trim() ? (
            <motion.div
              key="decision-strategy-tray"
              role="region"
              aria-label="Decision strategies from Mrs. Deer"
              initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0, y: -6 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="mb-4 rounded-xl border-2 border-dashed border-yellow-200/60 bg-yellow-50/30 p-4 dark:border-yellow-800/50 dark:bg-yellow-950/20"
            >
              <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-yellow-950 dark:text-yellow-50">Strategy prism</p>
                  <p className="mt-0.5 text-xs text-yellow-900/80 dark:text-yellow-200/80">
                    Three angles from your last 14 days — tap a card to pour it into your decision.
                  </p>
                  {strategiesPrebakedAt ? (
                    <p className="mt-1 text-[10px] leading-snug text-yellow-800/75 dark:text-yellow-200/65">
                      Prepared for you during your evening rest
                      {(() => {
                        try {
                          return ` · ${format(parseISO(strategiesPrebakedAt), 'MMM d, h:mm a')}`
                        } catch {
                          return ''
                        }
                      })()}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={dismissDecisionStrategies}
                  className="inline-flex items-center gap-1 rounded-md border border-yellow-300/80 px-2 py-1 text-xs font-medium text-yellow-900 hover:bg-yellow-100/80 dark:border-yellow-700 dark:text-yellow-50 dark:hover:bg-yellow-900/40"
                >
                  <X className="h-3.5 w-3.5" aria-hidden />
                  Dismiss
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {decisionStrategies.map((opt, idx) => (
                  <button
                    key={`${opt.label}-${idx}`}
                    type="button"
                    onClick={() => applyDecisionStrategy(opt)}
                    className="flex flex-col gap-2 rounded-lg border border-yellow-200/60 bg-white/90 p-3 text-left shadow-sm transition hover:border-[#ef725c]/40 hover:shadow-md dark:border-yellow-800/55 dark:bg-gray-900/60 dark:hover:border-[#f0886c]/45"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="coral" className="px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                        {sanitizeAiCardLabelText(opt.label) || opt.label}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium leading-snug text-gray-900 dark:text-gray-100">
                      {sanitizeAiCardLabelText(opt.text)}
                    </p>
                    {opt.reasoning ? (
                      <p className="text-[11px] leading-snug text-yellow-900/75 dark:text-yellow-200/70">
                        {highlightStreakPhrases(
                          sanitizeAiCardLabelText(opt.reasoning) || opt.reasoning
                        )}
                      </p>
                    ) : null}
                    {opt.suggestedActionPlan ? (
                      <div className="flex gap-2 rounded-lg border-2 border-gray-900 bg-gray-900 px-2.5 py-2 shadow-sm dark:border-white dark:bg-white">
                        <span
                          className="shrink-0 text-lg leading-none text-white dark:text-gray-900"
                          aria-hidden
                        >
                          {PRO_ACTION_PLAN_EMOJI[opt.suggestedActionPlan]}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-white dark:text-gray-900">
                            Mrs. Deer suggests: {matrixKeyToPrismActionLabel(opt.suggestedActionPlan)}
                          </p>
                          {opt.actionTypeWhy ? (
                            <p className="mt-1 text-[11px] font-medium leading-snug text-white/90 dark:text-gray-800">
                              {sanitizeAiCardLabelText(opt.actionTypeWhy) || opt.actionTypeWhy}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                  </button>
                ))}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <label htmlFor="pro-decision" className="sr-only">
          Today&apos;s decision
        </label>
        <textarea
          id="pro-decision"
          value={decision.decision}
          onChange={(e) => {
            setDecisionHighlightFromBrainDump(false)
            setBrainDumpReviewBanner(false)
            setDecision((d) => ({ ...d, decision: e.target.value }))
          }}
          onFocus={() => {
            focusedProTaskSlotRef.current = null
          }}
          onKeyDown={(e) => {
            if (e.key === 'Tab' && !e.shiftKey) {
              e.preventDefault()
              document.querySelector<HTMLInputElement>('[data-pro-task-slot="0"]')?.focus()
            }
          }}
          placeholder="What is the ONE thing that must happen today?"
          rows={5}
          className={`min-h-[7.5rem] w-full resize-y border-2 px-4 py-3 text-base leading-relaxed text-gray-900 placeholder:text-gray-400 focus:outline-none dark:text-white dark:placeholder:text-gray-500 ${
            decisionHighlightFromBrainDump
              ? 'rounded-lg border-amber-300/90 bg-amber-50/50 shadow-[0_0_28px_rgba(251,191,36,0.35)] ring-2 ring-amber-300/70 dark:border-amber-600/55 dark:bg-amber-950/25 dark:ring-amber-500/40'
              : cockpitOnboarding
                ? 'rounded-none border-gray-200 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.05)] focus:border-orange-400 focus:ring-2 focus:ring-orange-200 dark:border-gray-600 dark:bg-gray-800 dark:focus:border-orange-500/70 dark:focus:ring-orange-500/25'
                : 'rounded-lg border-gray-200 bg-white/80 focus:border-[#ef725c] focus:ring-2 focus:ring-[#ef725c]/30 dark:border-gray-600 dark:bg-gray-800'
          }`}
        />
        {brainDumpReviewBanner ? (
          <div
            role="status"
            className="mt-3 rounded-lg border border-amber-200/90 bg-amber-50/60 px-3 py-2.5 text-sm text-amber-950 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-50"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p>
                <span className="font-semibold">Review & edit.</span> Mrs. Deer filled in your plan — confirm your{' '}
                {pivotHeaderTitle.toLowerCase()} and tasks match your intent.
              </p>
              <button
                type="button"
                onClick={() => setBrainDumpReviewBanner(false)}
                className="shrink-0 text-xs font-medium text-amber-900 underline-offset-2 hover:underline dark:text-amber-200"
              >
                Dismiss
              </button>
            </div>
          </div>
        ) : null}

        <div className="mt-3 flex flex-wrap gap-3">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Type</span>
          <button
            type="button"
            onClick={() => setDecision((d) => ({ ...d, decisionType: 'strategic' }))}
            className={`rounded-md px-3 py-1 text-xs font-medium transition ${
              decision.decisionType === 'strategic'
                ? 'bg-[#152B50] text-white'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
            }`}
          >
            Strategic
          </button>
          <button
            type="button"
            onClick={() => setDecision((d) => ({ ...d, decisionType: 'tactical' }))}
            className={`rounded-md px-3 py-1 text-xs font-medium transition ${
              decision.decisionType === 'tactical'
                ? 'bg-[#152B50] text-white'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
            }`}
          >
            Tactical
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showTaskConsultantTrigger ? (
          <motion.div
            key="pro-task-consultant"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="mb-0"
          >
            <AnimatePresence mode="wait" initial={false}>
              {showSuggestConsultantLoading ? (
                <motion.div
                  key="suggest-consultant-thinking"
                  role="status"
                  aria-live="polite"
                  aria-busy="true"
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={prefersReducedMotion ? undefined : { opacity: 0, y: -4 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  className="rounded-xl border-2 border-dashed border-yellow-200/60 bg-yellow-50/30 px-4 py-3 text-sm text-yellow-950/90 dark:border-yellow-800/50 dark:bg-yellow-950/25 dark:text-yellow-50"
                >
                  <span className="inline-flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#ef725c] border-t-transparent dark:border-[#f0886c]" />
                    Mrs. Deer is thinking…
                  </span>
                </motion.div>
              ) : (
                <motion.button
                  key="suggest-consultant-invite"
                  type="button"
                  onClick={() => void fetchSuggestionsToTray()}
                  title="Shortcut: ⌘K or Ctrl+K (also listed at bottom of page)"
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={prefersReducedMotion ? undefined : { opacity: 0, y: -4 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  className="inline-flex w-full max-w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-yellow-200/60 bg-yellow-50/30 px-3 py-3 text-left text-sm text-yellow-950/90 transition hover:border-yellow-300 hover:bg-yellow-50/50 dark:border-yellow-800/50 dark:bg-yellow-950/20 dark:text-yellow-50 dark:hover:border-yellow-600/80 dark:hover:bg-yellow-950/35 sm:justify-start"
                >
                  <Sparkles className="h-4 w-4 shrink-0 text-[#ef725c] dark:text-[#f0886c]" aria-hidden />
                  <span>
                    <span aria-hidden>✨ </span>
                    <span className="font-medium">Stuck?</span>{' '}
                    <span className="font-normal">
                      On the how? Ask Mrs. Deer to suggest {traySuggestCount} tasks from this decision.
                    </span>
                  </span>
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {traySuggestions !== null && traySuggestions.length > 0 ? (
          <motion.div
            key="suggestion-tray-cards"
            role="region"
            aria-label="Suggested tasks"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0, y: -8, scale: 0.99 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-xl border-2 border-dashed border-yellow-200/60 bg-yellow-50/30 p-4 dark:border-yellow-800/50 dark:bg-yellow-950/20"
          >
            <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-yellow-950 dark:text-yellow-50">Mrs. Deer&apos;s ideas</p>
                <p className="mt-0.5 text-xs text-yellow-900/75 dark:text-yellow-200/75">
                  Draft options — tap a card to add to the next open slot.
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void fetchSuggestionsToTray({ fromTrayRefresh: true })}
                  disabled={
                    suggestLoading || !decision.decision.trim() || Date.now() < trayRefreshLockedUntil
                  }
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-yellow-900 underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-50 dark:text-yellow-200"
                >
                  {suggestLoading || Date.now() < trayRefreshLockedUntil ? (
                    <>
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Thinking…
                    </>
                  ) : (
                    'Refresh'
                  )}
                </button>
                <button
                  type="button"
                  onClick={dismissTray}
                  className="inline-flex items-center gap-1 rounded-md border border-yellow-300/80 bg-white/60 px-2 py-1 text-xs font-medium text-yellow-900 hover:bg-yellow-50/90 dark:border-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-50 dark:hover:bg-yellow-900/50"
                  aria-label="Dismiss all suggestions"
                >
                  <X className="h-3.5 w-3.5" aria-hidden />
                  Dismiss all
                </button>
              </div>
            </div>
            {!hasEmptySlot ? (
              <p className="mb-3 text-xs text-yellow-800 dark:text-yellow-200/90">
                All {slotCount} task slots are full — clear or edit a slot to add a suggestion.
              </p>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-3" role="list">
              <AnimatePresence mode="popLayout">
                {traySuggestions.map((s, cardIndex) => {
                  const canAdd = hasEmptySlot
                  const keyHint = cardIndex + 1
                  return (
                    <motion.div
                      key={s.id}
                      layout
                      initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.97, y: 6 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={prefersReducedMotion ? undefined : { opacity: 0, scale: 0.94, y: -4 }}
                      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                      role="listitem"
                    >
                      <button
                        type="button"
                        disabled={!canAdd || suggestLoading}
                        onClick={() => addSuggestionToPlan(s)}
                        className="group flex h-full w-full flex-col gap-2 rounded-lg border border-yellow-200/60 bg-white/90 p-3 text-left shadow-sm transition hover:border-[#ef725c]/40 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 dark:border-yellow-800/50 dark:bg-gray-900/55 dark:hover:border-[#f0886c]/45"
                      >
                        <span className="flex-1 text-sm font-medium leading-snug text-gray-900 dark:text-gray-100">
                          {sanitizeAiCardLabelText(s.text)}
                        </span>
                        {s.suggestedActionPlan ? (
                          <p className="text-[10px] leading-snug text-gray-600 dark:text-gray-400">
                            <span className="font-semibold text-[#ef725c] dark:text-[#f0886c]">
                              Mrs. Deer suggests: {matrixKeyToPrismActionLabel(s.suggestedActionPlan)}
                            </span>
                            {s.actionTypeWhy ? (
                              <span className="mt-0.5 block font-normal italic text-gray-500 dark:text-gray-500">
                                {sanitizeAiCardLabelText(s.actionTypeWhy) || s.actionTypeWhy}
                              </span>
                            ) : null}
                          </p>
                        ) : null}
                        <span className="inline-flex items-center gap-2 text-xs font-semibold text-[#ef725c] dark:text-[#f0886c]">
                          <span className="font-mono text-[10px] font-normal uppercase tracking-wide text-gray-400 dark:text-gray-500">
                            [{keyHint}]
                          </span>
                          <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-current bg-[#fff7f4] dark:bg-white/10">
                            <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden />
                          </span>
                          {canAdd ? 'Add to plan' : 'Slots full'}
                        </span>
                      </button>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          </motion.div>
        ) : traySuggestions !== null && traySuggestions.length === 0 && traySuccessLine ? (
          <motion.div
            key="suggestion-tray-success"
            role="status"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-xl border-2 border-dashed border-emerald-300/70 bg-emerald-50/50 p-4 dark:border-emerald-800/50 dark:bg-emerald-950/25"
          >
            <p className="text-sm font-medium text-emerald-950 dark:text-emerald-100">{traySuccessLine}</p>
            <p className="mt-1 text-xs text-emerald-800/80 dark:text-emerald-200/80">— Mrs. Deer</p>
            <button
              type="button"
              onClick={dismissTray}
              className="mt-3 text-xs font-medium text-emerald-900 underline-offset-2 hover:underline dark:text-emerald-200"
            >
              Dismiss
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
      </StrategicProLockOverlay>

      <div
        className={
          cockpitOnboarding
            ? `p-4 md:p-5 ${DASHBOARD_MORNING_CARD} border-l-4 border-l-orange-500/70 dark:border-l-orange-400/50 ${lockStrategicUx ? 'relative isolate' : ''}`
            : `rounded-xl border-2 border-gray-200 bg-white p-5 dark:border-gray-600 dark:bg-gray-900/40 ${lockStrategicUx ? 'relative isolate' : ''}`
        }
      >
        <StrategicProLockOverlay active={lockStrategicUx} variant="morning_prism">
        <h3
          className={
            cockpitOnboarding
              ? 'mb-2 text-sm font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400'
              : 'mb-1 text-sm font-semibold tracking-wide text-gray-500 dark:text-gray-400'
          }
        >
          {streamSectionTitle}
        </h3>
        <p className="mb-6 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          {cockpitOnboarding ? (
            <>
              Verify your {baseStreamSlots} needle movers below. Sit back while Mrs. Deer drafts the &apos;How&apos; for
              each—strategic clarity starts here.
            </>
          ) : blueprintsLocked ? (
            <>
              Enter your {pivotHeaderTitle.toLowerCase()} and your {streamTasksPhrase} manually below.{' '}
              <span className="font-medium text-slate-600 dark:text-slate-300">Blueprints</span> on Pro load recurring
              rhythms in one tap.
            </>
          ) : (
            <>
              Start with your Blueprints to load recurring rhythms, then verify your {baseStreamSlots} {streamTasksPhrase}{' '}
              below. Mrs. Deer has already drafted the &apos;How&apos; for each—use{' '}
              <span className="font-medium text-slate-600 dark:text-slate-300">Add Strategic Action</span> only if you truly
              need to expand your focus.
            </>
          )}
        </p>
        {showBlueprintsSection ? (
          <div
            className="mb-8 border-b border-slate-100 pb-8 dark:border-slate-700/80"
            role="region"
            aria-label="Task blueprints"
          >
            <div className="mb-2 flex flex-wrap items-center gap-2 px-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Blueprints
              </span>
              {blueprintsLocked ? (
                <span
                  className="inline-flex items-center gap-0.5 rounded-full bg-amber-100/90 px-2 py-0.5 text-[10px] font-bold text-amber-950 dark:bg-amber-950/50 dark:text-amber-100"
                  title="Pro feature"
                >
                  <span aria-hidden>✨</span> Pro
                </span>
              ) : null}
            </div>
            <div className="-mx-1 flex gap-2 overflow-x-auto pb-1 pt-0.5">
              {blueprintChipsRow.map((bp) => (
                <button
                  key={bp.blueprintKey}
                  type="button"
                  onClick={() => {
                    if (blueprintsLocked) {
                      setBlueprintUpgradeOpen(true)
                      return
                    }
                    applyBlueprint(bp)
                  }}
                  className={`relative max-w-[200px] shrink-0 rounded-xl border border-slate-200 bg-slate-50/90 px-3 py-2 text-left transition-colors dark:border-slate-700 dark:bg-slate-800/40 ${
                    blueprintsLocked
                      ? 'cursor-pointer opacity-80 ring-1 ring-amber-200/60 dark:ring-amber-800/40'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800/70'
                  }`}
                >
                  <span className="relative inline-flex items-center" aria-hidden>
                    <span className="text-sm">{PRO_ACTION_PLAN_EMOJI[bp.actionPlan]}</span>
                    {blueprintsLocked ? (
                      <span
                        className="absolute -right-2 -top-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-amber-400 px-0.5 text-[9px] font-bold leading-none text-amber-950 shadow-sm dark:bg-amber-500 dark:text-amber-950"
                        aria-hidden
                      >
                        ✨
                      </span>
                    ) : null}
                  </span>{' '}
                  <span className="text-xs font-medium leading-snug text-slate-800 dark:text-slate-100">
                    {bp.description}
                  </span>
                  <span className="mt-1 block text-[10px] text-slate-500 dark:text-slate-400">
                    {bp.source === 'preset'
                      ? `Blueprint · ${matrixKeyToPrismActionLabel(bp.actionPlan)}`
                      : `${bp.count}× · ${matrixKeyToPrismActionLabel(bp.actionPlan)}`}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
        </StrategicProLockOverlay>
        <ul
          className={`${
            cockpitOnboarding && !compactRows ? 'space-y-6' : morningTaskListGapClass(compactRows || slimEmptyRows)
          } ${lockStrategicUx ? 'relative z-50' : ''}`}
          data-tutorial={tutorialMode ? 'power-list' : undefined}
        >
          {Array.from({ length: slotCount }, (_, index) => {
            const rowTask = taskAt(index)
            const isEmptyRow = !rowTask.description.trim()
            const emptyRowCompact = isEmptyRow && (compactRows || slimEmptyRows)
            const marathonFilledRow = compactRows && !isEmptyRow
            const isLetGo = rowTask.actionPlan === 'eliminate_founder'
            const showUndoBar = pendingTaskUndo?.slotIndex === index
            const canTrash =
              !showUndoBar && taskRowHasDeletableContent(rowTask)
            const apKey = rowTask.actionPlan || 'my_zone'
            const manifest = PRO_MATRIX_MANIFESTO_DISPLAY[apKey]
            const actionMatrixEmoji = PRO_ACTION_PLAN_EMOJI[apKey]
            const approachTitle = `${manifest.title} — ${manifest.tagline}`
            const { how: howParsed, onlyICanDo: onlyParsed } = parseProTaskRefinement(rowTask.actionPlanNote)
            const whyInline = rowTask.whyThisMatters.trim()
            const howInline = howParsed.trim()
            const isGhostwritingRow = ghostwritingSlots.includes(index)
            const rowBrainDumpBusy = brainDumpProcessing && index < baseStreamSlots
            const showStrategicCard =
              Boolean(rowTask.description.trim()) &&
              !showUndoBar &&
              (isGhostwritingRow || rowHasStrategicInlineContent(rowTask))
            const strategicCardKey = `${index}-${rowTask.actionPlan}-${whyInline.slice(0, 40)}-${howInline.slice(0, 60)}-${(rowTask.actionPlanNote ?? '').slice(0, 40)}`
            return (
              <Fragment key={index}>
              <MorningTaskRowShell
                index={index}
                compact={compactRows}
                isBaseRow={index < baseStreamSlots}
                isRefined={refineIndex === index}
                approachTitle={approachTitle}
                actionMatrixEmoji={PRO_ACTION_PLAN_EMOJI[rowTask.actionPlan || 'my_zone']}
                cockpitOnboarding={cockpitOnboarding}
                rowActions={
                  showUndoBar ? null : (
                    <>
                      {!voiceLocked && speechSupported ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleRowSpeech(index)
                          }}
                          disabled={brainDumpProcessing || saving}
                          aria-label={
                            rowSpeechSlot === index ? 'Stop voice input for this task' : 'Add to this task by voice'
                          }
                          title="Quick voice tweak for this row"
                          className={`${morningTaskRowActionBtnClass(marathonFilledRow, emptyRowCompact)} ${
                            rowSpeechSlot === index
                              ? 'animate-pulse border-[#ef725c]/60 bg-[#fff5f2] text-[#ef725c] shadow-[0_0_14px_rgba(239,114,92,0.35)] dark:border-[#f0886c]/50 dark:bg-white/[0.08] dark:text-[#f0886c]'
                              : 'border-transparent text-slate-400 hover:border-slate-200 hover:bg-slate-50 hover:text-[#ef725c] dark:text-slate-500 dark:hover:border-slate-600 dark:hover:bg-slate-800/60 dark:hover:text-[#f0886c]'
                          } max-md:opacity-100 md:pointer-events-none md:opacity-0 md:group-hover:pointer-events-auto md:group-hover:opacity-100 md:group-focus-within:pointer-events-auto md:group-focus-within:opacity-100 disabled:cursor-not-allowed disabled:opacity-40`}
                        >
                          {rowSpeechSlot === index ? (
                            <MicOff className="h-5 w-5" strokeWidth={2} aria-hidden />
                          ) : (
                            <Mic className="h-5 w-5" strokeWidth={2} aria-hidden />
                          )}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          softDeleteTaskSlot(index)
                        }}
                        disabled={!canTrash}
                        aria-label={`Clear task ${index + 1} — you can undo for 10 seconds`}
                        title="Clear row (undo for 10s)"
                        className={
                          canTrash
                            ? `${morningTaskRowActionBtnClass(marathonFilledRow, emptyRowCompact)} border-transparent text-slate-400 transition-colors hover:border-red-200/50 hover:bg-red-50 hover:text-red-500 focus-visible:ring-red-400/35 dark:text-slate-500 dark:hover:border-red-900/40 dark:hover:bg-red-950/30 dark:hover:text-red-400 max-md:opacity-100 md:pointer-events-none md:opacity-0 md:group-hover:pointer-events-auto md:group-hover:opacity-100 md:group-focus-within:pointer-events-auto md:group-focus-within:opacity-100`
                            : `pointer-events-none ${morningTaskRowActionBtnClass(marathonFilledRow, emptyRowCompact)} border-transparent text-slate-400 opacity-0 dark:text-slate-500`
                        }
                      >
                        <Trash2 className="h-5 w-5" strokeWidth={2} aria-hidden />
                      </button>
                    </>
                  )
                }
              >
                  <AnimatePresence mode="wait" initial={false}>
                    {showUndoBar ? (
                      <motion.div
                        key={`undo-${index}`}
                        role="status"
                        initial={
                          prefersReducedMotion
                            ? false
                            : { opacity: 0, x: 18 }
                        }
                        animate={{ opacity: 1, x: 0 }}
                        exit={
                          prefersReducedMotion
                            ? undefined
                            : { opacity: 0, x: -14 }
                        }
                        transition={{ duration: prefersReducedMotion ? 0.01 : 0.24, ease: [0.22, 1, 0.36, 1] }}
                        className="flex min-h-11 flex-col justify-center gap-2 rounded-lg border border-gray-200 bg-gray-50/95 px-3 py-2.5 dark:border-gray-600 dark:bg-gray-800/90 sm:flex-row sm:items-center sm:justify-between sm:py-2"
                      >
                        <p className="text-xs leading-snug text-gray-600 dark:text-gray-300">
                          <span className="font-medium text-gray-800 dark:text-gray-100">Removed.</span>{' '}
                          Ready to bring it back if needed. — Mrs. Deer
                        </p>
                        <button
                          type="button"
                          onClick={restoreDeletedTask}
                          className="shrink-0 self-start rounded-md px-2 py-1 text-sm font-semibold text-[#ef725c] underline-offset-2 hover:underline dark:text-[#f0886c] sm:self-auto"
                        >
                          Undo
                        </button>
                      </motion.div>
                    ) : (
                      <motion.div
                        key={`task-${index}`}
                        className="flex min-w-0 flex-col gap-1"
                        initial={
                          prefersReducedMotion
                            ? false
                            : { opacity: 0, x: -14 }
                        }
                        animate={{ opacity: 1, x: 0 }}
                        exit={
                          prefersReducedMotion
                            ? undefined
                            : { opacity: 0, x: 16 }
                        }
                        transition={{ duration: prefersReducedMotion ? 0.01 : 0.24, ease: [0.22, 1, 0.36, 1] }}
                      >
                        <motion.div
                          className={`relative w-full min-w-0 overflow-hidden ${emptyRowCompact ? 'min-h-8' : compactRows ? 'min-h-9' : 'min-h-11'}`}
                          animate={
                            flyInSlot === index && !prefersReducedMotion
                              ? { x: [-22, 0], opacity: [0.55, 1] }
                              : { x: 0, opacity: 1 }
                          }
                          transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                        >
                          {rowBrainDumpBusy ? (
                            <div
                              className="pointer-events-none absolute inset-0 z-[1] flex flex-col justify-center gap-1.5 rounded-lg border border-slate-200/90 bg-white/90 px-3 py-2 dark:border-slate-600 dark:bg-gray-900/90"
                              aria-hidden
                            >
                              <span className="h-2 w-[85%] max-w-[220px] animate-pulse rounded bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 dark:from-slate-600 dark:via-slate-500 dark:to-slate-600" />
                              <span className="h-2 w-[55%] max-w-[160px] animate-pulse rounded bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 dark:from-slate-600 dark:via-slate-500 dark:to-slate-600 [animation-delay:120ms]" />
                              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                Mrs. Deer is sorting your brain dump…
                              </span>
                            </div>
                          ) : null}
                          <AutosizeTextarea
                            data-pro-task-slot={index}
                            value={rowTask.description}
                            onChange={(e) => onTaskDescriptionInputChange(index, e.target.value)}
                            onFocus={() => {
                              focusedProTaskSlotRef.current = index
                            }}
                            onBlur={() => {
                              if (!strategicLocked) void runGhostwriterForRow(index)
                            }}
                            onKeyDown={(e) => onRowKeyDown(e, index)}
                            placeholder={
                              index < baseStreamSlots ? `Action ${index + 1}...` : `Task ${index + 1}`
                            }
                            disabled={rowBrainDumpBusy}
                            minRows={1}
                            className={morningTaskDescriptionInputClassName({
                              compactEmpty: emptyRowCompact,
                              compactMarathon: compactRows && !isEmptyRow,
                              isLetGo,
                              highlight: inputHighlightSlot === index,
                              cockpitOnboarding: cockpitOnboarding && index < baseStreamSlots,
                              dashboardUnderline: cockpitOnboarding && index < baseStreamSlots,
                            })}
                          />
                        </motion.div>
                        <AnimatePresence initial={false}>
                          {showStrategicCard ? (
                            <motion.div
                              key={strategicCardKey}
                              layout={false}
                              initial={prefersReducedMotion ? false : { opacity: 0, y: 4 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={prefersReducedMotion ? undefined : { opacity: 0, y: -2 }}
                              transition={{ duration: prefersReducedMotion ? 0.01 : 0.36, ease: 'easeOut' }}
                              className={morningStrategicCardWrapperClass(compactRows)}
                            >
                              {isGhostwritingRow ? (
                                <p className="text-[13px] italic leading-snug text-slate-500 dark:text-slate-400 sm:text-sm">
                                  <span className="inline-flex items-center gap-1.5">
                                    <span
                                      className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[#ef725c]/80 dark:bg-[#f0886c]/80"
                                      aria-hidden
                                    />
                                    Mrs. Deer is architecting your strategy…
                                  </span>
                                </p>
                              ) : (
                                <>
                                  {whyInline ? (
                                    <p className="mb-1.5 text-[13px] italic leading-snug text-slate-500 antialiased dark:text-slate-400 sm:text-sm">
                                      <span aria-hidden className="mr-1 font-normal not-italic text-slate-400 dark:text-slate-500">
                                        →
                                      </span>
                                      {whyInline}
                                    </p>
                                  ) : null}
                                  <p className="mb-0.5 text-[13px] leading-snug text-slate-600 dark:text-slate-300 sm:text-sm">
                                    <span className="mr-1" aria-hidden>
                                      {actionMatrixEmoji}
                                    </span>
                                    <span className="font-bold">{manifest.title}</span>
                                  </p>
                                  <p className="mb-2 text-[13px] leading-snug text-slate-500 dark:text-slate-400 sm:text-sm">
                                    {manifest.tagline}
                                  </p>
                                  {howInline ? (
                                    <p className="text-[13px] leading-snug text-slate-600 dark:text-slate-300 sm:text-sm">
                                      <span aria-hidden className="mr-1 text-slate-400 dark:text-slate-500">
                                        ↳
                                      </span>
                                      {howInline}
                                    </p>
                                  ) : onlyParsed.trim() ? (
                                    <p className="text-[13px] leading-snug text-slate-600 dark:text-slate-300 sm:text-sm">
                                      <span aria-hidden className="mr-1 text-slate-400 dark:text-slate-500">
                                        ↳
                                      </span>
                                      {onlyParsed.trim()}
                                    </p>
                                  ) : null}
                                  {howInline && onlyParsed.trim() ? (
                                    <p className="mt-1.5 text-[13px] leading-snug text-slate-500 dark:text-slate-400 sm:text-sm">
                                      <span className="font-medium">Only you:</span> {onlyParsed.trim()}
                                    </p>
                                  ) : null}
                                  <div className="mt-2 flex justify-end">
                                    <button
                                      type="button"
                                      onClick={() => openRefine(index)}
                                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[13px] font-semibold text-[#ef725c] transition-colors hover:bg-[#fff5f2] hover:underline dark:text-[#f0886c] dark:hover:bg-white/[0.06] sm:text-sm"
                                      aria-label={`Revise task ${index + 1}`}
                                    >
                                      <Pencil className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
                                      Revise
                                    </button>
                                  </div>
                                </>
                              )}
                            </motion.div>
                          ) : null}
                        </AnimatePresence>
                      </motion.div>
                    )}
                  </AnimatePresence>
              </MorningTaskRowShell>
              {index === baseStreamSlots - 1 &&
              !cockpitOnboarding &&
              !streamExtraSlot &&
              baseStreamSlots < maxStreamSlots ? (
                <li className="list-none">
                  <button
                    type="button"
                    onClick={addStrategicStreamSlot}
                    aria-label="Add Strategic Action"
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200/80 py-2.5 text-[13px] font-medium text-slate-400 transition-all hover:bg-slate-50/80 hover:text-slate-600 dark:border-slate-800 dark:text-slate-500 dark:hover:bg-slate-900/50 dark:hover:text-slate-300"
                  >
                    <Plus className="h-4 w-4 shrink-0" strokeWidth={2.25} aria-hidden />
                    Add Strategic Action
                  </button>
                </li>
              ) : null}
              </Fragment>
            )
          })}
        </ul>
        {brainDumpOverflow && brainDumpOverflow.length > 0 ? (
          <div
            className="mt-4 rounded-xl border border-slate-200 bg-slate-50/90 p-3 dark:border-slate-600 dark:bg-slate-800/40"
            role="region"
            aria-label="Holding pen for extra ideas from brain dump"
          >
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                Holding pen
              </p>
              <button
                type="button"
                onClick={() => setBrainDumpOverflow(null)}
                className="text-[11px] font-medium text-slate-500 underline-offset-2 hover:underline dark:text-slate-400"
              >
                Dismiss
              </button>
            </div>
            <p className="mb-2 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
              Extra priorities and potential frictions from your dump — copy into a row above when ready, or leave here
              as a reminder.
            </p>
            <ul className="list-inside list-disc space-y-1 text-sm text-slate-700 dark:text-slate-200">
              {brainDumpOverflow.map((line, i) => (
                <li key={`${i}-${line.slice(0, 64)}`}>{line}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {showProtectingFocusNote ? (
          <motion.div
            role="note"
            aria-live="polite"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="mt-4 rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50/30 p-4 dark:border-amber-900/50 dark:bg-amber-950/10"
          >
            <p className="text-sm font-semibold text-amber-950 dark:text-amber-50">
              <span aria-hidden>✨ </span>Mrs. Deer&apos;s Note: Protecting Your Focus
            </p>
            <p className="mt-2 text-xs leading-relaxed text-amber-950/90 dark:text-amber-100/90">
              Research suggests humans are most effective with {baseStreamSlots} core priorities. Expanding beyond those
              core commitments shifts your energy—ensure each extra line is worth the lift {momentumClause}.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={focusOnThreeRemoveFourth}
                className="rounded-lg border border-amber-200/80 bg-white/90 px-3 py-1.5 text-xs font-medium text-amber-950 shadow-sm transition hover:bg-white dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-50 dark:hover:bg-amber-900/35"
              >
                Focus on {baseStreamSlots}
              </button>
              <button
                type="button"
                onClick={dismissFocusFrictionKeepFourth}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-amber-900/90 underline-offset-2 hover:underline dark:text-amber-200/90"
              >
                I need this one
              </button>
            </div>
          </motion.div>
        ) : null}
      </div>

      {refineIndex !== null ? (
        <div className="fixed inset-0 z-[70]" role="presentation">
          {/* Single stacking context: only the backdrop layer closes; panel is above in DOM + z-index */}
          <div
            className="absolute inset-0 z-0 cursor-default bg-transparent"
            aria-hidden
            onPointerDown={(e) => {
              if (e.target !== e.currentTarget) return
              e.preventDefault()
              saveRefine()
            }}
          />
          <div
            key={refineIndex}
            className="absolute z-10 flex w-full flex-col bg-white dark:bg-gray-950 max-md:inset-x-0 max-md:bottom-0 max-md:top-auto max-md:max-h-[min(92vh,100dvh)] max-md:rounded-t-2xl max-md:border-t max-md:border-slate-200 max-md:shadow-[0_-16px_48px_rgba(0,0,0,0.08)] dark:max-md:border-slate-700 dark:max-md:shadow-[0_-16px_48px_rgba(0,0,0,0.4)] md:inset-y-0 md:right-0 md:left-auto md:top-0 md:max-h-none md:h-full md:max-w-md md:rounded-none md:border-l md:border-t-0 md:border-slate-200 md:shadow-[-20px_0_50px_rgba(0,0,0,0.05)] dark:md:border-slate-700 dark:md:shadow-[-20px_0_50px_rgba(0,0,0,0.35)]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pro-refine-title"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="flex min-h-0 flex-1 flex-col"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
            <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
              <h2 id="pro-refine-title" className="text-lg font-semibold text-gray-900 dark:text-white">
                Refine task {refineIndex + 1}
              </h2>
              {strategicLocked ? (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Edit the <span className="font-medium text-gray-600 dark:text-gray-300">task name</span> below.
                  Strategic context (Why / How) is a Pro feature — upgrade when you&apos;re ready for Mrs. Deer&apos;s
                  full ghostwriter.
                </p>
              ) : refineApproachConfirmed ? (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Edit fields below, then Save.</p>
              ) : (
                <p
                  id="refine-strategy-gate-hint"
                  className="mt-2 text-sm font-medium leading-snug text-gray-900 dark:text-white"
                >
                  {!refineWhy.trim() && !refineHow.trim() && !refineOnly.trim() ? (
                    <>
                      Tap <span className="text-[#ef725c] dark:text-[#f0886c]">✨</span> to let Mrs. Deer draft your
                      strategy, or confirm to write your own.
                    </>
                  ) : (
                    <>
                      Review Mrs. Deer&apos;s draft.{' '}
                      <span className="font-semibold text-[#152b50] dark:text-sky-200">Confirm approach</span> to unlock
                      manual editing.
                    </>
                  )}
                </p>
              )}
            </div>
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
              {refineIndex !== null && ghostwritingSlots.includes(refineIndex) ? (
                <p className="text-xs font-medium text-[#ef725c] dark:text-[#f0886c]">
                  Mrs. Deer is architecting…
                </p>
              ) : null}

              {strategicLocked ? (
                <>
                  <div>
                    <label
                      htmlFor="refine-task-title"
                      className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300"
                    >
                      Task name
                    </label>
                    <AutosizeTextarea
                      id="refine-task-title"
                      value={refineTaskTitle}
                      onChange={(e) => setRefineTaskTitle(e.target.value)}
                      minRows={1}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                      placeholder="What needs to get done?"
                    />
                  </div>
                  <div className="rounded-lg border border-slate-200/90 bg-slate-50/50 p-3 dark:border-slate-700 dark:bg-slate-900/30">
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-300">Action approach</p>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">
                      {PRO_ACTION_PLAN_EMOJI[refineActionPlan]}{' '}
                      {ACTION_PLAN_OPTIONS_2.find((o) => o.value === refineActionPlan)?.label ?? refineActionPlan}
                    </p>
                    <p className="mt-2 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
                      Change how you tackle this task on Pro.
                    </p>
                  </div>
                  <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/80 p-4 dark:border-slate-600 dark:bg-slate-900/40">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                      Upgrade to unlock Strategic Context
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                      Mrs. Deer drafts Why / How and the &quot;only you&quot; line on Pro — so every task stays tied to
                      your pivot.
                    </p>
                    <Link
                      href="/settings"
                      className="mt-3 inline-flex text-xs font-semibold text-[#ef725c] underline-offset-2 hover:underline dark:text-[#f0886c]"
                    >
                      View plans &amp; billing →
                    </Link>
                  </div>
                </>
              ) : null}

              {!strategicLocked ? (
                <>
              <div className="rounded-lg border border-slate-200/90 bg-slate-50/50 p-3 dark:border-slate-700 dark:bg-slate-900/30">
                <div className="mb-1 flex flex-wrap items-end justify-between gap-2">
                  <label
                    htmlFor="refine-action-plan"
                    className="block text-xs font-medium text-gray-600 dark:text-gray-300"
                  >
                    Action approach
                  </label>
                  <button
                    type="button"
                    onClick={regenerateRefineDraft}
                    disabled={
                      refineIndex === null ||
                      ghostwritingSlots.includes(refineIndex) ||
                      !taskAt(refineIndex).description.trim()
                    }
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-45 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-800/80"
                    title="Reset to Mrs. Deer’s full draft for this approach (overwrites Why / How / details)"
                  >
                    <Sparkles className="h-3 w-3 shrink-0 text-[#ef725c] dark:text-[#f0886c]" aria-hidden />
                    {refineWhy.trim() || refineHow.trim() || refineOnly.trim()
                      ? 'Reset to AI draft'
                      : 'Generate draft'}
                  </button>
                </div>
                {refineRowHasBlueprint ? (
                  <p className="mb-2 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
                    From a recurring blueprint — you can still pick a different action approach; we&apos;ll ask to detach
                    this row from that rhythm if needed.
                  </p>
                ) : null}
                <select
                  id="refine-action-plan"
                  value={refineActionPlan}
                  aria-describedby={!refineApproachConfirmed ? 'refine-strategy-gate-hint' : undefined}
                  onChange={(e) => {
                    const v = e.target.value as ActionPlanOption2
                    if (v === refineActionPlan || refineIndex === null) return

                    const row = taskAt(refineIndex)
                    const hadBlueprint = Boolean(row.recurringBlueprintKey?.trim())
                    if (hadBlueprint) {
                      const okBp = window.confirm(
                        'This row is linked to a recurring blueprint. Changing the action approach detaches it from that rhythm. Continue?'
                      )
                      if (!okBp) return
                    }

                    let confirmReset = false
                    if (refineStrategicDirty) {
                      const ok = window.confirm(
                        'Changing the approach will reset your manual edits. Proceed?'
                      )
                      if (!ok) return
                      setRefineStrategicDirty(false)
                      confirmReset = true
                      setRefineWhy('')
                      setRefineHow('')
                      setRefineOnly('')
                    }

                    const allEmpty =
                      !refineWhy.trim() && !refineHow.trim() && !refineOnly.trim()
                    const gateStillClosed = !refineApproachConfirmed

                    setRefineActionPlan(v)
                    setTasks((prev) => {
                      const next = [...prev]
                      while (next.length <= refineIndex) next.push(newTaskRow())
                      const cur = next[refineIndex] ?? newTaskRow()
                      next[refineIndex] = {
                        ...cur,
                        actionPlan: v,
                        ...(hadBlueprint
                          ? { recurringBlueprintKey: null, blueprintAnchorTitle: null }
                          : {}),
                      }
                      return next
                    })

                    if (confirmReset || allEmpty || gateStillClosed) {
                      void runGhostwriterForRow(refineIndex, undefined, v)
                    }
                  }}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                >
                  {ACTION_PLAN_OPTIONS_2.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.emoji} {opt.label}
                    </option>
                  ))}
                </select>
                {!refineApproachConfirmed ? (
                  <>
                    <button
                      id="refine-confirm-approach"
                      type="button"
                      onClick={() => confirmRefineApproach()}
                      disabled={
                        refineIndex === null ||
                        ghostwritingSlots.includes(refineIndex) ||
                        !taskAt(refineIndex).description.trim()
                      }
                      className="mt-2 w-full rounded-lg border border-slate-300 bg-slate-100 py-2 text-[13px] font-semibold text-slate-800 transition hover:bg-slate-200/90 disabled:pointer-events-none disabled:opacity-45 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700/90"
                    >
                      Confirm approach &amp; unlock editing
                    </button>
                  </>
                ) : null}
              </div>

              <div
                className={`relative space-y-4 ${!refineApproachConfirmed ? 'rounded-lg' : ''}`}
              >
                {!refineApproachConfirmed ? (
                  <div
                    className="absolute inset-0 z-[1] rounded-lg bg-white/40 backdrop-blur-[1.5px] dark:bg-gray-950/35"
                    aria-hidden
                  />
                ) : null}
                <div className={!refineApproachConfirmed ? 'relative z-0' : ''}>
                  <label htmlFor="refine-why" className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                    Why this matters
                  </label>
                  {refineIndex !== null && ghostwritingSlots.includes(refineIndex) ? (
                    <RefineFieldSkeleton lines={3} />
                  ) : (
                    <motion.div
                      key={`why-${refineFieldsReveal}`}
                      initial={prefersReducedMotion ? false : { opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: prefersReducedMotion ? 0.01 : 0.42, ease: 'easeOut' }}
                    >
                      <AutosizeTextarea
                        id="refine-why"
                        value={refineWhy}
                        disabled={!refineApproachConfirmed}
                        aria-describedby={!refineApproachConfirmed ? 'refine-strategy-gate-hint' : undefined}
                        onChange={(e) => {
                          setRefineStrategicDirty(true)
                          setRefineWhy(e.target.value)
                        }}
                        minRows={1}
                        className={`w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white ${
                          !refineApproachConfirmed ? 'pointer-events-none opacity-50' : ''
                        }`}
                      />
                    </motion.div>
                  )}
                </div>
                <div className={!refineApproachConfirmed ? 'relative z-0' : ''}>
                  <label htmlFor="refine-how" className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                    How
                  </label>
                  {refineIndex !== null && ghostwritingSlots.includes(refineIndex) ? (
                    <RefineFieldSkeleton lines={2} />
                  ) : (
                    <motion.div
                      key={`how-${refineFieldsReveal}`}
                      initial={prefersReducedMotion ? false : { opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: prefersReducedMotion ? 0.01 : 0.42, ease: 'easeOut', delay: 0.04 }}
                    >
                      <AutosizeTextarea
                        id="refine-how"
                        value={refineHow}
                        disabled={!refineApproachConfirmed}
                        aria-describedby={!refineApproachConfirmed ? 'refine-strategy-gate-hint' : undefined}
                        onChange={(e) => {
                          setRefineStrategicDirty(true)
                          setRefineHow(e.target.value)
                        }}
                        minRows={1}
                        className={`w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white ${
                          !refineApproachConfirmed ? 'pointer-events-none opacity-50' : ''
                        }`}
                      />
                    </motion.div>
                  )}
                </div>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={refineActionPlan}
                    initial={prefersReducedMotion ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={prefersReducedMotion ? undefined : { opacity: 0 }}
                    transition={{ duration: prefersReducedMotion ? 0.01 : 0.2 }}
                    className={`space-y-1.5 ${!refineApproachConfirmed ? 'relative z-0' : ''}`}
                  >
                    {refineThirdCopy ? (
                      <>
                        <label
                          htmlFor="refine-only"
                          className="mb-0 block text-xs font-medium text-gray-600 dark:text-gray-300"
                        >
                          {refineThirdCopy.label}
                        </label>
                        <p className="mb-1.5 text-[11px] leading-snug text-gray-500 dark:text-gray-400">
                          {refineThirdCopy.prompt}
                        </p>
                        {refineIndex !== null && ghostwritingSlots.includes(refineIndex) ? (
                          <RefineFieldSkeleton lines={2} />
                        ) : (
                          <motion.div
                            key={`only-${refineFieldsReveal}-${refineActionPlan}`}
                            initial={prefersReducedMotion ? false : { opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{
                              duration: prefersReducedMotion ? 0.01 : 0.32,
                              ease: 'easeOut',
                              delay: prefersReducedMotion ? 0 : 0.04,
                            }}
                          >
                            <AutosizeTextarea
                              id="refine-only"
                              value={refineOnly}
                              disabled={!refineApproachConfirmed}
                              aria-describedby={!refineApproachConfirmed ? 'refine-strategy-gate-hint' : undefined}
                              onChange={(e) => {
                                setRefineStrategicDirty(true)
                                setRefineOnly(e.target.value)
                              }}
                              minRows={1}
                              className={`w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white ${
                                !refineApproachConfirmed ? 'pointer-events-none opacity-50' : ''
                              }`}
                            />
                          </motion.div>
                        )}
                      </>
                    ) : null}
                  </motion.div>
                </AnimatePresence>
              </div>
                </>
              ) : null}
            </div>
            <div
              className="flex gap-2 border-t border-gray-200 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] dark:border-gray-700"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setRefineStrategicDirty(false)
                  setRefineIndex(null)
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                className="flex-1"
                style={{ backgroundColor: colors.coral.DEFAULT }}
                onClick={saveRefine}
              >
                Save
              </Button>
            </div>
            </div>
          </div>
        </div>
      ) : null}

      <div
        className={
          cockpitOnboarding
            ? `p-4 md:p-5 ${DASHBOARD_MORNING_CARD} ${stickySaveBar ? 'hidden lg:block' : ''}`
            : `rounded-xl border-2 border-dashed border-gray-300 bg-gray-50/50 p-4 dark:border-gray-600 dark:bg-gray-900/30 ${
                stickySaveBar ? 'hidden lg:block' : ''
              }`
        }
      >
        {!cockpitOnboarding ? (
          <p className="mb-3 text-xs text-gray-600 dark:text-gray-400">
            {tutorialMode ? (
              <>
                Draft syncs automatically. When you&apos;re ready, save to lock in today&apos;s plan — same layout
                you&apos;ll use every morning.
              </>
            ) : (
              <>
                Draft syncs automatically. When you&apos;re ready, commit the plan for today (same as Free tier —
                unlocks your loop).
              </>
            )}
          </p>
        ) : null}
        {cockpitOnboarding ? (
          <button
            type="button"
            disabled={saving}
            data-tutorial={tutorialMode ? 'save-morning' : undefined}
            onClick={() => void Promise.resolve(commitPlanWithRefineFlush())}
            className={COCKPIT_SAVE_BUTTON_CLASS}
          >
            {saving ? (
              <span className="inline-flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Saving…
              </span>
            ) : (
              <>Save & Start My Day</>
            )}
          </button>
        ) : (
          <Button
            type="button"
            variant="primary"
            className="w-full"
            disabled={saving}
            data-tutorial={tutorialMode ? 'save-morning' : undefined}
            onClick={() => void Promise.resolve(commitPlanWithRefineFlush())}
          >
            {saving ? (
              <span className="inline-flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Saving…
              </span>
            ) : (
              <>Save & Start My Day</>
            )}
          </Button>
        )}
      </div>

      {stickySaveBar ? (
        <div className="lg:hidden">
          <div
            className="fixed left-0 right-0 z-[70] border-t-2 border-gray-200 bg-white/98 px-4 py-3 shadow-[0_-12px_40px_rgba(15,23,42,0.1)] backdrop-blur-md dark:border-gray-700 dark:bg-gray-950/98"
            style={{
              bottom: 'calc(6.5rem + env(safe-area-inset-bottom, 0px))',
              paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
            }}
          >
            <div className="mx-auto w-full max-w-3xl px-0">
              <button
                type="button"
                disabled={saving}
                data-tutorial={tutorialMode ? 'save-morning' : undefined}
                onClick={() => void Promise.resolve(commitPlanWithRefineFlush())}
                className={COCKPIT_SAVE_BUTTON_CLASS}
              >
                {saving ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Saving…
                  </span>
                ) : (
                  <>Save & Start My Day</>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>

      {blueprintUpgradeOpen ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="blueprint-upgrade-title">
          <button
            type="button"
            className="absolute inset-0 bg-black/45 dark:bg-black/60"
            aria-label="Close"
            onClick={() => setBlueprintUpgradeOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-600 dark:bg-gray-900">
            <h2 id="blueprint-upgrade-title" className="text-lg font-semibold text-gray-900 dark:text-white">
              Blueprints are a Pro feature
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              On Pro, tap a Blueprint to drop recurring tasks into your stream instantly. On Free, add your{' '}
              {streamTasksPhrase} by hand each day — same outcome, a little more typing.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="primary"
                className="flex-1 min-w-[8rem]"
                style={{ backgroundColor: colors.coral.DEFAULT }}
                onClick={() => {
                  setBlueprintUpgradeOpen(false)
                  router.push('/pricing')
                }}
              >
                View Pro plans
              </Button>
              <Button type="button" variant="outline" className="flex-1 min-w-[8rem]" onClick={() => setBlueprintUpgradeOpen(false)}>
                Not now
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
