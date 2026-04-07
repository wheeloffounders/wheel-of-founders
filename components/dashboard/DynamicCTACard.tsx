'use client'

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { CircleCheck } from 'lucide-react'
import { format, subDays } from 'date-fns'
import { formatInTimeZone } from 'date-fns-tz'
import { getEffectivePlanDate, getPlanDateString } from '@/lib/effective-plan-date'
import { getBrowserTimeZone, resolveUserTimeZone } from '@/lib/timezone'
import { getUserSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

type ProgressStatus = 'full' | 'half' | 'partial' | 'empty' | 'future'

/**
 * 24h loop (local clock, aligned with founder-day 4am handoff via planToday):
 * - celebration: evening done for current founder day
 * - evening_nudge: 6pm–4am + morning data exists + evening incomplete
 * - morning / need_plan: 4am–6pm (or night without morning) — plan or finish saving morning
 * - morning / loop_open_daytime: 4am–6pm + morning done, evening not — soft nudge, no night pulse
 */
type DisplayMode =
  | { phase: 'celebration' }
  /** Morning + evening done, but before 9pm local — no “Great job today” confetti yet */
  | { phase: 'loop_closed_early' }
  | { phase: 'evening_nudge' }
  | { phase: 'morning'; intent: 'need_plan' }
  | { phase: 'morning'; intent: 'loop_open_daytime' }
  /** Before 5pm: morning committed, evening pending — keep focus on the plan, not “close loop” */
  | { phase: 'morning'; intent: 'focus_plan' }

type MessageRotateKey =
  | 'celebration'
  | 'early_complete'
  | 'evening_nudge'
  | 'morning_plan'
  | 'morning_day'
  | 'morning_focus'

/** 9pm local: “Great job today” celebration. 5pm: evening CTA takes priority over daytime loop-open. */
const CELEBRATION_MIN_HOUR = 21
const EVENING_PRIORITY_HOUR = 17

/**
 * Scenario A (mid-day): `half` + hourLocal before 5pm → focus_plan (“Keep today on track”).
 * Scenario B (early completion): `full` + hourLocal before 9pm → loop_closed_early (not celebration).
 * Scenario C (9 PM pivot): `full` + hourLocal from 9pm onward → celebration.
 */
function resolveDisplayMode(status: ProgressStatus, hourLocal: number): DisplayMode {
  if (status === 'full') {
    if (hourLocal >= CELEBRATION_MIN_HOUR) return { phase: 'celebration' }
    return { phase: 'loop_closed_early' }
  }
  const nightWindow = hourLocal >= 18 || hourLocal < 4
  if (nightWindow && (status === 'half' || status === 'partial')) {
    return { phase: 'evening_nudge' }
  }
  if (status === 'half' && hourLocal < EVENING_PRIORITY_HOUR) {
    return { phase: 'morning', intent: 'focus_plan' }
  }
  if (status === 'half') {
    return { phase: 'morning', intent: 'loop_open_daytime' }
  }
  return { phase: 'morning', intent: 'need_plan' }
}

function messageKeyFromMode(mode: DisplayMode): MessageRotateKey {
  if (mode.phase === 'celebration') return 'celebration'
  if (mode.phase === 'loop_closed_early') return 'early_complete'
  if (mode.phase === 'evening_nudge') return 'evening_nudge'
  if (mode.phase === 'morning' && mode.intent === 'loop_open_daytime') return 'morning_day'
  if (mode.phase === 'morning' && mode.intent === 'focus_plan') return 'morning_focus'
  return 'morning_plan'
}

type CtaConfig = {
  title: string
  buttonText: string
  href: string
}

function ctaConfigFor(mode: DisplayMode, planDate: string): CtaConfig {
  if (mode.phase === 'celebration') {
    return {
      title: 'Great job today',
      buttonText: 'View Insights →',
      href: `/history?date=${planDate}&celebrate=true`,
    }
  }
  if (mode.phase === 'loop_closed_early') {
    return {
      title: 'Loop closed — daylight hours',
      buttonText: 'Review your day →',
      href: `/history?date=${planDate}`,
    }
  }
  if (mode.phase === 'evening_nudge') {
    return {
      title: 'Complete the loop',
      buttonText: 'Complete Evening Review →',
      href: `/evening?date=${planDate}#evening-form`,
    }
  }
  if (mode.phase === 'morning' && mode.intent === 'loop_open_daytime') {
    return {
      title: 'Close your loop',
      buttonText: 'Complete Evening Review →',
      href: `/evening?date=${planDate}#evening-form`,
    }
  }
  if (mode.phase === 'morning' && mode.intent === 'focus_plan') {
    return {
      title: 'Keep today on track',
      buttonText: 'View morning plan →',
      href: '/morning',
    }
  }
  return {
    title: 'Start your day',
    buttonText: 'Plan your Morning →',
    href: '/morning',
  }
}

type MessageKind = 'quote' | 'benefit' | 'progress' | 'streak' | 'tip' | 'insight'

type CtaMessageDef = {
  id: string
  kind: MessageKind
  build: (ctx: CtaContext) => string
}

type CtaContext = {
  loopsThisWeek: number
  streakDays: number
}

const LS_KEY = 'wof-cta-rotate-v3'

function readLastMessageId(rotateKey: MessageRotateKey): string | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return null
    const o = JSON.parse(raw) as { key?: string; id?: string }
    return o.key === rotateKey && typeof o.id === 'string' ? o.id : null
  } catch {
    return null
  }
}

function writeLastMessageId(rotateKey: MessageRotateKey, id: string) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ key: rotateKey, id }))
  } catch {
    /* ignore quota */
  }
}

function pickMessageId(defs: CtaMessageDef[], rotateKey: MessageRotateKey): CtaMessageDef {
  if (defs.length === 0) {
    return {
      id: 'fallback',
      kind: 'benefit',
      build: () => '',
    }
  }
  const lastId = readLastMessageId(rotateKey)
  const pool = defs.length > 1 && lastId ? defs.filter((d) => d.id !== lastId) : defs
  const seed = Date.now() % 997 + rotateKey.length * 13 + (lastId?.length ?? 0)
  const idx = seed % pool.length
  const chosen = pool[idx]!
  writeLastMessageId(rotateKey, chosen.id)
  return chosen
}

const MORNING_MESSAGES: CtaMessageDef[] = [
  {
    id: 'm-quote-1',
    kind: 'quote',
    build: () => 'Your morning intention sets the tone for everything that follows.',
  },
  {
    id: 'm-benefit-1',
    kind: 'benefit',
    build: () => "Today's focus shapes tomorrow's momentum.",
  },
  {
    id: 'm-tip-1',
    kind: 'tip',
    build: () => 'Start with the task that feels heaviest — it is often the one that moves the needle most.',
  },
  {
    id: 'm-quote-2',
    kind: 'quote',
    build: () => 'Small clarity at sunrise saves hours of drift by sunset.',
  },
  {
    id: 'm-benefit-2',
    kind: 'benefit',
    build: () => 'When you name what matters first, the rest of the day lines up behind it.',
  },
]

const EVENING_MESSAGES: CtaMessageDef[] = [
  {
    id: 'e-quote-1',
    kind: 'quote',
    build: () => "Your evening reflection shapes tomorrow's clarity.",
  },
  {
    id: 'e-benefit-1',
    kind: 'benefit',
    build: () => 'Your evening reflection helps Mrs. Deer understand what truly matters to you.',
  },
  {
    id: 'e-progress-1',
    kind: 'progress',
    build: (ctx) => {
      const n = ctx.loopsThisWeek
      if (n <= 0) return "This week is still open — tonight's reflection can be your first closed loop."
      const next = n + 1
      return `You've closed ${n} loop${n === 1 ? '' : 's'} this week. Tonight makes ${next}.`
    },
  },
  {
    id: 'e-streak-1',
    kind: 'streak',
    build: (ctx) => {
      const s = ctx.streakDays
      if (s < 1) return 'Complete tonight to start a fresh streak.'
      return `Complete tonight to keep your ${s}-day streak alive.`
    },
  },
  {
    id: 'e-tip-1',
    kind: 'tip',
    build: () => 'Reflection turns experience into wisdom.',
  },
]

/** Daytime, morning saved, evening pending — still “sun” window, evening-leaning copy */
const DAY_OPEN_MESSAGES: CtaMessageDef[] = [
  {
    id: 'd-1',
    kind: 'benefit',
    build: () => 'You set the tone this morning — a short reflection tonight locks in the win.',
  },
  {
    id: 'd-2',
    kind: 'quote',
    build: () => 'The loop is almost closed. Your future self will thank you for reflecting.',
  },
  {
    id: 'd-3',
    kind: 'tip',
    build: () => 'Even five honest minutes of evening review beats a perfect plan left unopened.',
  },
]

const EARLY_COMPLETE_MESSAGES: CtaMessageDef[] = [
  {
    id: 'ec-1',
    kind: 'benefit',
    build: () =>
      'You already closed the loop. Save the confetti for tonight — your plan is still there if you want to tweak or revisit it.',
  },
  {
    id: 'ec-2',
    kind: 'tip',
    build: () =>
      'Afternoon is for execution. Your morning plan is the map; history has the full picture when you’re ready.',
  },
  {
    id: 'ec-3',
    kind: 'quote',
    build: () => 'The day isn’t over until you say it is — your tasks are still yours to steer.',
  },
]

const FOCUS_PLAN_MESSAGES: CtaMessageDef[] = [
  {
    id: 'f-1',
    kind: 'benefit',
    build: () => 'Morning is saved. Use the plan as your anchor while you build — evening reflection can wait until later.',
  },
  {
    id: 'f-2',
    kind: 'tip',
    build: () => 'Check off what moves, adjust what doesn’t. The loop closes when you reflect, not when the clock says so.',
  },
  {
    id: 'f-3',
    kind: 'progress',
    build: (ctx) =>
      ctx.streakDays > 0
        ? `Keep steering the day — your ${ctx.streakDays}-day streak likes honest follow-through.`
        : 'Keep steering the day — small wins compound when you stay with the plan.',
  },
]

const COMPLETE_MESSAGES: CtaMessageDef[] = [
  {
    id: 'c-benefit-0',
    kind: 'benefit',
    build: () => 'Great job completing your day.',
  },
  {
    id: 'c-quote-1',
    kind: 'quote',
    build: () => 'Great job completing your day — Mrs. Deer noticed something beautiful in how you showed up.',
  },
  {
    id: 'c-insight-1',
    kind: 'insight',
    build: () => 'Visit Rhythm to see what patterns emerged from today.',
  },
  {
    id: 'c-benefit-1',
    kind: 'benefit',
    build: () => 'Rest counts as part of the loop. You earned this pause.',
  },
]

function messagesForRotateKey(key: MessageRotateKey): CtaMessageDef[] {
  if (key === 'celebration') return COMPLETE_MESSAGES
  if (key === 'early_complete') return EARLY_COMPLETE_MESSAGES
  if (key === 'evening_nudge') return EVENING_MESSAGES
  if (key === 'morning_day') return DAY_OPEN_MESSAGES
  if (key === 'morning_focus') return FOCUS_PLAN_MESSAGES
  return MORNING_MESSAGES
}

function sectionEyebrow(mode: DisplayMode): string {
  if (mode.phase === 'celebration') return '✨ Great job today'
  if (mode.phase === 'loop_closed_early') return '☀️ Day in progress'
  if (mode.phase === 'evening_nudge') return '🌙 Daily loop'
  if (mode.phase === 'morning' && mode.intent === 'loop_open_daytime') return '☀️ Your day in motion'
  if (mode.phase === 'morning' && mode.intent === 'focus_plan') return '☀️ Your plan is live'
  return '☀️ Start your day'
}

function weekDatesForProgress(anchorYmd: string): string[] {
  const base = new Date(anchorYmd + 'T12:00:00')
  const dates: string[] = []
  for (let i = 6; i >= 0; i--) {
    dates.push(format(subDays(base, i), 'yyyy-MM-dd'))
  }
  return dates
}

/** Optional confetti specks — celebration CTA hover only */
function CelebrationConfettiHover() {
  const specks = [
    { l: '10%', t: '20%', c: 'bg-emerald-400', d: '0ms' },
    { l: '75%', t: '15%', c: 'bg-amber-300', d: '40ms' },
    { l: '85%', t: '65%', c: 'bg-sky-400', d: '80ms' },
    { l: '20%', t: '70%', c: 'bg-green-400', d: '120ms' },
    { l: '50%', t: '10%', c: 'bg-teal-300', d: '60ms' },
    { l: '40%', t: '80%', c: 'bg-lime-300', d: '100ms' },
  ]
  return (
    <span
      className="pointer-events-none absolute inset-0 overflow-visible opacity-0 transition-opacity duration-200 group-hover/confetti:opacity-100"
      aria-hidden
    >
      {specks.map((s, i) => (
        <span
          key={i}
          className={`absolute h-1.5 w-1.5 rounded-sm ${s.c} motion-safe:animate-bounce`}
          style={{ left: s.l, top: s.t, animationDelay: s.d, animationDuration: '1.1s' }}
        />
      ))}
    </span>
  )
}

function DynamicCTACardInner() {
  const [todayStatus, setTodayStatus] = useState<ProgressStatus | null>(null)
  const [progressLoading, setProgressLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [isDark, setIsDark] = useState(false)
  const [bgLoaded, setBgLoaded] = useState(false)
  const [ctaContext, setCtaContext] = useState<CtaContext>({ loopsThisWeek: 0, streakDays: 0 })
  const [messageDef, setMessageDef] = useState<CtaMessageDef | null>(null)
  const [preferredName, setPreferredName] = useState('')
  const [profileTz, setProfileTz] = useState<string | null>(() =>
    typeof window !== 'undefined' ? getBrowserTimeZone() : null,
  )
  const [clockTick, setClockTick] = useState(0)
  /** `evening_reviews.is_day_complete` for founder-day — “Empire Secured” on evening CTA when true. */
  const [empireSecured, setEmpireSecured] = useState(false)

  const progressFetchGen = useRef(0)

  /** Founder-day date in profile TZ, else browser IANA (not UTC) until profile resolves. */
  const planToday = useMemo(() => {
    const now = new Date()
    if (profileTz) return getPlanDateString(profileTz, now)
    return getEffectivePlanDate(now)
  }, [clockTick, profileTz])

  /** Hour of day in the same timezone as planToday — drives CTA phase, not server UTC. */
  const hourLocal = useMemo(() => {
    const now = new Date()
    if (profileTz) return parseInt(formatInTimeZone(now, profileTz, 'H'), 10)
    return now.getHours()
  }, [clockTick, profileTz])

  const displayMode = useMemo((): DisplayMode | null => {
    if (todayStatus === null) return null
    return resolveDisplayMode(todayStatus, hourLocal)
  }, [todayStatus, hourLocal])

  const rotateKey = useMemo((): MessageRotateKey | null => {
    if (!displayMode) return null
    return messageKeyFromMode(displayMode)
  }, [displayMode])

  useEffect(() => {
    setMounted(true)
    setIsDark(typeof document !== 'undefined' && document.documentElement.classList.contains('dark'))
    setClockTick((t) => t + 1)
  }, [])

  useEffect(() => {
    if (!displayMode) return
    setBgLoaded(false)
  }, [displayMode, isDark])

  useEffect(() => {
    const bump = () => setClockTick((t) => t + 1)
    const id = window.setInterval(bump, 60_000)
    const onVis = () => {
      if (document.visibilityState === 'visible') bump()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])

  useEffect(() => {
    if (progressLoading || rotateKey === null) return
    setMessageDef(pickMessageId(messagesForRotateKey(rotateKey), rotateKey))
  }, [progressLoading, rotateKey])

  const loadProgress = useCallback(async (quiet = false) => {
    const gen = ++progressFetchGen.current
    if (!quiet) {
      setProgressLoading(true)
      setBgLoaded(false)
    }
    try {
      const weekDates = weekDatesForProgress(planToday)
      const datesParam = [...new Set([planToday, ...weekDates])].join(',')
      const q = new URLSearchParams({ dates: datesParam })
      const bz = getBrowserTimeZone()
      if (bz) q.set('tz', bz)
      const res = await fetch(`/api/user/progress?${q.toString()}`, { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch today progress')
      const data = (await res.json()) as Record<string, ProgressStatus>
      const status = data[planToday] ?? 'empty'

      let loopsThisWeek = 0
      for (const d of weekDates) {
        if (data[d] === 'full') loopsThisWeek++
      }

      let streakDays = 0
      const session = await getUserSession()
      if (session) {
        const { data: prof } = await supabase
          .from('user_profiles')
          .select('current_streak, preferred_name, name, timezone')
          .eq('id', session.user.id)
          .maybeSingle()
        const row = prof as {
          current_streak?: number
          preferred_name?: string | null
          name?: string | null
          timezone?: string | null
        } | null
        const cs = row?.current_streak
        streakDays =
          typeof cs === 'number' && Number.isFinite(cs) ? Math.max(0, Math.floor(cs)) : 0
        const pn = (row?.preferred_name ?? row?.name ?? '').trim()

        const { data: eveningRow } = await supabase
          .from('evening_reviews')
          .select('is_day_complete')
          .eq('user_id', session.user.id)
          .eq('review_date', planToday)
          .maybeSingle()
        const dayComplete = !!(eveningRow as { is_day_complete?: boolean } | null)?.is_day_complete

        if (progressFetchGen.current === gen) {
          setPreferredName(pn)
          setProfileTz(resolveUserTimeZone(row, getBrowserTimeZone()))
          setEmpireSecured(dayComplete)
        }
      } else if (progressFetchGen.current === gen) {
        setEmpireSecured(false)
      }

      if (progressFetchGen.current !== gen) return

      setTodayStatus(status)
      setCtaContext({ loopsThisWeek, streakDays })
    } catch {
      if (progressFetchGen.current === gen) {
        setTodayStatus('empty')
        setCtaContext({ loopsThisWeek: 0, streakDays: 0 })
        setEmpireSecured(false)
      }
    } finally {
      if (progressFetchGen.current === gen && !quiet) setProgressLoading(false)
    }
  }, [planToday])

  useEffect(() => {
    void loadProgress(false)
  }, [loadProgress])

  useEffect(() => {
    const onSync = () => {
      void loadProgress(true)
    }
    window.addEventListener('data-sync-request', onSync)
    return () => window.removeEventListener('data-sync-request', onSync)
  }, [loadProgress])

  const cfg = displayMode ? ctaConfigFor(displayMode, planToday) : ctaConfigFor({ phase: 'morning', intent: 'need_plan' }, planToday)

  const showEmpireSecured =
    empireSecured &&
    (cfg.href.includes('/evening') || /Evening Review/i.test(cfg.buttonText))

  const isCelebration = displayMode?.phase === 'celebration'
  const isEveningNudge = displayMode?.phase === 'evening_nudge'
  const isEarlyLoopClosed = displayMode?.phase === 'loop_closed_early'
  const needMorningPlan = displayMode?.phase === 'morning' && displayMode.intent === 'need_plan'
  const focusPlan = displayMode?.phase === 'morning' && displayMode.intent === 'focus_plan'

  const useCoralAccent = Boolean(needMorningPlan || focusPlan)
  const useCelebrationBorder = Boolean(isCelebration)

  const eveningPulseButtonClass =
    'bg-[#152B50] hover:bg-[#152B50]/90 shadow-md hover:-translate-y-0.5 hover:shadow-lg transition motion-safe:animate-pulse'
  const navyButtonClass = 'bg-[#152b50] hover:bg-[#152b50]/90 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition'

  const reportName = preferredName || 'Founder'

  const imageLayers = useMemo(() => {
    if (!displayMode) return { kind: 'none' as const }
    if (isCelebration) {
      return { kind: 'celebration' as const, src: '/dashboard/cta-light.png' }
    }
    if (isEveningNudge) {
      return { kind: 'single' as const, src: '/dashboard/cta-dark.png' }
    }
    const src = isDark ? '/dashboard/cta-dark.png' : '/dashboard/morning_02.png'
    return { kind: 'single' as const, src }
  }, [displayMode, isCelebration, isEveningNudge, isDark])

  const stateReady = !progressLoading && displayMode !== null && messageDef !== null
  const canShowBackground =
    stateReady &&
    imageLayers.kind !== 'none' &&
    (isCelebration || isEveningNudge || isEarlyLoopClosed || mounted)
  const showSkeleton = !stateReady || !canShowBackground

  const bodyText = stateReady && messageDef ? messageDef.build(ctaContext) : ''
  const isQuote = stateReady && messageDef?.kind === 'quote'
  const isTip = stateReady && messageDef?.kind === 'tip'

  const cardBorderClass = !stateReady
    ? 'border-gray-200 dark:border-gray-600'
    : useCelebrationBorder
      ? 'border-emerald-500 dark:border-emerald-400'
      : useCoralAccent
        ? 'border-[#ef725c]'
        : 'border-[#152b50]'

  const cardBgClass =
    stateReady && isCelebration
      ? 'bg-emerald-50/95 dark:bg-emerald-950/30'
      : 'bg-[#ecf9ef] dark:bg-[#d8efff]'

  return (
    <div
      className={`relative min-h-[200px] overflow-hidden border-2 lg:min-h-[260px] ${cardBorderClass} ${cardBgClass}`}
    >
      {showSkeleton ? (
        <div
          className="absolute inset-0 animate-pulse bg-gradient-to-br from-gray-200/80 via-gray-100/60 to-gray-200/80 dark:from-gray-700/80 dark:via-gray-800/60 dark:to-gray-700/80"
          aria-hidden
        />
      ) : imageLayers.kind === 'celebration' ? (
        <>
          <img
            key={imageLayers.src}
            src={imageLayers.src}
            alt=""
            aria-hidden
            onLoad={() => setBgLoaded(true)}
            className={`absolute inset-0 h-full w-full object-cover object-top md:object-top-left pointer-events-none select-none transition-opacity duration-300 ${
              bgLoaded ? 'opacity-100' : 'opacity-0'
            }`}
          />
          <div
            className="absolute inset-0 bg-gradient-to-br from-emerald-200/55 via-green-100/45 to-teal-100/50 dark:from-emerald-900/50 dark:via-green-950/35 dark:to-teal-950/40 pointer-events-none"
            aria-hidden
          />
        </>
      ) : imageLayers.kind === 'single' ? (
        <img
          key={imageLayers.src}
          src={imageLayers.src}
          alt=""
          aria-hidden
          onLoad={() => setBgLoaded(true)}
          className={`absolute inset-0 h-full w-full object-cover pointer-events-none select-none transition-opacity duration-300 ${
            isEveningNudge ? 'object-top md:object-top-left' : isDark ? 'object-top md:object-top-left' : 'object-top md:object-top-left lg:object-right'
          } ${bgLoaded ? 'opacity-100' : 'opacity-0'}`}
        />
      ) : null}

      {!showSkeleton ? (
        <div
          className={`absolute inset-0 pointer-events-none ${
            isCelebration
              ? 'bg-gradient-to-r from-white/50 via-emerald-50/25 to-transparent dark:from-emerald-950/30 dark:via-emerald-950/15 dark:to-transparent'
              : 'bg-gradient-to-r from-white/65 via-white/35 to-transparent dark:from-[#0f172a]/50 dark:via-[#0f172a]/25 dark:to-transparent'
          }`}
        />
      ) : null}

      <div className="relative z-10 flex min-h-[200px] flex-col justify-between p-4 lg:min-h-[260px]">
        <div className="space-y-2 min-w-0">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
            {!stateReady ? 'Daily loop' : sectionEyebrow(displayMode!)}
          </p>
          {!stateReady ? (
            <h3 className="text-xl font-semibold text-[#152b50] dark:text-sky-100">Checking your progress...</h3>
          ) : (
            <>
              <p
                className={`text-base leading-snug text-[#152b50] dark:text-sky-100 ${
                  isQuote ? 'italic' : ''
                } ${isTip ? 'pl-0' : ''}`}
              >
                {isTip ? <span className="not-italic mr-1">💡</span> : null}
                {isQuote ? `“${bodyText}”` : bodyText}
              </p>
              {isQuote ? (
                <p className="text-xs text-gray-500 dark:text-gray-400">— Mrs. Deer</p>
              ) : null}
            </>
          )}
        </div>

        <div className="pt-3 mt-auto space-y-2">
          {stateReady && isEveningNudge ? (
            <p className="relative z-10 max-w-[16rem] rounded-2xl rounded-bl-md border border-[#152b50]/25 bg-white/90 px-3 py-2 text-xs font-medium leading-snug text-[#152b50] shadow-sm dark:border-sky-200/20 dark:bg-[#0f172a]/85 dark:text-sky-100">
              I&apos;m ready for your report, {reportName}. Let&apos;s close the loop.
            </p>
          ) : null}
          <Link
            href={cfg.href}
            aria-label={
              stateReady
                ? showEmpireSecured
                  ? 'Empire secured — evening loop closed for today'
                  : `${cfg.title}. ${bodyText}`
                : cfg.buttonText
            }
            className={`relative inline-flex items-center px-4 py-2 text-white text-sm font-medium transition overflow-visible ${
              useCoralAccent
                ? 'bg-[#ef725c] hover:opacity-90'
                : isEveningNudge
                  ? eveningPulseButtonClass
                  : isCelebration
                    ? `group/confetti ${navyButtonClass} hover:shadow-lg hover:shadow-emerald-600/20`
                    : navyButtonClass
            }`}
          >
            {isCelebration ? <CelebrationConfettiHover /> : null}
            <span className="relative z-[1] inline-flex items-center gap-2">
              {showEmpireSecured ? (
                <>
                  <CircleCheck
                    className="h-5 w-5 shrink-0 text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.45)]"
                    aria-hidden
                  />
                  Empire Secured
                </>
              ) : (
                cfg.buttonText
              )}
            </span>
          </Link>
        </div>
      </div>
    </div>
  )
}

export const DynamicCTACard = memo(DynamicCTACardInner)
