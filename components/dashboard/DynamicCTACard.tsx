'use client'

import { memo, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { format, subDays } from 'date-fns'
import { getEffectivePlanDate } from '@/lib/effective-plan-date'
import { getUserSession } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

type CtaState = 'morning' | 'evening' | 'complete'
type ProgressStatus = 'full' | 'half' | 'partial' | 'empty' | 'future'

type CtaConfig = {
  title: string
  buttonText: string
  href: string
}

function configFor(state: CtaState): CtaConfig {
  if (state === 'morning') {
    return {
      title: 'Start your day',
      buttonText: 'Morning Plan →',
      href: '/morning',
    }
  }
  if (state === 'evening') {
    return {
      title: 'Complete the loop',
      buttonText: 'Evening Reflection →',
      href: `/evening?date=${getEffectivePlanDate()}#evening-form`,
    }
  }
  return {
    title: 'Great job today',
    buttonText: 'View Insights →',
    href: `/history?date=${format(new Date(), 'yyyy-MM-dd')}&celebrate=true`,
  }
}

type MessageKind = 'quote' | 'benefit' | 'progress' | 'streak' | 'tip' | 'insight'

type CtaMessageDef = {
  id: string
  kind: MessageKind
  /** Static copy, or built with loop/streak context */
  build: (ctx: CtaContext) => string
}

type CtaContext = {
  loopsThisWeek: number
  streakDays: number
}

const LS_KEY = 'wof-cta-rotate-v1'

function readLastMessageId(state: CtaState): string | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return null
    const o = JSON.parse(raw) as { state?: string; id?: string }
    return o.state === state && typeof o.id === 'string' ? o.id : null
  } catch {
    return null
  }
}

function writeLastMessageId(state: CtaState, id: string) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ state, id }))
  } catch {
    /* ignore quota */
  }
}

function pickMessageId(defs: CtaMessageDef[], state: CtaState): CtaMessageDef {
  if (defs.length === 0) {
    return {
      id: 'fallback',
      kind: 'benefit',
      build: () => '',
    }
  }
  const lastId = readLastMessageId(state)
  const pool = defs.length > 1 && lastId ? defs.filter((d) => d.id !== lastId) : defs
  const seed = Date.now() % 997 + state.length * 13 + (lastId?.length ?? 0)
  const idx = seed % pool.length
  const chosen = pool[idx]!
  writeLastMessageId(state, chosen.id)
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

const COMPLETE_MESSAGES: CtaMessageDef[] = [
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

function messagesForState(state: CtaState): CtaMessageDef[] {
  if (state === 'morning') return MORNING_MESSAGES
  if (state === 'evening') return EVENING_MESSAGES
  return COMPLETE_MESSAGES
}

function sectionEyebrow(state: CtaState): string {
  if (state === 'morning') return '☀️ Start your day'
  if (state === 'evening') return '🌙 Daily loop'
  return '✨ Great job today'
}

function weekDatesForProgress(): string[] {
  const anchor = getEffectivePlanDate()
  const base = new Date(anchor + 'T12:00:00')
  const dates: string[] = []
  for (let i = 6; i >= 0; i--) {
    dates.push(format(subDays(base, i), 'yyyy-MM-dd'))
  }
  return dates
}

function DynamicCTACardInner() {
  const [resolvedState, setResolvedState] = useState<CtaState | null>(null)
  const [progressLoading, setProgressLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [isDark, setIsDark] = useState(false)
  const [bgLoaded, setBgLoaded] = useState(false)
  const [ctaContext, setCtaContext] = useState<CtaContext>({ loopsThisWeek: 0, streakDays: 0 })
  const [messageDef, setMessageDef] = useState<CtaMessageDef | null>(null)

  const today = useMemo(() => format(new Date(), 'yyyy-MM-dd'), [])

  useEffect(() => {
    setMounted(true)
    setIsDark(typeof document !== 'undefined' && document.documentElement.classList.contains('dark'))
  }, [])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setProgressLoading(true)
      setBgLoaded(false)
      try {
        const weekDates = weekDatesForProgress()
        const datesParam = [...new Set([today, ...weekDates])].join(',')
        const res = await fetch(`/api/user/progress?dates=${datesParam}`, { credentials: 'include' })
        if (!res.ok) throw new Error('Failed to fetch today progress')
        const data = (await res.json()) as Record<string, ProgressStatus>
        const status = data[today] ?? 'empty'

        let loopsThisWeek = 0
        for (const d of weekDates) {
          if (data[d] === 'full') loopsThisWeek++
        }

        let streakDays = 0
        const session = await getUserSession()
        if (session) {
          const { data: prof } = await supabase
            .from('user_profiles')
            .select('current_streak')
            .eq('id', session.user.id)
            .maybeSingle()
          const cs = (prof as { current_streak?: number } | null)?.current_streak
          streakDays =
            typeof cs === 'number' && Number.isFinite(cs) ? Math.max(0, Math.floor(cs)) : 0
        }

        if (cancelled) return

        let nextState: CtaState
        if (status === 'full') nextState = 'complete'
        else if (status === 'half') nextState = 'evening'
        else nextState = 'morning'

        setResolvedState(nextState)
        setCtaContext({ loopsThisWeek, streakDays })
        const defs = messagesForState(nextState)
        setMessageDef(pickMessageId(defs, nextState))
      } catch {
        if (!cancelled) {
          setResolvedState('morning')
          setCtaContext({ loopsThisWeek: 0, streakDays: 0 })
          setMessageDef(pickMessageId(messagesForState('morning'), 'morning'))
        }
      } finally {
        if (!cancelled) setProgressLoading(false)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [today])

  const cfg = resolvedState ? configFor(resolvedState) : configFor('morning')
  const forceNightBackground = resolvedState === 'evening'
  const useCoralAccent = resolvedState === 'morning'

  const imageSrc = useMemo(() => {
    if (!resolvedState) return null
    if (forceNightBackground) return '/dashboard/cta-dark.png'
    return isDark ? '/dashboard/cta-dark.png' : '/dashboard/morning_02.png'
  }, [resolvedState, forceNightBackground, isDark])

  const stateReady = !progressLoading && resolvedState !== null && messageDef !== null
  const canShowBackground = stateReady && imageSrc && (forceNightBackground || mounted)
  const showSkeleton = !stateReady || !canShowBackground

  const bodyText =
    stateReady && messageDef ? messageDef.build(ctaContext) : ''
  const isQuote = stateReady && messageDef?.kind === 'quote'
  const isTip = stateReady && messageDef?.kind === 'tip'

  return (
    <div
      className={`relative overflow-hidden h-full min-h-[200px] border-2 ${
        stateReady && useCoralAccent ? 'border-[#ef725c]' : stateReady ? 'border-[#152b50]' : 'border-gray-200 dark:border-gray-600'
      } bg-[#ecf9ef] dark:bg-[#d8efff]`}
    >
      {showSkeleton ? (
        <div
          className="absolute inset-0 animate-pulse bg-gradient-to-br from-gray-200/80 via-gray-100/60 to-gray-200/80 dark:from-gray-700/80 dark:via-gray-800/60 dark:to-gray-700/80"
          aria-hidden
        />
      ) : (
        <img
          key={imageSrc}
          src={imageSrc!}
          alt=""
          aria-hidden
          onLoad={() => setBgLoaded(true)}
          className={`absolute inset-0 h-full w-full object-cover pointer-events-none select-none transition-opacity duration-300 ${
            forceNightBackground ? 'object-top md:object-top-left' : isDark ? 'object-top md:object-top-left' : 'object-top md:object-top-left lg:object-right'
          } ${bgLoaded ? 'opacity-100' : 'opacity-0'}`}
        />
      )}

      {!showSkeleton ? (
        <div className="absolute inset-0 bg-gradient-to-r from-white/65 via-white/35 to-transparent dark:from-[#0f172a]/50 dark:via-[#0f172a]/25 dark:to-transparent" />
      ) : null}

      <div className="relative z-10 p-4 h-full flex flex-col justify-between min-h-[inherit]">
        <div className="space-y-2 min-w-0">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
            {!stateReady ? 'Daily loop' : sectionEyebrow(resolvedState!)}
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

        <div className="pt-3 mt-auto">
          <Link
            href={cfg.href}
            aria-label={stateReady ? `${cfg.title}. ${bodyText}` : cfg.buttonText}
            className={`inline-flex items-center px-4 py-2 text-white text-sm font-medium hover:opacity-90 transition ${
              stateReady && useCoralAccent ? 'bg-[#ef725c]' : 'bg-[#152b50]'
            }`}
          >
            {cfg.buttonText}
          </Link>
        </div>
      </div>
    </div>
  )
}

export const DynamicCTACard = memo(DynamicCTACardInner)
