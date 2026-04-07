'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useFounderJourney } from '@/lib/hooks/useFounderJourney'
import { useEnergyTrendsCheck } from '@/lib/hooks/useEnergyTrendsCheck'
import { useDecisionStyleCheck } from '@/lib/hooks/useDecisionStyleCheck'
import { useFounderArchetypeCheck } from '@/lib/hooks/useFounderArchetypeCheck'
import { EnergyTrendsCelebration } from '@/components/founder-dna/EnergyTrendsCelebration'
import { DecisionStyleCelebration } from '@/components/founder-dna/DecisionStyleCelebration'
import { FounderArchetypeCelebration, type ArchetypeMini } from '@/components/founder-dna/FounderArchetypeCelebration'
import { FeatureUnlockQueueModal } from '@/components/founder-dna/FeatureUnlockQueueModal'
import { useWhatsNew } from '@/lib/hooks/useWhatsNew'
import {
  ARCHETYPE_FULL_MIN_DAYS,
  ARCHETYPE_PREVIEW_MIN_DAYS,
  getArchetypeJourneyStatus,
} from '@/lib/founder-dna/archetype-timing'
import {
  CELEBRATION_GAP_MIN_DAYS,
  DECISION_STYLE_MIN_DAYS,
  POSTPONEMENT_MIN_DAYS,
  RECURRING_QUESTION_MIN_DAYS,
  SCHEDULE_ENERGY_MIN_DAYS,
} from '@/lib/founder-dna/unlock-schedule-config'
import { BadgeGallery } from '@/components/badges/BadgeGallery'
import { BadgeUnlockFlow } from '@/components/badges/BadgeUnlockFlow'

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function formatProgress(current: number, target: number) {
  if (target <= 0) return '0/0'
  return `${current}/${target}`
}

function ProgressBar({ valuePct }: { valuePct: number }) {
  const pct = clamp(valuePct, 0, 100)
  return (
    <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden" aria-label="progress">
      <div
        className="h-full rounded-full bg-[#ef725c]"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export function FounderJourneyDashboard() {
  const { data, loading, error } = useFounderJourney()
  const { hasNew, items, markAsViewed } = useWhatsNew()
  const [whatsNewOpen, setWhatsNewOpen] = useState(false)
  const whatsNewItems = useMemo(() => items.filter((i) => i.id !== 'feature-first_glimpse'), [items])

  const earnedBadges = data?.badges ?? []
  const newlyUnlockedBadges = data?.newlyUnlockedBadges ?? []
  const unlockedFeatures = data?.unlockedFeatures ?? []
  const nextUnlocks = data?.nextUnlocks ?? []
  const milestones = data?.milestones
  const nextMilestone = milestones?.nextMilestones?.[0] ?? null

  const activityDays = milestones?.daysWithEntries ?? milestones?.daysActive ?? 0
  const daysForArchetype = data?.archetype?.daysActive ?? activityDays
  const archetypeJourney = data?.archetype
  const archetypeStatus =
    archetypeJourney?.status ?? getArchetypeJourneyStatus(daysForArchetype)
  const daysUntilPreviewArchetype =
    archetypeJourney?.daysUntilPreview ?? Math.max(0, ARCHETYPE_PREVIEW_MIN_DAYS - daysForArchetype)
  const daysUntilFullArchetype =
    archetypeJourney?.daysUntilFull ?? Math.max(0, ARCHETYPE_FULL_MIN_DAYS - daysForArchetype)

  const { showCelebration, setShowCelebration } = useEnergyTrendsCheck()
  const energyTrendsUnlocked = unlockedFeatures.some((f) => f.name === 'energy_trends')
  const energyTrendsLocked = nextUnlocks.find((u) => u.id === 'energy_trends') ?? null

  const { showCelebration: showDecisionStyleCelebration, setShowCelebration: setDecisionStyleCelebration } =
    useDecisionStyleCheck()
  const decisionStyleUnlocked = unlockedFeatures.some((f) => f.name === 'decision_style')
  const decisionStyleLocked = nextUnlocks.find((u) => u.id === 'decision_style') ?? null

  const { showCelebration: showFounderArchetypeCelebration, setShowCelebration: setFounderArchetypeCelebration } =
    useFounderArchetypeCheck()
  const founderArchetypeUnlocked = unlockedFeatures.some((f) => f.name === 'founder_archetype')
  const founderArchetypeLocked = nextUnlocks.find((u) => u.id === 'founder_archetype') ?? null
  const postponementUnlocked = activityDays >= POSTPONEMENT_MIN_DAYS
  const postponementLocked = nextUnlocks.find((u) => u.id === 'postponement_patterns') ?? null
  const celebrationGapUnlocked = activityDays >= CELEBRATION_GAP_MIN_DAYS
  const celebrationGapLocked = nextUnlocks.find((u) => u.id === 'celebration_gap') ?? null
  const recurringQuestionUnlocked = activityDays >= RECURRING_QUESTION_MIN_DAYS
  const recurringQuestionLocked = nextUnlocks.find((u) => u.id === 'recurring_question') ?? null

  const [postponementPreview, setPostponementPreview] = useState<{
    actionPlan: string
    count: number
    percentage: number
    tip: string
  } | null>(null)
  const [postponementPreviewLoading, setPostponementPreviewLoading] = useState(false)

  const [decisionSummary, setDecisionSummary] = useState<{
    strategic: number
    tactical: number
    total: number
    insight: string
  } | null>(null)
  const [decisionSummaryLoading, setDecisionSummaryLoading] = useState(false)

  const [archetypePreview, setArchetypePreview] = useState<{
    status?: 'preview' | 'full'
    primary: ArchetypeMini
    secondary?: ArchetypeMini
  } | null>(null)
  const [archetypePreviewLoading, setArchetypePreviewLoading] = useState(false)
  const [archetypeEvolutionHistory, setArchetypeEvolutionHistory] = useState<
    Array<{ fromPrimary: string; toPrimary: string; periodLabel: string; at: string }>
  >([])

  const energyTrendsAccessible = energyTrendsUnlocked || activityDays >= SCHEDULE_ENERGY_MIN_DAYS

  const decisionStyleAccessible =
    decisionStyleUnlocked || activityDays >= DECISION_STYLE_MIN_DAYS

  useEffect(() => {
    if (!decisionStyleAccessible) return

    let cancelled = false
    const run = async () => {
      try {
        setDecisionSummaryLoading(true)
        setDecisionSummary(null)
        const res = await fetch('/api/founder-dna/decisions', { credentials: 'include' })
        if (!res.ok) return
        const json = await res.json()
        if (!cancelled) {
          setDecisionSummary(json as { strategic: number; tactical: number; total: number; insight: string })
        }
      } finally {
        if (!cancelled) setDecisionSummaryLoading(false)
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [decisionStyleAccessible])

  useEffect(() => {
    if (!founderArchetypeUnlocked) return

    let cancelled = false
    const run = async () => {
      setArchetypePreviewLoading(true)
      setArchetypePreview(null)
      try {
        const res = await fetch('/api/founder-dna/archetype', { credentials: 'include' })
        if (!res.ok) {
          if (!cancelled) setArchetypeEvolutionHistory([])
          return
        }
        const json = await res.json()
        if (!cancelled && (json.status === 'preview' || json.status === 'full') && json.primary) {
          setArchetypePreview({
            status: json.status,
            primary: json.primary as ArchetypeMini,
            secondary: json.status === 'full' ? (json.secondary as ArchetypeMini | undefined) : undefined,
          })
          if (json.status === 'full' && Array.isArray(json.evolutionHistory)) {
            setArchetypeEvolutionHistory(json.evolutionHistory)
          } else {
            setArchetypeEvolutionHistory([])
          }
        }
      } finally {
        if (!cancelled) setArchetypePreviewLoading(false)
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [founderArchetypeUnlocked])

  useEffect(() => {
    if (!postponementUnlocked) return

    let cancelled = false

    const run = async () => {
      setPostponementPreviewLoading(true)
      setPostponementPreview(null)
      try {
        const res = await fetch('/api/founder-dna/postponements', { credentials: 'include' })
        if (!res.ok) return
        const json = await res.json()
        if (!cancelled) setPostponementPreview(json?.patterns?.[0] ?? null)
      } finally {
        if (!cancelled) setPostponementPreviewLoading(false)
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [postponementUnlocked])

  const milestoneCards = useMemo(() => {
    if (!milestones) return []
    return [
      { label: 'Current Streak', value: `${milestones.currentStreak}` },
      { label: 'Total Tasks', value: `${milestones.totalTasks}` },
      { label: 'Total Decisions', value: `${milestones.totalDecisions}` },
      { label: 'Total Evenings', value: `${milestones.totalEvenings}` },
      { label: 'Days Active', value: `${milestones.daysActive}` },
      { label: 'Postponed Tasks', value: `${milestones.postponedTasks}` },
    ]
  }, [milestones])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Founder Journey
        </h2>
        <Badge variant="neutral" className="bg-transparent border-none px-3 py-1">
          Progress + Next Unlocks
        </Badge>
      </div>

      {archetypeEvolutionHistory.length > 0 ? (
        <div className="rounded-lg border border-amber-200/70 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20 px-3 py-2.5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200 mb-1.5">
            Evolution history
          </div>
          <p className="text-sm text-gray-800 dark:text-gray-100 leading-relaxed">
            {archetypeEvolutionHistory.map((e, i) => (
              <span key={`${e.at}-${e.fromPrimary}-${e.toPrimary}`}>
                {i > 0 ? <span className="text-gray-400 mx-1">·</span> : null}
                <span className="capitalize">{e.fromPrimary}</span>{' '}
                <span className="text-gray-500 dark:text-gray-400 text-xs">({e.periodLabel})</span>
                <span className="text-amber-700 dark:text-amber-300 mx-1">→</span>
                <span className="capitalize font-medium">{e.toPrimary}</span>
              </span>
            ))}
          </p>
        </div>
      ) : null}

      <Card className="border-none shadow-none bg-transparent">
        <CardHeader className="px-0 pb-2 md:pb-0">
          <CardTitle className="text-lg">Your unlock path</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {loading ? (
            <div className="text-sm text-gray-600 dark:text-gray-300">Loading your journey...</div>
          ) : error ? (
            <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <div className="p-4 rounded-lg bg-blue-50/70 dark:bg-blue-900/20 border border-blue-100/80 dark:border-blue-900/40">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Badge Gallery</h3>
                  <BadgeGallery badges={earnedBadges} />
                </div>

                <div className="p-4 rounded-lg bg-blue-50/70 dark:bg-blue-900/20 border border-blue-100/80 dark:border-blue-900/40">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Coming up next</h3>
                  {nextUnlocks.length === 0 ? (
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      You have no locked unlocks right now. Keep going.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {nextUnlocks.map((u) => {
                        const pct = u.target > 0 ? Math.round((u.progress / u.target) * 100) : 0
                        return (
                          <div key={u.id} className="rounded-lg p-3 bg-white/70 dark:bg-gray-800/40 border border-gray-200/60 dark:border-gray-700/60">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-lg">{u.icon}</span>
                                  <span className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                                    {u.name}
                                  </span>
                                </div>
                                <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">{u.requirement}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-xs font-semibold text-gray-900 dark:text-white">
                                  {formatProgress(u.progress, u.target)}
                                </div>
                              </div>
                            </div>

                            <div className="mt-2">
                              <ProgressBar valuePct={pct} />
                              {u.estimatedDays !== null ? (
                                <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                                  Estimated: ~{u.estimatedDays} days
                                </div>
                              ) : null}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 rounded-lg bg-white/60 dark:bg-gray-800/30 border border-gray-200/60 dark:border-gray-700/60">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">Founder DNA</h3>
                      <button
                        type="button"
                        onClick={() => setWhatsNewOpen(true)}
                        className="relative shrink-0 inline-flex items-center justify-center rounded-lg p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-colors"
                        aria-label="What's new in Founder DNA"
                      >
                        <span className="text-base leading-none" aria-hidden>
                          ✨
                        </span>
                        {hasNew ? (
                          <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-[#ef725c] ring-2 ring-white dark:ring-gray-800" />
                        ) : null}
                      </button>
                    </div>
                    <Link
                      href="/founder-dna/journey"
                      className="text-xs text-[#ef725c] hover:underline w-fit font-medium"
                    >
                      View full schedule →
                    </Link>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 shrink-0 text-right">
                    {energyTrendsAccessible && decisionStyleAccessible ? 'Unlocked' : 'In progress'}
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Energy & Mood Trend */}
                  {energyTrendsAccessible ? (
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="text-2xl leading-none">📊</div>
                        <div className="min-w-0">
                          <div className="font-semibold text-sm text-gray-900 dark:text-white">Energy & Mood Trend</div>
                          <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                            Track how your energy and mood shift over time.
                          </div>
                        </div>
                      </div>
                      <Link href="/founder-dna/rhythm" className="block">
                        <Button variant="coral" size="sm" className="w-full">
                          View your chart →
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="text-2xl leading-none">📊</div>
                        <div className="min-w-0">
                          <div className="font-semibold text-sm text-gray-900 dark:text-white">Energy & Mood Trend</div>
                          <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                            Unlocks after {SCHEDULE_ENERGY_MIN_DAYS} days with entries (or after 3 evening reviews).
                          </div>
                        </div>
                      </div>

                      {energyTrendsLocked ? (
                        <div className="space-y-2">
                          <ProgressBar
                            valuePct={
                              energyTrendsLocked.target > 0
                                ? Math.round((energyTrendsLocked.progress / energyTrendsLocked.target) * 100)
                                : 0
                            }
                          />
                          <div className="text-[11px] text-gray-500 dark:text-gray-400">
                            {energyTrendsLocked.progress}/{energyTrendsLocked.target} days with entries
                          </div>
                        </div>
                      ) : (
                        <div className="text-[11px] text-gray-500 dark:text-gray-400">
                          Reach {SCHEDULE_ENERGY_MIN_DAYS} days with entries or log 3 evenings to begin.
                        </div>
                      )}
                    </div>
                  )}

                  {/* Decision Style */}
                  <div className="pt-1">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-start gap-3">
                        <div className="text-2xl leading-none">🎯</div>
                        <div className="min-w-0">
                          <div className="font-semibold text-sm text-gray-900 dark:text-white">Decision Style</div>
                          <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                            Unlocks after {DECISION_STYLE_MIN_DAYS} days with entries (or when you log your 5th decision).
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {decisionStyleAccessible ? 'Unlocked' : 'Locked'}
                      </div>
                    </div>

                    {decisionStyleAccessible ? (
                      <div className="space-y-3">
                        <Link href="/founder-dna/patterns" className="block">
                          <Button variant="coral" size="sm" className="w-full">
                            View your style →
                          </Button>
                        </Link>

                        {decisionSummaryLoading ? (
                          <div className="text-[11px] text-gray-500 dark:text-gray-400">Loading your ratio...</div>
                        ) : decisionSummary && decisionSummary.total > 0 ? (
                          <div className="text-[11px] text-gray-500 dark:text-gray-400">
                            😊 {Math.round((decisionSummary.strategic / decisionSummary.total) * 100)}% strategic • 🧭{' '}
                            {Math.round((decisionSummary.tactical / decisionSummary.total) * 100)}% tactical
                          </div>
                        ) : (
                          <div className="text-[11px] text-gray-500 dark:text-gray-400">Your ratio will appear here.</div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {decisionStyleLocked ? (
                          <>
                            <ProgressBar
                              valuePct={
                                decisionStyleLocked.target > 0
                                  ? Math.round((decisionStyleLocked.progress / decisionStyleLocked.target) * 100)
                                  : 0
                              }
                            />
                            <div className="text-[11px] text-gray-500 dark:text-gray-400">
                              {decisionStyleLocked.progress}/{decisionStyleLocked.target} days with entries
                            </div>
                          </>
                        ) : (
                          <div className="text-[11px] text-gray-500 dark:text-gray-400">Log more decisions to unlock.</div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Founder Archetype */}
                  <div className="pt-1">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-start gap-3">
                        <div className="text-2xl leading-none">🏷️</div>
                        <div className="min-w-0">
                          <div className="font-semibold text-sm text-gray-900 dark:text-white">
                            Founder Archetype
                            {archetypeStatus === 'preview' ? ' (Preview)' : ''}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                            {archetypeStatus === 'locked'
                              ? `Available in ${daysUntilPreviewArchetype} day${daysUntilPreviewArchetype === 1 ? '' : 's'} · Preview at ${ARCHETYPE_PREVIEW_MIN_DAYS}d, full at ${ARCHETYPE_FULL_MIN_DAYS}d`
                              : archetypeStatus === 'preview'
                                ? 'Your style is emerging — keep reflecting for the full profile.'
                                : 'View your complete founder profile.'}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {archetypeStatus === 'locked' ? 'Locked' : archetypeStatus === 'preview' ? 'Preview' : 'Full'}
                      </div>
                    </div>

                    {founderArchetypeUnlocked ? (
                      <div className="space-y-3">
                        <Link href="/founder-dna/archetype" className="block">
                          <Button variant="coral" size="sm" className="w-full">
                            {archetypeStatus === 'preview'
                              ? 'View emerging archetype →'
                              : 'View your complete profile →'}
                          </Button>
                        </Link>

                        {archetypeStatus === 'preview' && daysUntilFullArchetype > 0 ? (
                          <div className="text-[11px] text-amber-800/90 dark:text-amber-200/80">
                            {daysUntilFullArchetype} more day{daysUntilFullArchetype === 1 ? '' : 's'} until full archetype
                            unlocks.
                          </div>
                        ) : null}

                        {archetypePreviewLoading ? (
                          <div className="text-[11px] text-gray-500 dark:text-gray-400">Loading your archetype...</div>
                        ) : archetypePreview ? (
                          <div className="text-[11px] text-gray-500 dark:text-gray-400">
                            <span className="font-medium text-gray-900 dark:text-white">{archetypePreview.primary.icon} {archetypePreview.primary.label}</span>
                            {typeof archetypePreview.primary.confidence === 'number' ? ` • ~${archetypePreview.primary.confidence}% confidence` : null}
                          </div>
                        ) : (
                          <div className="text-[11px] text-gray-500 dark:text-gray-400">Your archetype will appear here.</div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {founderArchetypeLocked ? (
                          <>
                            <ProgressBar
                              valuePct={
                                founderArchetypeLocked.target > 0
                                  ? Math.round((founderArchetypeLocked.progress / founderArchetypeLocked.target) * 100)
                                  : 0
                              }
                            />
                            <div className="text-[11px] text-gray-500 dark:text-gray-400">
                              {founderArchetypeLocked.progress}/{founderArchetypeLocked.target} days with entries
                            </div>
                          </>
                        ) : (
                          <div className="text-[11px] text-gray-500 dark:text-gray-400">Keep building your streak.</div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Postponement Patterns */}
                  <div className="pt-1">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-start gap-3">
                        <div className="text-2xl leading-none">⏳</div>
                        <div className="min-w-0">
                          <div className="font-semibold text-sm text-gray-900 dark:text-white">Postponement Patterns</div>
                          <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                            {postponementUnlocked
                              ? 'Gentle observations about your patterns'
                              : `Available after ${POSTPONEMENT_MIN_DAYS} days with entries`}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {postponementUnlocked ? 'Unlocked' : 'Locked'}
                      </div>
                    </div>

                    {postponementUnlocked ? (
                      <div className="space-y-3">
                        <Link href="/founder-dna/patterns" className="block">
                          <Button variant="coral" size="sm" className="w-full">
                            Read observations →
                          </Button>
                        </Link>

                        {postponementPreviewLoading ? (
                          <div className="text-[11px] text-gray-500 dark:text-gray-400">Loading your top pattern...</div>
                        ) : postponementPreview ? (
                          <div className="space-y-1">
                            <div className="text-[11px] text-gray-500 dark:text-gray-400">
                              Mrs. Deer noticed: you tend to delay{' '}
                              <span className="font-medium text-gray-900 dark:text-white">{postponementPreview.actionPlan}</span> the
                              most ({postponementPreview.count} times).
                            </div>
                            <div className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">{postponementPreview.tip}</div>
                          </div>
                        ) : (
                          <div className="text-[11px] text-gray-500 dark:text-gray-400">Your top pattern will appear here.</div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {postponementLocked ? (
                          <>
                            <ProgressBar
                              valuePct={
                                postponementLocked.target > 0
                                  ? Math.round((postponementLocked.progress / postponementLocked.target) * 100)
                                  : 0
                              }
                            />
                            <div className="text-[11px] text-gray-500 dark:text-gray-400">
                              {postponementLocked.progress}/{postponementLocked.target} days with entries
                            </div>
                          </>
                        ) : (
                          <div className="text-[11px] text-gray-500 dark:text-gray-400">
                            After {POSTPONEMENT_MIN_DAYS} days with entries, Mrs. Deer will share gentle observations about what you tend to delay.
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Celebration Gap */}
                  <div className="pt-1 border-t border-gray-200/60 dark:border-gray-700/60">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-start gap-3">
                        <div className="text-2xl leading-none">🪞</div>
                        <div className="min-w-0">
                          <div className="font-semibold text-sm text-gray-900 dark:text-white">Celebration Gap</div>
                          <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                            {celebrationGapUnlocked
                              ? 'Hidden wins inside your lessons — Mrs. Deer’s weekly mirror'
                              : `Unlocks after ${CELEBRATION_GAP_MIN_DAYS} days with entries`}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {celebrationGapUnlocked ? 'Unlocked' : 'Locked'}
                      </div>
                    </div>
                    {celebrationGapUnlocked ? (
                      <Link href="/founder-dna/patterns" className="block">
                        <Button variant="coral" size="sm" className="w-full">
                          Open Celebration Gap →
                        </Button>
                      </Link>
                    ) : (
                      <div className="space-y-2">
                        {celebrationGapLocked ? (
                          <>
                            <ProgressBar
                              valuePct={
                                celebrationGapLocked.target > 0
                                  ? Math.round((celebrationGapLocked.progress / celebrationGapLocked.target) * 100)
                                  : 0
                              }
                            />
                            <div className="text-[11px] text-gray-500 dark:text-gray-400">
                              {celebrationGapLocked.progress}/{celebrationGapLocked.target} evening reviews
                            </div>
                          </>
                        ) : (
                          <div className="text-[11px] text-gray-500 dark:text-gray-400">
                            Mrs. Deer will mirror a lesson once you have a little more evening history.
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Recurring Question */}
                  <div className="pt-1 border-t border-gray-200/60 dark:border-gray-700/60">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-start gap-3">
                        <div className="text-2xl leading-none">💫</div>
                        <div className="min-w-0">
                          <div className="font-semibold text-sm text-gray-900 dark:text-white">Recurring Question</div>
                          <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                            {recurringQuestionUnlocked
                              ? 'Questions that echo in lessons & decision notes'
                              : `Unlocks after ${RECURRING_QUESTION_MIN_DAYS} days with entries`}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {recurringQuestionUnlocked ? 'Unlocked' : 'Locked'}
                      </div>
                    </div>
                    {recurringQuestionUnlocked ? (
                      <Link href="/founder-dna/patterns" className="block">
                        <Button variant="coral" size="sm" className="w-full">
                          Open Recurring Question →
                        </Button>
                      </Link>
                    ) : (
                      <div className="space-y-2">
                        {recurringQuestionLocked ? (
                          <>
                            <ProgressBar
                              valuePct={
                                recurringQuestionLocked.target > 0
                                  ? Math.round((recurringQuestionLocked.progress / recurringQuestionLocked.target) * 100)
                                  : 0
                              }
                            />
                            <div className="text-[11px] text-gray-500 dark:text-gray-400">
                              {recurringQuestionLocked.progress}/{recurringQuestionLocked.target} evening reviews
                            </div>
                          </>
                        ) : (
                          <div className="text-[11px] text-gray-500 dark:text-gray-400">
                            Keep writing evenings — Mrs. Deer listens for questions that come back again and again.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-white/60 dark:bg-gray-800/30 border border-gray-200/60 dark:border-gray-700/60">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Milestones</h3>
                {!milestones ? (
                  <div className="text-sm text-gray-600 dark:text-gray-300">No milestone data yet.</div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                    {milestoneCards.map((m) => (
                      <div key={m.label} className="rounded-lg bg-transparent p-2">
                        <div className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          {m.label}
                        </div>
                        <div className="text-base font-bold text-gray-900 dark:text-white mt-1">{m.value}</div>
                      </div>
                    ))}
                  </div>
                )}
                {nextMilestone ? (
                  <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">🎁 Next milestone</p>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-lg shrink-0" aria-hidden>
                          {nextMilestone.icon}
                        </span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {nextMilestone.name}
                        </span>
                      </div>
                      <span className="text-sm text-gray-600 dark:text-gray-300 shrink-0 tabular-nums">
                        {nextMilestone.current}/{nextMilestone.target}
                      </span>
                    </div>
                    {nextMilestone.badgeName ? (
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                        Unlocks badge: {nextMilestone.badgeName}
                      </p>
                    ) : null}
                    <Link
                      href="/founder-dna/journey"
                      className="text-xs text-[#ef725c] hover:underline mt-2 inline-block"
                    >
                      View all milestones →
                    </Link>
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <EnergyTrendsCelebration isOpen={showCelebration} onClose={() => setShowCelebration(false)} />
      <DecisionStyleCelebration isOpen={showDecisionStyleCelebration} onClose={() => setDecisionStyleCelebration(false)} />
      <FounderArchetypeCelebration
        isOpen={showFounderArchetypeCelebration}
        onClose={() => setFounderArchetypeCelebration(false)}
        primary={archetypePreview?.primary ?? null}
        isPreviewUnlock
      />

      <FeatureUnlockQueueModal
        open={whatsNewOpen}
        onClose={() => setWhatsNewOpen(false)}
        items={whatsNewItems}
        daysWithEntries={activityDays}
        markAsViewed={markAsViewed}
      />
      <BadgeUnlockFlow newlyUnlockedBadges={newlyUnlockedBadges} />
    </div>
  )
}

