'use client'

import { DecisionStylePie } from '@/components/founder-dna/DecisionStylePie'
import { PostponementPatternsCard } from '@/components/founder-dna/PostponementPatternsCard'
import { EnergyMoodChart } from '@/components/founder-dna/EnergyMoodChart'
import { RecurringQuestionCard } from '@/components/founder-dna/RecurringQuestionCard'
import { CircleProgress } from '@/components/ui/CircleProgress'
import { useFounderJourney } from '@/lib/hooks/useFounderJourney'
import type { JourneyBadge } from '@/lib/types/founder-dna'
import {
  DECISION_STYLE_MIN_DAYS,
  POSTPONEMENT_MIN_DAYS,
  RECURRING_QUESTION_MIN_DAYS,
  SCHEDULE_ENERGY_MIN_DAYS,
} from '@/lib/founder-dna/unlock-schedule-config'

function hasFeature(unlocked: JourneyBadge[] | undefined, name: string): boolean {
  return unlocked?.some((f) => f.name === name) ?? false
}

const PATTERNS_FIRST_UNLOCK_PEEK =
  'Mrs. Deer will show you how your energy and mood move together across your reflections.'

type PatternTeaser = {
  id: string
  emoji: string
  title: string
  targetDays: number
  remaining: number
  peek: string
}

function buildPatternTeasers(
  dwe: number,
  energyOk: boolean,
  decisionOk: boolean,
  postOk: boolean,
  recurringOk: boolean,
): PatternTeaser[] {
  const out: PatternTeaser[] = []
  if (!energyOk) {
    const remaining = Math.max(0, SCHEDULE_ENERGY_MIN_DAYS - dwe)
    out.push({
      id: 'energy',
      emoji: '⚡',
      title: 'Energy & Mood Trend',
      targetDays: SCHEDULE_ENERGY_MIN_DAYS,
      remaining,
      peek:
        'Mrs. Deer will show you how your energy and mood move together across your reflections — so you can spot what lifts you and what drains you.',
    })
  }
  if (!decisionOk) {
    const remaining = Math.max(0, DECISION_STYLE_MIN_DAYS - dwe)
    out.push({
      id: 'decision',
      emoji: '🎯',
      title: 'Decision Style',
      targetDays: DECISION_STYLE_MIN_DAYS,
      remaining,
      peek:
        'Mrs. Deer will reveal whether you lean strategic or tactical in your choices — and how that shows up in your mornings and evenings.',
    })
  }
  if (!postOk) {
    const remaining = Math.max(0, POSTPONEMENT_MIN_DAYS - dwe)
    out.push({
      id: 'postponement',
      emoji: '⏳',
      title: 'Postponement Patterns',
      targetDays: POSTPONEMENT_MIN_DAYS,
      remaining,
      peek:
        'Mrs. Deer will share gentle observations about what tends to wait — no judgment, just awareness you can act on.',
    })
  }
  if (!recurringOk) {
    const remaining = Math.max(0, RECURRING_QUESTION_MIN_DAYS - dwe)
    out.push({
      id: 'recurring',
      emoji: '💫',
      title: 'Recurring Question',
      targetDays: RECURRING_QUESTION_MIN_DAYS,
      remaining,
      peek:
        'Mrs. Deer will listen for the questions you ask yourself again and again — the ones that point to what matters most right now.',
    })
  }
  return out.sort((a, b) => a.targetDays - b.targetDays)
}

function PatternTeasersBlock({ teasers, variant }: { teasers: PatternTeaser[]; variant: 'lead' | 'tail' }) {
  if (teasers.length === 0) return null
  const isTail = variant === 'tail'
  return (
    <section
      aria-labelledby="patterns-teasers"
      className={
        isTail
          ? 'mt-10 pt-2 border-t border-gray-200/80 dark:border-gray-700/80'
          : 'pt-2'
      }
    >
      <h2 id="patterns-teasers" className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
        {isTail ? 'Still opening' : 'On the way'}
      </h2>
      <div className="rounded-lg border border-amber-100/80 dark:border-amber-900/30 bg-amber-50/40 dark:bg-amber-950/15 px-4 py-4 space-y-5">
        {teasers.map((item) => (
          <div key={item.id}>
            <p className="text-sm font-semibold text-gray-900 dark:text-white leading-snug">
              <span aria-hidden className="mr-1">
                {item.emoji}
              </span>
              {item.title}
              <span className="font-normal text-gray-600 dark:text-gray-400">
                {' '}
                — In {item.remaining} {item.remaining === 1 ? 'day' : 'days'}
              </span>
            </p>
            <p className="mt-2 text-sm text-gray-700 dark:text-gray-300 leading-relaxed pl-0 sm:pl-6">
              {item.peek}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}

export function PatternsPageContent() {
  const { data, loading, error } = useFounderJourney()

  if (loading && !data) {
    return <p className="text-sm text-gray-500 dark:text-gray-400 italic">Gathering your patterns…</p>
  }

  if (error && !data) {
    return (
      <p className="text-sm text-gray-600 dark:text-red-400" role="alert">
        Could not load your journey. Refresh the page or try again shortly.
      </p>
    )
  }

  const milestones = data?.milestones
  const dwe = milestones?.daysWithEntries ?? milestones?.daysActive ?? 0
  const feats = data?.unlockedFeatures ?? []

  const energyUnlocked = dwe >= SCHEDULE_ENERGY_MIN_DAYS || hasFeature(feats, 'energy_trends')
  const decisionUnlocked = dwe >= DECISION_STYLE_MIN_DAYS || hasFeature(feats, 'decision_style')
  const postUnlocked = dwe >= POSTPONEMENT_MIN_DAYS || hasFeature(feats, 'postponement_patterns')
  const recurringUnlocked = dwe >= RECURRING_QUESTION_MIN_DAYS || hasFeature(feats, 'recurring_question')

  const teasers = buildPatternTeasers(dwe, energyUnlocked, decisionUnlocked, postUnlocked, recurringUnlocked)
  const hasMainSections = energyUnlocked || decisionUnlocked || postUnlocked || recurringUnlocked
  const showFirstUnlockProgress = dwe < SCHEDULE_ENERGY_MIN_DAYS
  const patternsFirstRemaining = SCHEDULE_ENERGY_MIN_DAYS - dwe

  return (
    <>
      <p className="text-sm italic text-gray-600 dark:text-gray-400 mb-8">
        New reads land here as you reflect — energy and mood first, then how you choose, what tends to wait, and the
        questions that keep returning.
      </p>

      {showFirstUnlockProgress ? (
        <div
          className="mb-8 pb-6 border-b border-gray-200/80 dark:border-gray-700/80"
          aria-labelledby="patterns-first-unlock-heading"
        >
          <div className="flex justify-center">
            <CircleProgress
              current={dwe}
              target={SCHEDULE_ENERGY_MIN_DAYS}
              size={80}
              unitLabel="days"
            />
          </div>
          <div className="mt-4 max-w-lg mx-auto text-left">
            <p
              id="patterns-first-unlock-heading"
              className="text-sm font-semibold text-gray-900 dark:text-white leading-snug"
            >
              Next unlock: Energy &amp; Mood Trend
              <span className="font-normal text-gray-600 dark:text-gray-400">
                {' '}
                — in {patternsFirstRemaining} {patternsFirstRemaining === 1 ? 'day' : 'days'}
              </span>
            </p>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              {PATTERNS_FIRST_UNLOCK_PEEK}
            </p>
          </div>
        </div>
      ) : null}

      {!hasMainSections && teasers.length === 0 ? (
        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          Keep checking in. After a few more days of reflections, patterns will start to emerge.
        </p>
      ) : null}

      {!hasMainSections ? <PatternTeasersBlock teasers={teasers} variant="lead" /> : null}

      <div className="space-y-10">
        {energyUnlocked ? (
          <section aria-labelledby="patterns-energy">
            <h2 id="patterns-energy" className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              <span aria-hidden>⚡ </span>
              Energy &amp; mood trend
            </h2>
            <EnergyMoodChart />
          </section>
        ) : null}

        {decisionUnlocked ? (
          <section aria-labelledby="patterns-decision">
            <h2 id="patterns-decision" className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              <span aria-hidden>🎯 </span>
              Decision style
            </h2>
            <DecisionStylePie />
          </section>
        ) : null}

        {postUnlocked ? (
          <section aria-labelledby="patterns-postponement">
            <h2 id="patterns-postponement" className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              <span aria-hidden>⏳ </span>
              Postponement patterns
            </h2>
            <PostponementPatternsCard />
          </section>
        ) : null}

        {recurringUnlocked ? (
          <section aria-labelledby="patterns-recurring">
            <h2 id="patterns-recurring" className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              <span aria-hidden>💫 </span>
              Recurring question
            </h2>
            <RecurringQuestionCard />
          </section>
        ) : null}
      </div>

      {hasMainSections ? <PatternTeasersBlock teasers={teasers} variant="tail" /> : null}
    </>
  )
}
