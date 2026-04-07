'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { getClientAuthHeaders } from '@/lib/api/fetch-json'
import { format, isToday, startOfMonth, subDays, addYears } from 'date-fns'
import { Flame, AlertCircle, Pencil, Shield, Zap } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { getUserSession, refreshSessionForWrite, isRlsOrAuthPermissionError } from '@/lib/auth'
import { MarkdownText } from '@/components/MarkdownText'
import { StreamingIndicator } from '@/components/StreamingIndicator'
import { SpeechTextField, useSpeechDictation } from '@/components/SpeechToTextInput'
import { AICoachPrompt } from '@/components/AICoachPrompt'
import { BrainDumpCard } from '@/components/BrainDumpCard'
import { MrsDeerAvatar } from '@/components/MrsDeerAvatar'
import { useStreamingInsight } from '@/lib/hooks/useStreamingInsight'
import { getFeatureAccess, isEmergencyFeatureLocked, type UserProfile } from '@/lib/features'
import { trackEvent } from '@/lib/analytics'
import { PageHeader } from '@/components/ui/PageHeader'
import { WeekNavigator } from '@/components/ui/WeekNavigator'
import { DatePickerModal } from '@/components/ui/DatePickerModal'
import type { DayStatus } from '@/lib/date-utils'
import { EmergencyCard } from '@/components/EmergencyCard'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/components/ui/utils'
import { colors } from '@/lib/design-tokens'
import { useMediaQuery } from '@/lib/hooks/useMediaQuery'
import { PageSidebar } from '@/components/layout/PageSidebar'
import { useDebouncedAutoSave } from '@/lib/hooks/useDebouncedAutoSave'
import type { EmergencyTriageJson } from '@/lib/types/emergency-triage'
import { hasPersistedTriage, triageJsonFromRow } from '@/lib/emergency-triage-parse'
import { dispatchEmergencyModeRefresh } from '@/components/emergency/EmergencyModeProvider'
import { showFreemiumAuditLinks } from '@/lib/env'
import { motion, AnimatePresence } from 'framer-motion'
import { processEmergencyVent } from '@/lib/emergency/process-emergency-vent'
import { EMERGENCY_VENT_MIN_CHARS } from '@/lib/emergency/parse-emergency'
import { heuristicEmergencySeverity } from '@/lib/emergency/heuristic-severity'
import {
  getDynamicPlaceholder,
  getTacticalHint,
  parseContainmentSteps,
} from '@/lib/emergency-containment-prompt'

/** Long primary text → allow AI to fill notes in the background (user can open “Add details” to edit). */
const EMERGENCY_LONG_TEXT_NOTES_CHARS = 200
const COMPOSE_INSIGHT_MIN_CHARS = 28
type Severity = 'hot' | 'warm' | 'contained'

interface Emergency {
  id: string
  description: string
  severity: Severity
  notes: string | null
  resolved: boolean
  created_at: string
  updated_at?: string | null
  /** Full AI coach insight — persisted on stream complete; read on reload as fallback to personal_prompts. */
  insight?: string | null
  triage_json?: EmergencyTriageJson | null
  containment_plan?: string | null
  containment_plan_committed_at?: string | null
  lesson_learned_raw?: string | null
  lesson_insight_text?: string | null
  lesson_saved_at?: string | null
}

const EMERGENCY_ROW_SELECT =
  'id, description, severity, notes, resolved, created_at, updated_at, insight, triage_json, containment_plan, containment_plan_committed_at, lesson_learned_raw, lesson_insight_text, lesson_saved_at' as const

const EMPTY_DAY_STATUS: Record<string, DayStatus> = {}

const SEVERITY_OPTIONS: { value: Severity; label: string; emoji: string }[] = [
  { value: 'hot', label: 'Hot', emoji: '🔥' },
  { value: 'warm', label: 'Warm', emoji: '☀️' },
  { value: 'contained', label: 'Contained', emoji: '✅' },
]

function editorialSeverityClass(value: Severity, selected: boolean): string {
  const base =
    'min-h-[52px] rounded-xl px-2 py-3 text-center text-sm font-medium transition-all sm:min-h-[56px] max-md:px-1.5 max-md:py-2.5 max-md:text-[11px]'
  if (!selected) {
    return `${base} border-2 border-gray-200 bg-gray-50 text-gray-900 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600`
  }
  if (value === 'hot') {
    return `${base} border-2 border-red-600 bg-red-500 font-semibold text-white shadow-sm dark:border-red-500`
  }
  if (value === 'warm') {
    return `${base} border-2 border-amber-500 bg-amber-50 font-semibold text-amber-900 shadow-sm dark:border-amber-600 dark:bg-amber-900/40 dark:text-amber-100`
  }
  return `${base} border-2 border-emerald-600 bg-emerald-50 font-semibold text-emerald-900 shadow-sm dark:border-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-100`
}

export default function EmergencyPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [brainDump, setBrainDump] = useState('')
  const [emergencyDumpSorting, setEmergencyDumpSorting] = useState(false)
  const [description, setDescription] = useState('')
  const [severity, setSeverity] = useState<Severity>('hot')
  const [notes, setNotes] = useState('')
  const [composeInsightDraft, setComposeInsightDraft] = useState<string | null>(null)
  const [sessionUserId, setSessionUserId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [todayFires, setTodayFires] = useState<Emergency[]>([])
  const [loadingFires, setLoadingFires] = useState(true)
  const [aiCoachMessage, setAiCoachMessage] = useState<string | null>(null)
  const [emergencyInsightId, setEmergencyInsightId] = useState<string | null>(null)
  const [freemiumUser, setFreemiumUser] = useState<UserProfile | null>(null)
  const [fireDate, setFireDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'))
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [displayedMonth, setDisplayedMonth] = useState<Date>(() => startOfMonth(new Date()))
  const [monthStatus, setMonthStatus] = useState<Record<string, DayStatus>>({})
  const [containingId, setContainingId] = useState<string | null>(null)
  /** Active Hot: containment_plan draft */
  const [commandCenterDraft, setCommandCenterDraft] = useState('')
  const commandCenterDraftRef = useRef(commandCenterDraft)
  commandCenterDraftRef.current = commandCenterDraft
  const { insight: streamingInsight, isStreaming, error: streamingError, startStream } = useStreamingInsight()
  const isMobile = useMediaQuery('(max-width: 768px)')
  const fireDateRef = useRef(fireDate)
  fireDateRef.current = fireDate
  const emergencySnapRef = useRef({
    brainDump,
    description,
    notes,
    severity,
  })
  emergencySnapRef.current = { brainDump, description, notes, severity }

  const brainDumpRef = useRef(brainDump)
  const descriptionRef = useRef(description)
  const notesRef = useRef(notes)
  const severityRef = useRef(severity)
  brainDumpRef.current = brainDump
  descriptionRef.current = description
  notesRef.current = notes
  severityRef.current = severity

  const notesTouchedRef = useRef(false)
  const headlineUserEditedRef = useRef(false)
  const [refiningContainment, setRefiningContainment] = useState(false)
  const composeStreamGenRef = useRef(0)

  const [intelStatus, setIntelStatus] = useState<'idle' | 'sorting'>('idle')
  const [intelMessage, setIntelMessage] = useState<string | null>(null)
  const intelGenRef = useRef(0)

  const persistEmergencyDraft = useCallback(async () => {
    const session = await getUserSession()
    if (!session?.user?.id) return
    const date = fireDateRef.current
    const snap = emergencySnapRef.current
    if (!snap.description.trim() && !snap.notes.trim() && !snap.brainDump.trim()) return

    const run = () =>
      supabase.from('emergency_compose_drafts').upsert(
        {
          user_id: session.user.id,
          fire_date: date,
          brain_dump: snap.brainDump,
          description: snap.description,
          notes: snap.notes,
          severity: snap.severity,
          hot_immediate_steps: '',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,fire_date' }
      )

    let { error } = await run()
    if (error && isRlsOrAuthPermissionError(error)) {
      const again = await refreshSessionForWrite()
      if (again.ok) ({ error } = await run())
    }
    if (error) throw error
  }, [])

  const {
    schedule: scheduleEmergencyDraft,
    flush: flushEmergencyDraft,
    status: emergencyDraftHookStatus,
    setStatus: setEmergencyDraftHookStatus,
  } = useDebouncedAutoSave({
    debounceMs: 2000,
    save: persistEmergencyDraft,
    enabled: !!fireDate,
  })

  useEffect(() => {
    return () => {
      void flushEmergencyDraft()
    }
  }, [fireDate, flushEmergencyDraft])

  useEffect(() => {
    if (emergencyDraftHookStatus !== 'saved') return
    const t = window.setTimeout(() => setEmergencyDraftHookStatus('idle'), 2200)
    return () => window.clearTimeout(t)
  }, [emergencyDraftHookStatus, setEmergencyDraftHookStatus])

  useEffect(() => {
    scheduleEmergencyDraft()
  }, [brainDump, description, notes, severity, fireDate, scheduleEmergencyDraft])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const session = await getUserSession()
      if (!session?.user?.id) return
      const { data } = await supabase
        .from('emergency_compose_drafts')
        .select('brain_dump, description, notes, severity')
        .eq('user_id', session.user.id)
        .eq('fire_date', fireDate)
        .maybeSingle()
      if (cancelled) return
      intelGenRef.current += 1
      composeStreamGenRef.current += 1
      notesTouchedRef.current = false
      headlineUserEditedRef.current = false
      setComposeInsightDraft(null)
      if (!data) {
        setBrainDump('')
        setDescription('')
        setNotes('')
        setSeverity('warm')
        return
      }
      setBrainDump(typeof (data as { brain_dump?: string }).brain_dump === 'string' ? (data as { brain_dump: string }).brain_dump : '')
      setDescription(typeof data.description === 'string' ? data.description : '')
      const n = typeof data.notes === 'string' ? data.notes : ''
      setNotes(n)
      if (data.severity === 'hot' || data.severity === 'warm' || data.severity === 'contained') {
        setSeverity(data.severity)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [fireDate])

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
    const month = startOfMonth(new Date(fireDate + 'T12:00:00'))
    void fetchMonthStatus(month)
  }, [fireDate, fetchMonthStatus])

  useEffect(() => {
    const checkAuth = async () => {
      const session = await getUserSession()
      if (!session) {
        router.push('/auth/login')
        return
      }
      setSessionUserId(session.user.id)
      setFreemiumUser({
        tier: session.user.tier,
        pro_features_enabled: session.user.pro_features_enabled,
      })
    }
    checkAuth()
  }, [router])

  useEffect(() => {
    if (searchParams?.get('focus') !== 'resolution') return
    const t = window.setTimeout(() => {
      document.getElementById('active-resolution')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 120)
    return () => window.clearTimeout(t)
  }, [searchParams])

  /** Deep links from Insights (lesson) or bookmarks: ?date=yyyy-MM-dd */
  const dateFromUrl = searchParams?.get('date') ?? ''
  useEffect(() => {
    if (dateFromUrl && /^\d{4}-\d{2}-\d{2}$/.test(dateFromUrl)) {
      setFireDate(dateFromUrl)
    }
  }, [dateFromUrl])

  const deepLinkEmergencyId = searchParams?.get('emergencyId')
  const [flashDeepLinkId, setFlashDeepLinkId] = useState<string | null>(null)
  /** Brief highlight after resolving from the hero card so the row is easy to find in history. */
  const [flashResolvedId, setFlashResolvedId] = useState<string | null>(null)
  const deepLinkFlashKeyRef = useRef<string | null>(null)
  const triageOngoingRef = useRef<Set<string>>(new Set())

  /** Scroll to a specific fire card when ?emergencyId= is present (e.g. from Insights). */
  useEffect(() => {
    const eid = deepLinkEmergencyId
    if (!eid || loadingFires) return
    const t = window.setTimeout(() => {
      document.getElementById(`emergency-fire-${eid}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 200)
    return () => window.clearTimeout(t)
  }, [deepLinkEmergencyId, loadingFires, todayFires])

  /** Brief highlight on the target card after scroll (pairs with EmergencyCard deep-link overlay). */
  useEffect(() => {
    if (!deepLinkEmergencyId) {
      deepLinkFlashKeyRef.current = null
      setFlashDeepLinkId(null)
      return
    }
    if (loadingFires) return
    if (!todayFires.some((f) => f.id === deepLinkEmergencyId)) return
    const key = `${fireDate}:${deepLinkEmergencyId}`
    if (deepLinkFlashKeyRef.current === key) return
    deepLinkFlashKeyRef.current = key
    const t = window.setTimeout(() => setFlashDeepLinkId(deepLinkEmergencyId), 280)
    const t2 = window.setTimeout(() => setFlashDeepLinkId(null), 2400)
    return () => {
      window.clearTimeout(t)
      window.clearTimeout(t2)
    }
  }, [deepLinkEmergencyId, loadingFires, todayFires, fireDate])

  const emergencyVoiceLocked = useMemo(
    () => isEmergencyFeatureLocked('voice_to_text', freemiumUser),
    [freemiumUser]
  )
  const emergencyTriageLocked = useMemo(
    () => isEmergencyFeatureLocked('ai_triage', freemiumUser),
    [freemiumUser]
  )
  const emergencyRefineLocked = useMemo(
    () => isEmergencyFeatureLocked('refine_containment', freemiumUser),
    [freemiumUser]
  )
  const emergencyToneCalibrationLocked = useMemo(
    () => isEmergencyFeatureLocked('tone_calibration_adjust', freemiumUser),
    [freemiumUser]
  )

  const protocolDescInputRef = useRef<HTMLTextAreaElement | null>(null)
  const protocolNotesInputRef = useRef<HTMLTextAreaElement | null>(null)
  const onProtocolDescriptionChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      headlineUserEditedRef.current = true
      setDescription(e.target.value)
    },
    []
  )
  const onProtocolNotesChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      notesTouchedRef.current = true
      setNotes(e.target.value)
    },
    []
  )
  const { MicButton: ProtocolDescMic } = useSpeechDictation(
    protocolDescInputRef,
    description,
    onProtocolDescriptionChange,
    { enabled: !emergencyVoiceLocked }
  )
  const { MicButton: ProtocolNotesMic } = useSpeechDictation(
    protocolNotesInputRef,
    notes,
    onProtocolNotesChange,
    { enabled: !emergencyVoiceLocked }
  )

  const handleEmergencySortBegin = useCallback(() => setEmergencyDumpSorting(true), [])
  const handleEmergencySortCancel = useCallback(() => setEmergencyDumpSorting(false), [])

  const handleEmergencySortDump = useCallback(
    async (textOverride?: string) => {
      const vent = (textOverride ?? brainDumpRef.current).trim()
      if (vent.length < EMERGENCY_VENT_MIN_CHARS) {
        setEmergencyDumpSorting(false)
        return
      }

      if (emergencyTriageLocked) {
        setSeverity(heuristicEmergencySeverity(vent))
        setIntelStatus('idle')
        setIntelMessage(null)
        setEmergencyDumpSorting(false)
        return
      }

      const myGen = ++intelGenRef.current
      setIntelStatus('sorting')
      setIntelMessage(null)
      try {
        const data = await processEmergencyVent({
          vent,
          fireDate,
          mergeHint: {
            existingDescription: descriptionRef.current,
            existingNotes: notesTouchedRef.current ? notesRef.current : '',
            severity: severityRef.current,
          },
        })
        if (myGen !== intelGenRef.current) return

        const snapshotBrain = brainDumpRef.current.trim()
        setSeverity(data.severity)
        const shouldFillHeadline =
          !headlineUserEditedRef.current &&
          (snapshotBrain.length >= EMERGENCY_VENT_MIN_CHARS || !descriptionRef.current.trim())
        if (shouldFillHeadline && data.title.trim()) {
          setDescription(data.title)
        }
        if (vent.length >= EMERGENCY_LONG_TEXT_NOTES_CHARS && !notesTouchedRef.current) {
          setNotes(data.notes)
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Sort failed'
        if (/pro|trial|403/i.test(msg)) {
          setIntelMessage(null)
          setSeverity(heuristicEmergencySeverity(vent))
        } else {
          setIntelMessage(msg)
        }
      } finally {
        if (myGen === intelGenRef.current) {
          setIntelStatus('idle')
        }
        setEmergencyDumpSorting(false)
      }
    },
    [fireDate, emergencyTriageLocked]
  )

  /**
   * Long headline alone (no brain dump): debounced triage like before. Brain dump uses BrainDumpCard “Finish & Sort”.
   */
  useEffect(() => {
    const bd = brainDump.trim()
    const head = description.trim()

    if (bd.length >= EMERGENCY_VENT_MIN_CHARS) {
      setIntelMessage(null)
      return
    }

    const ventSource = head.length >= EMERGENCY_VENT_MIN_CHARS ? head : ''

    if (!ventSource) {
      setIntelStatus('idle')
      setIntelMessage(null)
      return
    }

    const ac = new AbortController()
    const myGen = ++intelGenRef.current
    const delayMs = emergencyTriageLocked ? 200 : 900
    const snapshotVent = ventSource
    const snapshotBrain = bd

    const id = window.setTimeout(async () => {
      if (ac.signal.aborted || myGen !== intelGenRef.current) return
      const curBd = brainDumpRef.current.trim()
      if (curBd.length >= EMERGENCY_VENT_MIN_CHARS) return
      const curHead = descriptionRef.current.trim()
      const curVent = curHead.length >= EMERGENCY_VENT_MIN_CHARS ? curHead : ''
      if (curVent !== snapshotVent) return

      if (emergencyTriageLocked) {
        setSeverity(heuristicEmergencySeverity(snapshotVent))
        setIntelStatus('idle')
        setIntelMessage(null)
        return
      }

      setIntelStatus('sorting')
      setIntelMessage(null)
      try {
        const data = await processEmergencyVent(
          {
            vent: snapshotVent,
            fireDate,
            mergeHint: {
              existingDescription: descriptionRef.current,
              existingNotes: notesTouchedRef.current ? notesRef.current : '',
              severity: severityRef.current,
            },
          },
          { signal: ac.signal }
        )
        if (ac.signal.aborted || myGen !== intelGenRef.current) return
        const curBd2 = brainDumpRef.current.trim()
        if (curBd2.length >= EMERGENCY_VENT_MIN_CHARS) return
        const curHead2 = descriptionRef.current.trim()
        const v2 = curHead2.length >= EMERGENCY_VENT_MIN_CHARS ? curHead2 : ''
        if (v2 !== snapshotVent) return

        setSeverity(data.severity)
        const shouldFillHeadline =
          !headlineUserEditedRef.current &&
          (snapshotBrain.length >= EMERGENCY_VENT_MIN_CHARS || !descriptionRef.current.trim())
        if (shouldFillHeadline && data.title.trim()) {
          setDescription(data.title)
        }
        if (
          snapshotVent.length >= EMERGENCY_LONG_TEXT_NOTES_CHARS &&
          !notesTouchedRef.current
        ) {
          setNotes(data.notes)
        }
        setIntelStatus('idle')
      } catch (e: unknown) {
        if (ac.signal.aborted || myGen !== intelGenRef.current) return
        setIntelStatus('idle')
        const msg = e instanceof Error ? e.message : 'Sort failed'
        if (/pro|trial|403/i.test(msg)) {
          setIntelMessage(null)
          setSeverity(heuristicEmergencySeverity(snapshotVent))
        } else {
          setIntelMessage(msg)
        }
      }
    }, delayMs)

    return () => {
      window.clearTimeout(id)
      ac.abort()
    }
  }, [brainDump, description, fireDate, emergencyTriageLocked])

  /** Compose-time Mrs. Deer insight from brain dump + headline (no DB row yet). */
  useEffect(() => {
    if (!freemiumUser || !sessionUserId) return
    const features = getFeatureAccess(freemiumUser)
    if (!features.dailyMorningPrompt || emergencyTriageLocked) return
    if (todayFires.some((f) => f.severity === 'hot' && !f.resolved)) return

    const bd = brainDump.trim()
    const hd = description.trim()
    const parts = [
      bd.length >= 12 ? `Brain dump:\n${bd}` : null,
      hd.length >= 1 ? `Headline (what’s the fire?):\n${hd}` : null,
    ].filter(Boolean) as string[]
    const combined = parts.join('\n\n')
    if (combined.length < COMPOSE_INSIGHT_MIN_CHARS) return

    const myGen = ++composeStreamGenRef.current
    const id = window.setTimeout(() => {
      void (async () => {
        if (myGen !== composeStreamGenRef.current) return
        const session = await getUserSession()
        if (!session?.user?.id || myGen !== composeStreamGenRef.current) return
        try {
          await startStream(
            {
              promptType: 'emergency',
              userId: session.user.id,
              promptDate: fireDate,
              emergencyDescription: combined,
              severity,
            },
            (full) => {
              if (myGen === composeStreamGenRef.current) setComposeInsightDraft(full)
            }
          )
        } catch {
          // non-fatal
        }
      })()
    }, 1400)

    return () => window.clearTimeout(id)
  }, [
    brainDump,
    description,
    severity,
    fireDate,
    emergencyTriageLocked,
    freemiumUser,
    sessionUserId,
    startStream,
    todayFires,
  ])

  /** Most recent hot unresolved fire this day (`todayFires` is newest-first). Triage API + Active card apply to hot only. */
  const activeHotFire = useMemo(
    () => todayFires.find((f) => f.severity === 'hot' && !f.resolved) ?? null,
    [todayFires]
  )
  const showActiveResolution = Boolean(activeHotFire)
  const historyFires = useMemo(() => {
    if (!activeHotFire) return todayFires
    return todayFires.filter((f) => f.id !== activeHotFire.id)
  }, [todayFires, activeHotFire])

  useEffect(() => {
    if (!activeHotFire) {
      setCommandCenterDraft('')
      return
    }
    setCommandCenterDraft(activeHotFire.containment_plan ?? '')
  }, [activeHotFire?.id])

  const runTriageIfNeeded = useCallback(
    async (emergencyId: string, description: string, fd: string) => {
      if (emergencyTriageLocked) return
      if (triageOngoingRef.current.has(emergencyId)) return
      triageOngoingRef.current.add(emergencyId)
      try {
        const res = await fetch('/api/emergency/triage', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            emergencyId,
            description,
            fireDate: fd,
          }),
        })
        if (!res.ok) {
          const errBody = await res.text().catch(() => '')
          console.error('[emergency/triage] POST /api/emergency/triage failed', res.status, errBody)
          return
        }

        const body = (await res.json()) as { triage?: EmergencyTriageJson }
        let triage = body.triage ?? null
        if (!triage) {
          const { data: row } = await supabase
            .from('emergencies')
            .select('triage_json')
            .eq('id', emergencyId)
            .maybeSingle()
          triage = triageJsonFromRow(row?.triage_json)
        }
        if (triage) {
          setTodayFires((prev) =>
            prev.map((e) => (e.id === emergencyId ? { ...e, triage_json: triage } : e))
          )
        }
      } catch (e) {
        console.error('[emergency/triage] request failed', e)
      } finally {
        triageOngoingRef.current.delete(emergencyId)
      }
    },
    [emergencyTriageLocked]
  )

  const scrollToResolvedInHistory = useCallback((id: string) => {
    window.requestAnimationFrame(() => {
      window.setTimeout(() => {
        const el = document.getElementById(`emergency-fire-${id}`)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          setFlashResolvedId(id)
          window.setTimeout(() => setFlashResolvedId(null), 2200)
        }
      }, 120)
    })
  }, [])

  const fetchTodayFires = useCallback(async () => {
    setLoadingFires(true)
    const session = await getUserSession()
    if (!session) {
      setLoadingFires(false)
      return
    }

    const features = getFeatureAccess({ tier: session.user.tier, pro_features_enabled: session.user.pro_features_enabled })

    const firesRes = await supabase
      .from('emergencies')
      .select(
        // triage_json: persisted Mrs. Deer triage (must match API save + ActiveFireResolutionCard)
        EMERGENCY_ROW_SELECT
      )
      .eq('fire_date', fireDate)
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })

    if (firesRes.error) {
      setError(firesRes.error.message)
      setTodayFires([])
      setAiCoachMessage(null)
      setEmergencyInsightId(null)
      setLoadingFires(false)
      return
    }

    const fires = (firesRes.data ?? []).map((row) => {
      const r = row as unknown as Record<string, unknown>
      return {
        ...(r as unknown as Emergency),
        insight: typeof r.insight === 'string' ? r.insight : null,
        triage_json: triageJsonFromRow(r.triage_json),
      }
    })
    setTodayFires(fires)

    const triageLocked = isEmergencyFeatureLocked('ai_triage', {
      tier: session.user.tier,
      pro_features_enabled: session.user.pro_features_enabled,
    })
    const hotNeedingTriage = fires.find(
      (f) => f.severity === 'hot' && !f.resolved && !hasPersistedTriage(f.triage_json)
    )
    if (hotNeedingTriage && !triageLocked) {
      void runTriageIfNeeded(hotNeedingTriage.id, hotNeedingTriage.description, fireDate)
    }

    if (fires.length === 0) {
      setAiCoachMessage(null)
      setEmergencyInsightId(null)
      setLoadingFires(false)
      return
    }

    let coachText: string | null = null
    let coachInsightKey: string | null = null

    const hotActiveUnresolved = fires.find((f) => f.severity === 'hot' && !f.resolved)
    /** When a Hot fire is active, lock coach text to that row only (avoid showing another fire's insight). */
    const coachWalk = hotActiveUnresolved
      ? [hotActiveUnresolved]
      : fires

    if (features.dailyMorningPrompt) {
      const emergencyIds = fires.map((f: { id: string }) => f.id)
      const { data: prompts, error: promptsError } = await supabase
        .from('personal_prompts')
        .select('id, prompt_text, emergency_id')
        .eq('user_id', session.user.id)
        .eq('prompt_type', 'emergency')
        .in('emergency_id', emergencyIds)
        .order('generated_at', { ascending: false })

      if (promptsError) {
        console.error('[emergency] personal_prompts query failed', promptsError)
      }

      const promptsByEmergencyId = new Map<string, { promptRowId: string; text: string }>()
      for (const p of prompts ?? []) {
        const row = p as { id?: string; emergency_id?: string | null; prompt_text?: string | null }
        if (row.emergency_id && row.prompt_text?.trim() && !promptsByEmergencyId.has(row.emergency_id)) {
          promptsByEmergencyId.set(row.emergency_id, {
            promptRowId: row.id ?? '',
            text: row.prompt_text,
          })
        }
      }

      for (const fire of coachWalk) {
        const fromPrompt = promptsByEmergencyId.get(fire.id)
        if (fromPrompt) {
          coachText = fromPrompt.text
          coachInsightKey = fromPrompt.promptRowId || fire.id
          break
        }
        if (fire.insight?.trim()) {
          coachText = fire.insight
          coachInsightKey = fire.id
          break
        }
      }
    }

    if (!coachText?.trim()) {
      for (const fire of coachWalk) {
        if (typeof fire.insight === 'string' && fire.insight.trim()) {
          coachText = fire.insight
          coachInsightKey = fire.id
          break
        }
      }
    }

    setAiCoachMessage(coachText?.trim() ? coachText : null)
    setEmergencyInsightId(coachInsightKey)
    setLoadingFires(false)
  }, [fireDate, setError, runTriageIfNeeded])

  /**
   * Persistence: reload `emergencies` for `fireDate` on mount and when the date changes so an unresolved Hot fire
   * re-hydrates the Command Center after refresh (same query path as production: `.eq('fire_date')` + client state).
   */
  useEffect(() => {
    void fetchTodayFires()
  }, [fetchTodayFires])

  useEffect(() => {
    const onLessonSaved = () => void fetchTodayFires()
    window.addEventListener('emergency-lesson-saved', onLessonSaved)
    return () => window.removeEventListener('emergency-lesson-saved', onLessonSaved)
  }, [fetchTodayFires])

  const handleSave = async () => {
    const vent = brainDump.trim()
    let headline = description.trim()
    if (!headline && vent) {
      headline = vent.split(/[.!?\n]/)[0]?.trim() || vent
      headline = headline.slice(0, 400)
    }
    if (!headline) {
      setError('Name the fire in the headline field, or use the mic to vent first.')
      return
    }

    const notesPayload =
      notes.trim() ||
      (vent && vent !== headline ? vent : null)

    setSaving(true)
    setError(null)
    setComposeInsightDraft(null)
    composeStreamGenRef.current += 1

    const session = await getUserSession()
    if (!session) {
      setError('User not authenticated. Please log in.')
      setSaving(false)
      return
    }

    try {
      const { data: inserted, error: insertError } = await supabase
        .from('emergencies')
        .insert({
          user_id: session.user.id, // Add user_id
          fire_date: fireDate,
          description: headline,
          severity,
          notes: notesPayload,
          containment_plan: null,
        })
        .select(EMERGENCY_ROW_SELECT)
        .single()

      if (insertError) throw insertError

      trackEvent('emergency_logged', {
        description_length: headline.length,
        severity,
        fire_date: fireDate,
      })

      await supabase.from('emergency_compose_drafts').delete().eq('user_id', session.user.id).eq('fire_date', fireDate)

      if (inserted) {
        const row = inserted as Emergency
        setTodayFires((prev) => [
          {
            ...row,
            triage_json: triageJsonFromRow(row.triage_json),
            containment_plan: row.containment_plan ?? null,
            containment_plan_committed_at: row.containment_plan_committed_at ?? null,
          },
          ...prev,
        ])
      }

      const triageLocked = isEmergencyFeatureLocked('ai_triage', {
        tier: session.user.tier,
        pro_features_enabled: session.user.pro_features_enabled,
      })

      if (inserted && severity === 'hot') {
        dispatchEmergencyModeRefresh()
        if (!triageLocked) {
          void runTriageIfNeeded(inserted.id, headline, fireDate)
        }
      }

      // Generate emergency insight (Pro only) - stream for faster feedback
      const features = getFeatureAccess({ tier: session.user.tier, pro_features_enabled: session.user.pro_features_enabled })
      if (features.dailyMorningPrompt) {
        try {
          const coachBody =
            vent && vent !== headline
              ? `Headline:\n${headline}\n\nBrain dump:\n${vent}`
              : headline
          await startStream(
            {
              promptType: 'emergency',
              userId: session.user.id,
              promptDate: fireDate,
              emergencyDescription: coachBody,
              severity,
              emergencyId: inserted.id,
            },
            async (fullPrompt) => {
              setAiCoachMessage(fullPrompt)
              if (inserted?.id) {
                setEmergencyInsightId(inserted.id)
                const { error: insightPersistErr } = await supabase
                  .from('emergencies')
                  .update({ insight: fullPrompt })
                  .eq('id', inserted.id)
                void fetch('/api/emergency/save-insight', {
                  method: 'POST',
                  credentials: 'include',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ emergencyId: inserted.id, insightText: fullPrompt }),
                })
                if (insightPersistErr) {
                  console.error('[emergency] Failed to persist insight on emergencies row:', insightPersistErr.message)
                }
                setTodayFires((prev) =>
                  prev.map((e) => (e.id === inserted.id ? { ...e, insight: fullPrompt } : e))
                )
              }
            }
          )
        } catch {
          // Stream failed; insight may be partial or empty
        }
      }

      setBrainDump('')
      setDescription('')
      setNotes('')
      setSeverity('warm')
      headlineUserEditedRef.current = false
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to log. Please try again.'
      )
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = (id: string) => {
    setTodayFires((prev) => prev.filter((e) => e.id !== id))
    dispatchEmergencyModeRefresh()
  }

  const toggleResolved = async (id: string, resolved: boolean) => {
    const session = await getUserSession()
    if (!session) {
      setError('User not authenticated. Please log in.')
      return
    }

    const { error: updateError } = await supabase
      .from('emergencies')
      .update({ resolved, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', session.user.id) // Filter by user_id

    if (!updateError) {
      setTodayFires((prev) =>
        prev.map((e) => (e.id === id ? { ...e, resolved } : e))
      )
      if (resolved) {
        dispatchEmergencyModeRefresh()
      }
    }
  }

  const handleReopenFire = useCallback(
    async (id: string, reason: 'flare' | 'tweak') => {
      const headers = await getClientAuthHeaders()
      const res = await fetch('/api/emergency/reopen', {
        method: 'POST',
        credentials: 'include',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ emergencyId: id, reason }),
      })
      const body = (await res.json().catch(() => ({}))) as { error?: string; restored?: number }
      if (!res.ok) throw new Error(typeof body.error === 'string' ? body.error : 'Could not reopen fire')
      await fetchTodayFires()
      dispatchEmergencyModeRefresh()
      window.dispatchEvent(new CustomEvent('data-sync-request'))
      const n = typeof body.restored === 'number' ? body.restored : 0
      window.dispatchEvent(
        new CustomEvent('toast', {
          detail: {
            message:
              n > 0
                ? `Fire reopened — ${n} task${n === 1 ? '' : 's'} moved back to today.`
                : 'Fire reopened — active resolution is back on your dashboard.',
            type: 'success',
          },
        })
      )
    },
    [fetchTodayFires]
  )

  const handleClearResolvedFires = useCallback(async () => {
    const session = await getUserSession()
    if (!session?.user?.id) return
    if (!window.confirm('Remove all resolved fires from this day’s list? This deletes those records.')) return

    const { error } = await supabase
      .from('emergencies')
      .delete()
      .eq('user_id', session.user.id)
      .eq('fire_date', fireDate)
      .eq('resolved', true)

    if (error) {
      setError(error.message)
      return
    }
    await fetchTodayFires()
    dispatchEmergencyModeRefresh()
    window.dispatchEvent(new CustomEvent('data-sync-request'))
    window.dispatchEvent(
      new CustomEvent('toast', { detail: { message: 'Resolved fires cleared.', type: 'success' } })
    )
  }, [fireDate, fetchTodayFires, setError])

  const handleSaveContainmentPlan = useCallback(async (id: string, text: string) => {
    const session = await getUserSession()
    if (!session?.user?.id) return

    const run = () =>
      supabase
        .from('emergencies')
        .update({
          containment_plan: text,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', session.user.id)

    let { error } = await run()
    if (error && isRlsOrAuthPermissionError(error)) {
      const again = await refreshSessionForWrite()
      if (again.ok) ({ error } = await run())
    }
    if (error) throw error

    setTodayFires((prev) =>
      prev.map((e) => (e.id === id ? { ...e, containment_plan: text } : e))
    )
  }, [])

  const handleCommitContainmentPlan = useCallback(async (id: string) => {
    const text = commandCenterDraftRef.current.trim()
    if (!text) {
      window.dispatchEvent(
        new CustomEvent('toast', {
          detail: { message: 'Draft your containment plan first, then commit.', type: 'error' },
        })
      )
      return
    }

    setContainingId(id)
    setError(null)
    const committedAt = new Date().toISOString()
    try {
      const session = await getUserSession()
      if (!session?.user?.id) {
        setError('User not authenticated. Please log in.')
        return
      }

      const run = () =>
        supabase
          .from('emergencies')
          .update({
            containment_plan: text,
            containment_plan_committed_at: committedAt,
            updated_at: committedAt,
          })
          .eq('id', id)
          .eq('user_id', session.user.id)

      let { error: updateError } = await run()
      if (updateError && isRlsOrAuthPermissionError(updateError)) {
        const again = await refreshSessionForWrite()
        if (again.ok) ({ error: updateError } = await run())
      }
      if (updateError) throw updateError

      setTodayFires((prev) =>
        prev.map((e) =>
          e.id === id
            ? { ...e, containment_plan: text, containment_plan_committed_at: committedAt }
            : e
        )
      )
      window.dispatchEvent(
        new CustomEvent('toast', {
          detail: { message: 'Plan committed — mark resolved when you’ve carried it out.', type: 'success' },
        })
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not commit plan.')
    } finally {
      setContainingId(null)
    }
  }, [])

  const handleMarkFireResolved = async (id: string) => {
    setContainingId(id)
    setError(null)
    try {
      const session = await getUserSession()
      if (!session) {
        setError('User not authenticated. Please log in.')
        return
      }

      const { error: updateError } = await supabase
        .from('emergencies')
        .update({ resolved: true, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', session.user.id)

      if (updateError) throw updateError

      setTodayFires((prev) => prev.map((e) => (e.id === id ? { ...e, resolved: true } : e)))
      dispatchEmergencyModeRefresh()
      window.dispatchEvent(
        new CustomEvent('toast', {
          detail: {
            message: 'Welcome back — your morning plan is in full color again.',
            type: 'success',
          },
        })
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update.')
    } finally {
      setContainingId(null)
    }
  }

  const insightCoachMessage = useMemo(() => {
    if (isStreaming) return streamingInsight || '…'
    if (streamingError && !activeHotFire) return `[AI ERROR] ${streamingError}`

    const activeId = activeHotFire?.id ?? null
    if (activeId) {
      const row = todayFires.find((f) => f.id === activeId)
      if (row?.insight?.trim()) return row.insight.trim()
      if (aiCoachMessage?.trim()) return aiCoachMessage.trim()
      if (streamingError) return `[AI ERROR] ${streamingError}`
      return null
    }

    if (streamingError) return `[AI ERROR] ${streamingError}`
    const composing =
      brainDump.trim().length >= EMERGENCY_VENT_MIN_CHARS || description.trim().length >= 2
    if (composeInsightDraft?.trim() && composing) return composeInsightDraft.trim()
    if (aiCoachMessage?.trim()) return aiCoachMessage.trim()
    return null
  }, [
    isStreaming,
    streamingInsight,
    streamingError,
    composeInsightDraft,
    aiCoachMessage,
    brainDump,
    description,
    activeHotFire,
    todayFires,
  ])

  const mrsDeerInsightFeedbackId = useMemo(() => {
    if (showActiveResolution && activeHotFire) return activeHotFire.id
    if (showActiveResolution) return null
    if (todayFires.length === 0) return null
    if (emergencyInsightId && todayFires.some((f) => f.id === emergencyInsightId)) return emergencyInsightId
    const withInsight = todayFires.find((f) => typeof f.insight === 'string' && f.insight.trim().length > 0)
    return withInsight?.id ?? todayFires[0]?.id ?? null
  }, [showActiveResolution, activeHotFire, todayFires, emergencyInsightId])

  const activeHotTriage = activeHotFire?.triage_json ?? null

  const flashlightQuestion = useMemo(
    () => getDynamicPlaceholder(activeHotTriage?.strategy ?? null, activeHotFire?.description ?? ''),
    [activeHotTriage?.strategy, activeHotFire?.description]
  )

  const containmentStepsForList = useMemo(
    () =>
      parseContainmentSteps(
        commandCenterDraft.trim() || (activeHotFire?.containment_plan ?? '').trim()
      ),
    [commandCenterDraft, activeHotFire?.containment_plan]
  )

  /** Local-only checklist checkoffs (not persisted; clears when parsed steps change). */
  const checklistSourceKey = useMemo(
    () => containmentStepsForList.join('\u0001'),
    [containmentStepsForList]
  )
  const [checklistCompletedByIndex, setChecklistCompletedByIndex] = useState<Record<number, boolean>>({})

  useEffect(() => {
    setChecklistCompletedByIndex({})
  }, [checklistSourceKey])

  const toggleChecklistRow = useCallback((index: number) => {
    setChecklistCompletedByIndex((prev) => ({
      ...prev,
      [index]: !prev[index],
    }))
  }, [])

  const firefighterReflection = useMemo(() => {
    if (activeHotFire?.id) {
      const row = todayFires.find((f) => f.id === activeHotFire.id)
      if (row?.insight?.trim()) return row.insight.trim()
    }
    return insightCoachMessage
  }, [activeHotFire?.id, todayFires, insightCoachMessage])

  const emergencyMrsDeerCoachMessage = useMemo(() => {
    if (isStreaming) return streamingInsight?.trim() || '…'
    if (firefighterReflection?.startsWith('[AI ERROR]')) return firefighterReflection
    const t = firefighterReflection?.trim()
    if (t) return t
    if (streamingError) return `[AI ERROR] ${streamingError}`
    return '*Mrs. Deer will meet you here with a steady read once she\u2019s processed your fire.*'
  }, [isStreaming, streamingInsight, firefighterReflection, streamingError])

  const brainDumpSaveHint =
    emergencyDraftHookStatus === 'syncing'
      ? '· Syncing…'
      : emergencyDraftHookStatus === 'saved'
        ? '· Draft saved'
        : emergencyDraftHookStatus === 'error'
          ? '· Could not sync'
          : undefined

  const handleRefineContainment = useCallback(async () => {
    if (!activeHotFire) return
    if (emergencyRefineLocked) {
      router.push('/pricing')
      return
    }
    const trimmed = commandCenterDraftRef.current.trim()
    if (!trimmed) return
    setRefiningContainment(true)
    try {
      const res = await fetch('/api/emergency/refine', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emergencyId: activeHotFire.id,
          containmentPlan: trimmed,
        }),
      })
      const body = (await res.json().catch(() => ({}))) as { refinedText?: string; error?: string; code?: string }
      if (!res.ok) {
        if (res.status === 403 || body.code === 'PRO_REQUIRED') {
          window.dispatchEvent(
            new CustomEvent('toast', {
              detail: { message: 'Refine is a Pro feature — upgrade to unlock.', type: 'error' },
            })
          )
          router.push('/pricing')
        } else {
          window.dispatchEvent(
            new CustomEvent('toast', {
              detail: { message: body.error || 'Could not refine your plan. Try again.', type: 'error' },
            })
          )
        }
        return
      }
      if (typeof body.refinedText === 'string' && body.refinedText.trim()) {
        const next = body.refinedText.trim()
        setCommandCenterDraft(next)
        await handleSaveContainmentPlan(activeHotFire.id, next)
        window.dispatchEvent(
          new CustomEvent('toast', {
            detail: { message: 'Plan refined — review and commit when ready.', type: 'success' },
          })
        )
      }
    } catch {
      window.dispatchEvent(
        new CustomEvent('toast', { detail: { message: 'Could not refine your plan. Try again.', type: 'error' } })
      )
    } finally {
      setRefiningContainment(false)
    }
  }, [activeHotFire, emergencyRefineLocked, handleSaveContainmentPlan, router])

  const minFire = format(subDays(new Date(), 30), 'yyyy-MM-dd')
  const maxFire = format(addYears(new Date(), 5), 'yyyy-MM-dd')
  const todayStrNav = format(new Date(), 'yyyy-MM-dd')
  const isDesktopSidebar = !isMobile

  const showFreemiumEmergencyLink =
    showFreemiumAuditLinks &&
    !emergencyTriageLocked &&
    Boolean(pathname && !pathname.includes('/emergency/free'))

  const showBackToProEmergencyLink =
    showFreemiumAuditLinks && Boolean(pathname?.includes('/emergency/free'))

  return (
    <div className={isDesktopSidebar ? 'flex min-h-screen' : undefined}>
      {isDesktopSidebar ? (
        <aside
          className="flex w-64 shrink-0 min-h-screen flex-col border-r border-black/10 bg-transparent"
          aria-label="Emergency date navigation"
        >
          <PageSidebar
            variant="emergency"
            title="Firefighter Mode"
            subtitle="Log emergencies"
            titleIcon={<Flame className="h-6 w-6 text-white" aria-hidden />}
            selectedDate={fireDate}
            minDate={minFire}
            maxDate={maxFire}
            todayStr={todayStrNav}
            onSelectDate={(date) => setFireDate(date)}
            onPickDate={() => {
              setDisplayedMonth(startOfMonth(new Date(fireDate + 'T12:00:00')))
              setCalendarOpen(true)
            }}
          />
        </aside>
      ) : null}
      <div
        className={
          isDesktopSidebar
            ? 'flex min-h-0 min-h-screen w-full min-w-0 flex-1 flex-col overflow-y-auto bg-[#F9FAFB] pb-40 dark:bg-slate-950/80'
            : 'mx-auto w-full max-w-2xl px-4 pb-36 pt-0 transition-all duration-200 md:px-5 md:pb-40'
        }
      >
        <div
          className={
            isDesktopSidebar
              ? 'mx-auto w-full max-w-2xl px-4 pb-40 pt-4 md:px-5'
              : 'contents'
          }
        >
      {showFreemiumAuditLinks && showFreemiumEmergencyLink ? (
        <div className="mb-1 flex justify-end">
          <Link
            href="/emergency/free"
            className="text-xs font-medium text-slate-500 underline-offset-2 hover:underline dark:text-slate-400"
          >
            Preview free tier
          </Link>
        </div>
      ) : showFreemiumAuditLinks && showBackToProEmergencyLink ? (
        <div className="mb-1 flex justify-end">
          <Link
            href="/emergency"
            className="text-xs font-medium text-slate-500 underline-offset-2 hover:underline dark:text-slate-400"
          >
            Back to Pro tier
          </Link>
        </div>
      ) : null}
      {isMobile ? (
        <>
          <PageHeader
            variant="emergency"
            compact
            title="Firefighter Mode"
            titleIcon={<Flame className="w-5 h-5 text-white shrink-0" aria-hidden />}
            subtitle={format(new Date(fireDate + 'T12:00:00'), 'EEEE, MMMM d, yyyy')}
            onCalendarClick={() => {
              setDisplayedMonth(startOfMonth(new Date(fireDate + 'T12:00:00')))
              setCalendarOpen(true)
            }}
          />
          <WeekNavigator
            variant="emergency"
            selectedDate={fireDate}
            minDate={minFire}
            maxDate={maxFire}
            monthStatus={monthStatus}
            selectedPillClassName="bg-[#152b50]"
            onSelectDate={(date) => setFireDate(date)}
          />
        </>
      ) : null}

      <div className="mb-2 md:mb-8">
        <DatePickerModal
          isOpen={calendarOpen}
          onClose={() => setCalendarOpen(false)}
          currentMonth={displayedMonth}
          onMonthChange={(month) => {
            setDisplayedMonth(month)
            void fetchMonthStatus(month)
          }}
          onSelectDate={(date) => {
            setFireDate(date)
            setCalendarOpen(false)
          }}
          monthStatus={monthStatus}
          selectedDate={fireDate}
        />
      </div>

      {error && showActiveResolution ? (
        <div className="mx-auto mb-4 flex max-w-2xl items-start gap-2 rounded-lg border border-amber-200/80 bg-amber-50/50 px-3 py-2.5 text-sm text-gray-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-gray-100">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-300" aria-hidden />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="mx-auto max-w-2xl px-4 py-8">
        {/* Brain dump — voice-only (evening-style); Finish & Sort fills Emergency protocol below */}
        {emergencyVoiceLocked ? (
          <p className="mb-8 text-center text-sm text-gray-600 dark:text-gray-400">
            Voice brain dump is a Pro feature—use Emergency protocol below to log the fire, or upgrade to capture a
            spoken vent first.
          </p>
        ) : (
          <BrainDumpCard
            className="mb-8"
            context="emergency"
            accent="navy"
            id="emergency-brain-dump"
            title="Emergency Brain Dump: Vent first."
            subtitle="Speak the noise, stakes, and what you need—then tap Finish & Sort. I’ll suggest your headline, severity, and notes in Emergency protocol below."
            value={brainDump}
            onChange={setBrainDump}
            saveHint={brainDumpSaveHint}
            voiceCaptureOnly
            enableSortIntoReview
            sortLoading={emergencyDumpSorting || intelStatus === 'sorting'}
            onSortBegin={handleEmergencySortBegin}
            onSortCancel={handleEmergencySortCancel}
            onSortIntoReview={(text) => void handleEmergencySortDump(text)}
            ghostSortStatusMessage="Suggesting headline & severity below…"
          />
        )}

        {/* Emergency protocol — same Card chrome + typography as evening "How You're Feeling" */}
        <Card
          id="emergency-protocol"
          highlighted
          className="mb-8"
          style={{ borderLeft: `3px solid ${colors.amber.DEFAULT}` }}
          aria-labelledby="emergency-protocol-title"
        >
          <CardHeader>
            <CardTitle
              id="emergency-protocol-title"
              className="flex items-center gap-2 text-gray-900 dark:text-white"
            >
              <Zap className="h-5 w-5 shrink-0 text-amber-400 dark:text-amber-400" aria-hidden />
              Emergency protocol
            </CardTitle>
            <p
              id="emergency-protocol-log-heading"
              className="mt-3 text-base font-semibold text-gray-900 dark:text-white"
            >
              Log the disruption
            </p>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              Name what&apos;s burning—Mrs. Deer uses this with severity to triage your next step.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {intelStatus === 'sorting' ||
              description.trim().length > 0 ||
              brainDump.trim().length > 0 ? (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200">
                  Active
                </span>
              ) : null}
              {emergencyDraftHookStatus === 'syncing' ? (
                <span className="text-xs text-gray-500 dark:text-gray-400">Syncing…</span>
              ) : null}
              {emergencyDraftHookStatus === 'saved' ? (
                <span className="text-xs text-emerald-600 dark:text-emerald-400">Draft saved</span>
              ) : null}
              {emergencyDraftHookStatus === 'error' ? (
                <span className="text-xs text-amber-600 dark:text-amber-400">Could not sync</span>
              ) : null}
            </div>
            {intelStatus === 'sorting' ? (
              <p className="mt-2 text-xs font-medium text-gray-600 dark:text-gray-300">
                Suggesting headline &amp; severity…
              </p>
            ) : null}
            {intelMessage ? (
              <p className="mt-2 text-xs text-amber-800/90 dark:text-amber-200/90">{intelMessage}</p>
            ) : null}
          </CardHeader>
          <CardContent>
            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <label
                  htmlFor="emergency-desc"
                  className="text-sm font-medium text-gray-900 dark:text-white"
                >
                  What&apos;s the fire?
                </label>
                {ProtocolDescMic ? <div className="flex shrink-0 items-center">{ProtocolDescMic}</div> : null}
              </div>
              <SpeechTextField
                ref={protocolDescInputRef}
                as="textarea"
                id="emergency-desc"
                rows={1}
                value={description}
                onChange={onProtocolDescriptionChange}
                placeholder="Short headline — what went wrong?"
                compactEmptyAutosize
                compactEmptyMinPx={60}
                hideSpeechButton
                className="box-border w-full min-w-0 max-w-full rounded-xl border-2 border-gray-200 bg-white px-3 py-2.5 text-base leading-relaxed text-gray-900 placeholder:text-gray-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/25 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-amber-500/70 dark:focus:ring-amber-500/25"
                style={{ minHeight: 60, height: 'auto', maxHeight: 200 }}
              />
            </div>

            <div className="mt-8">
              <label className="mb-3 block text-sm font-medium text-gray-900 dark:text-white">Severity</label>
              <div className="grid grid-cols-3 gap-3">
                {SEVERITY_OPTIONS.map((opt) => {
                  const selected = severity === opt.value
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setSeverity(opt.value)}
                      className={editorialSeverityClass(opt.value, selected)}
                    >
                      {opt.emoji} {opt.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="mt-8">
              <div className="mb-2 flex items-center justify-between gap-3">
                <label
                  htmlFor="emergency-notes"
                  className="text-sm font-medium text-gray-900 dark:text-white"
                >
                  Notes (optional)
                </label>
                {ProtocolNotesMic ? <div className="flex shrink-0 items-center">{ProtocolNotesMic}</div> : null}
              </div>
              <SpeechTextField
                ref={protocolNotesInputRef}
                as="textarea"
                id="emergency-notes"
                rows={1}
                value={notes}
                onChange={onProtocolNotesChange}
                placeholder="Context, stakeholders, constraints…"
                compactEmptyAutosize
                compactEmptyMinPx={60}
                hideSpeechButton
                className="box-border w-full min-w-0 max-w-full rounded-xl border-2 border-gray-200 bg-white px-3 py-2.5 text-base leading-relaxed text-gray-900 placeholder:text-gray-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/25 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-amber-500/70 dark:focus:ring-amber-500/25"
                style={{ minHeight: 60, height: 'auto', maxHeight: 220 }}
              />
            </div>

            {error ? (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200/80 bg-amber-50/50 px-3 py-2.5 text-sm text-gray-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-gray-100">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-300" aria-hidden />
                <span>{error}</span>
              </div>
            ) : null}

            <Button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="mt-8 min-h-[48px] w-full rounded-lg border-0 px-4 py-3 text-base font-semibold text-gray-900 shadow-md transition hover:brightness-95 active:scale-[0.99] disabled:opacity-60 dark:text-gray-950"
              style={{ backgroundColor: colors.amber.DEFAULT }}
            >
              {saving ? 'Tracking…' : 'Track this disruption'}
            </Button>
          </CardContent>
        </Card>

        {/* Active resolution — same Card chrome as Today’s fires (navy rail + list typography) */}
        <AnimatePresence>
          {showActiveResolution && activeHotFire ? (
            <motion.div
              key="active-resolution-card"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="mb-8"
            >
              <Card
                id="active-resolution"
                role="region"
                aria-labelledby="active-resolution-heading"
                className="mb-0 border border-[#152b50]/20 bg-red-50 shadow-sm dark:border-red-900/40 dark:bg-red-950/30"
                style={{ borderLeft: `4px solid ${colors.navy.DEFAULT}` }}
              >
                <CardHeader className="pb-2">
                  <CardTitle
                    id="active-resolution-heading"
                    className="flex flex-col gap-0.5 text-base text-gray-900 dark:text-white md:text-lg"
                  >
                    <span className="flex items-center gap-2">
                      <Flame className="h-5 w-5 shrink-0" style={{ color: colors.navy.DEFAULT }} aria-hidden />
                      Active resolution
                    </span>
                    <span className="text-sm font-normal text-gray-600 dark:text-gray-300">
                      Triage mode: focus only on the next safe step until you contain the fire.
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  {/* High-alert frame: bright red border; white inner cards for clarity */}
                  <div className="space-y-4 rounded-xl border-2 border-red-600 bg-red-50/40 p-4 dark:border-red-500 dark:bg-red-950/25">
                    <div className="flex gap-3">
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/60"
                        aria-hidden
                      >
                        <Shield className="h-5 w-5 text-red-700 dark:text-red-300" strokeWidth={2} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3
                          id="active-fire-title"
                          className="text-base font-semibold text-gray-900 dark:text-white"
                        >
                          The Active Fire
                        </h3>
                        <p className="mt-1 text-sm leading-relaxed text-gray-900 dark:text-gray-100">
                          <span className="font-semibold">What you reported:</span> {activeHotFire.description}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-lg bg-white p-4 shadow-sm dark:border dark:border-gray-700 dark:bg-gray-950">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#152b50] dark:text-sky-200/90">
                        Mrs. Deer&apos;s advice
                      </p>
                      <div className="mt-2">
                        {isStreaming ? <StreamingIndicator expression="empathetic" className="mb-2" /> : null}
                        {activeHotTriage?.encouragement?.trim() ? (
                          <p className="text-sm leading-relaxed text-gray-900 dark:text-gray-100">
                            {activeHotTriage.encouragement.trim()}
                          </p>
                        ) : insightCoachMessage && !insightCoachMessage.startsWith('[AI ERROR]') ? (
                          <MarkdownText className="text-sm leading-relaxed text-gray-900 dark:text-gray-100 [&_p]:mb-2 [&_p:last-child]:mb-0">
                            {insightCoachMessage}
                          </MarkdownText>
                        ) : (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Mrs. Deer is drafting your first response…
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="rounded-lg border-l-4 border-[#152b50] bg-white py-3 pl-4 pr-3 shadow-sm dark:border-sky-500 dark:border-l-4 dark:bg-gray-950">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-[#152b50] dark:text-sky-300">
                        One safe step / 10 min
                      </p>
                      <p className="mt-2 text-sm font-semibold leading-snug text-gray-900 dark:text-white">
                        {activeHotTriage?.oneSafeStep?.trim() ||
                          'Take a screenshot of the error message and send it to your developer with “Emergency — next steps on this ASAP”.'}
                      </p>
                    </div>

                    <p className="text-xs italic leading-relaxed text-gray-700 dark:text-gray-300">
                      {activeHotTriage?.breathingPrompt?.trim() ||
                        'Breathe in for 4, hold for 7, out for 8—repeat twice.'}
                    </p>
                    {activeHotTriage?.strategy ? (
                      <p className="text-xs text-gray-700 dark:text-gray-300">
                        Strategy:{' '}
                        <span className="font-semibold capitalize text-gray-900 dark:text-gray-100">
                          {activeHotTriage.strategy}
                        </span>{' '}
                        (hold / pivot / drop)
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-3 rounded-lg border border-gray-200 bg-white/95 p-4 dark:border-gray-600 dark:bg-gray-900/50">
                    <div className="flex flex-wrap items-start gap-3">
                      <div className="shrink-0" aria-hidden>
                        <MrsDeerAvatar expression="empathetic" size="sm" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-base font-semibold text-gray-900 dark:text-white">
                            Mrs. Deer&apos;s question
                          </span>
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                            Coach-at-heart
                          </span>
                        </div>
                        <p className="mt-1 text-sm leading-relaxed text-gray-900 dark:text-gray-100">
                          {flashlightQuestion}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1.5 border-gray-200 text-gray-900 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-800"
                        disabled={refiningContainment || (!emergencyRefineLocked && !commandCenterDraft.trim())}
                        onClick={() => void handleRefineContainment()}
                      >
                        <Pencil className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        {emergencyRefineLocked ? 'Refine with Mrs. Deer (Pro)' : 'Refine with Mrs. Deer'}
                      </Button>
                    </div>
                    {refiningContainment ? (
                      <p className="text-xs text-amber-800/90 dark:text-amber-200/90" role="status">
                        Mrs. Deer is structuring your response…
                      </p>
                    ) : null}

                    <textarea
                      id="active-fire-containment-draft"
                      value={commandCenterDraft}
                      onChange={(e) => setCommandCenterDraft(e.target.value)}
                      onBlur={() => {
                        const plan = commandCenterDraftRef.current.trim()
                        const prev = (activeHotFire.containment_plan ?? '').trim()
                        if (plan !== prev) void handleSaveContainmentPlan(activeHotFire.id, commandCenterDraftRef.current)
                      }}
                      rows={3}
                      placeholder={getTacticalHint(activeHotTriage?.strategy ?? null)}
                      className="box-border min-h-[72px] w-full resize-y rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm leading-relaxed text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400/25 dark:border-gray-600 dark:bg-gray-950/50 dark:text-white dark:placeholder:text-gray-500"
                      aria-label="Your containment notes"
                    />

                    <div className="rounded-lg border-2 border-amber-200 bg-amber-50/90 p-3 dark:border-amber-600/60 dark:bg-amber-950/25">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-900/90 dark:text-amber-200/90">
                        Your checklist
                      </p>
                      {containmentStepsForList.length > 0 ? (
                        <ul className="mt-2 space-y-2.5" role="list">
                          {containmentStepsForList.map((step, i) => {
                            const done = Boolean(checklistCompletedByIndex[i])
                            return (
                              <li key={`${checklistSourceKey}-${i}`}>
                                <label className="flex cursor-pointer items-start gap-2.5 text-sm font-medium leading-snug">
                                  <input
                                    type="checkbox"
                                    checked={done}
                                    onChange={() => toggleChecklistRow(i)}
                                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-amber-700/80 text-amber-600 focus:ring-2 focus:ring-amber-500 focus:ring-offset-0 dark:border-amber-500 dark:bg-gray-900 dark:text-amber-500"
                                    aria-label={`Checklist: ${step.slice(0, 80)}${step.length > 80 ? '…' : ''}`}
                                  />
                                  <span
                                    className={
                                      done
                                        ? 'text-slate-400 line-through dark:text-slate-500'
                                        : 'text-gray-900 dark:text-gray-100'
                                    }
                                  >
                                    {step}
                                  </span>
                                </label>
                              </li>
                            )
                          })}
                        </ul>
                      ) : (
                        <p className="mt-2 text-sm italic text-amber-900/70 dark:text-amber-200/70">
                          Draft 2–3 moves above—one per line—to see your checklist here.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-red-200/60 pt-4 dark:border-red-900/40">
                    <Button
                      type="button"
                      className="h-12 w-full rounded-lg border-0 text-base font-semibold text-white shadow-sm"
                      style={{ backgroundColor: colors.navy.DEFAULT }}
                      disabled={containingId === activeHotFire.id}
                      onClick={() =>
                        void (activeHotFire.containment_plan_committed_at
                          ? handleMarkFireResolved(activeHotFire.id)
                          : handleCommitContainmentPlan(activeHotFire.id))
                      }
                    >
                      {containingId === activeHotFire.id
                        ? 'Saving…'
                        : activeHotFire.containment_plan_committed_at
                          ? 'Mark resolved'
                          : 'Commit to plan'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Mrs. Deer — post-morning style surface, calibration row, post-morning next-step prompt */}
        {mrsDeerInsightFeedbackId ? (
          <div id="emergency-mrs-deer-insight" className="scroll-mt-4">
            <AICoachPrompt
              key={mrsDeerInsightFeedbackId}
              topSlot={
                isStreaming ? (
                  <div
                    className="rounded-xl border border-dashed border-amber-200/80 bg-amber-50/40 px-4 py-3 dark:border-amber-800/40 dark:bg-amber-950/25"
                    role="status"
                    aria-live="polite"
                  >
                    <p className="text-sm font-medium text-amber-950/90 dark:text-amber-100">
                      Mrs. Deer is with you…
                    </p>
                    <p className="mt-0.5 text-xs text-amber-800/80 dark:text-amber-200/75">
                      Your steady read streams in below.
                    </p>
                    <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-amber-200/80 dark:bg-amber-900/50">
                      <div className="h-full w-2/5 animate-pulse rounded-full bg-[#ef725c]/70 dark:bg-[#f0886c]/60" />
                    </div>
                    <StreamingIndicator expression="empathetic" className="mt-3 opacity-90" />
                  </div>
                ) : null
              }
              message={emergencyMrsDeerCoachMessage}
              trigger="emergency"
              onClose={() => {}}
              insightId={mrsDeerInsightFeedbackId}
              auditStreaming={isStreaming}
              toneAdjustLocked={emergencyToneCalibrationLocked}
            />
          </div>
        ) : null}

        {/* Today’s fires — evening-style navy rail */}
        <Card
          className="mb-0 border border-[#152b50]/20 bg-white/95 shadow-sm dark:border-sky-900/40 dark:bg-gray-900/85"
          style={{ borderLeft: `4px solid ${colors.navy.DEFAULT}` }}
        >
          <CardHeader className="pb-2">
            <CardTitle className="flex flex-col gap-0.5 text-base text-gray-900 dark:text-white md:text-lg">
              <span className="flex items-center gap-2">
                <Flame className="h-5 w-5 shrink-0" style={{ color: colors.navy.DEFAULT }} aria-hidden />
                {showActiveResolution
                  ? "Today's other fires"
                  : isToday(new Date(fireDate))
                    ? "Today's fires"
                    : `Fires for ${format(new Date(fireDate), 'MMM d, yyyy')}`}
              </span>
              {showActiveResolution ? (
                <span className="text-sm font-normal text-gray-600 dark:text-gray-300">
                  Today&apos;s resolved fires and any other logs from this day (active fire above).
                </span>
              ) : null}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
        <div className="mt-0">
          {loadingFires ? (
            <p className="text-sm text-gray-700 dark:text-gray-300">Loading…</p>
          ) : historyFires.length === 0 ? (
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {showActiveResolution
                ? 'No other fires logged for this day yet.'
                : todayFires.length === 0
                  ? 'Nothing logged for this date yet.'
                  : isToday(new Date(fireDate))
                    ? 'No emergencies logged today. Stay focused on your Power List.'
                    : `No emergencies logged for ${format(new Date(fireDate), 'MMMM d')}.`}
            </p>
          ) : (
            <>
              <ul className="space-y-3 motion-safe:transition-all motion-safe:duration-500">
                {historyFires.map((fire) => (
                  <EmergencyCard
                    key={fire.id}
                    emergency={fire}
                    onDelete={handleDelete}
                    onToggleResolved={toggleResolved}
                    onReopenFire={handleReopenFire}
                    severityOptions={SEVERITY_OPTIONS}
                    deepLinkFlash={flashDeepLinkId === fire.id || flashResolvedId === fire.id}
                  />
                ))}
              </ul>
              {historyFires.some((f) => f.resolved) ? (
                <div className="mt-4 border-t border-gray-200 pt-4 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={() => void handleClearResolvedFires()}
                    className="text-sm font-medium text-gray-600 underline-offset-2 hover:text-gray-900 hover:underline dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    Clear all resolved
                  </button>
                </div>
              ) : null}
            </>
          )}
        </div>
          </CardContent>
        </Card>
      </div>
        </div>
      </div>
    </div>
  )
}
