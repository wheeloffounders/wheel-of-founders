'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react'
import { LockedFeature } from '@/components/LockedFeature'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { colors } from '@/lib/design-tokens'
import { ArchetypeBreakdown } from '@/components/founder-dna/ArchetypeBreakdown'
import { Progress } from '@/components/ui/progress'
import type {
  ArchetypeApiFullResponse,
  ArchetypeApiPreviewResponse,
  ArchetypeEvolutionHistoryEntry,
} from '@/lib/types/founder-dna'
import { ArchetypeEvolutionModal } from '@/components/founder-dna/ArchetypeEvolutionModal'
import { ARCHETYPE_SNAPSHOT_REFRESH_DAYS } from '@/lib/founder-dna/archetype-snapshot'
import { ARCHETYPE_FULL_MIN_DAYS, ARCHETYPE_PREVIEW_MIN_DAYS } from '@/lib/founder-dna/archetype-timing'
import { getArchetypeEvolutionPreview } from '@/lib/founder-dna/archetype-evolution-copy'

type ArchetypePayload = ArchetypeApiPreviewResponse | ArchetypeApiFullResponse

type LockedResponse = {
  error: string
  progress: {
    daysActive: number
    targetDays: number
    daysRemaining: number
  }
}

function formatArchetypeDate(iso: string | null | undefined): string | null {
  if (!iso) return null
  try {
    const d = parseISO(iso)
    if (Number.isNaN(d.getTime())) return null
    return format(d, 'MMMM d, yyyy')
  } catch {
    return null
  }
}

export function FounderArchetypeCard() {
  const [loading, setLoading] = useState(true)
  const [locked, setLocked] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<ArchetypePayload | null>(null)
  const [progress, setProgress] = useState<LockedResponse['progress'] | null>(null)
  const [showBreakdown, setShowBreakdown] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [evolutionAckPrompt, setEvolutionAckPrompt] = useState<ArchetypeEvolutionHistoryEntry | null>(null)

  useEffect(() => {
    if (!data || data.status !== 'full') return
    const fullPayload = data as ArchetypeApiFullResponse
    const hist = fullPayload.evolutionHistory
    if (!hist?.length) return
    const latest = hist[0]
    try {
      const ack = localStorage.getItem('wof-archetype-evolution-ack-at')
      if (ack && new Date(latest.at).getTime() <= new Date(ack).getTime()) return
    } catch {
      /* ignore */
    }
    setEvolutionAckPrompt(latest)
  }, [data])

  const planKeyToLabel = (key: string | null | undefined): string | null => {
    switch (key) {
      case 'my_zone':
        return 'Milestone'
      case 'systemize':
        return 'Systemize'
      case 'delegate_founder':
        return 'Delegate'
      case 'eliminate_founder':
        return 'Eliminate'
      case 'quick_win_founder':
        return 'Quick Win'
      default:
        return null
    }
  }

  useEffect(() => {
    let cancelled = false
    const ac = new AbortController()

    const run = async () => {
      setLoading(true)
      setLocked(false)
      setError(null)
      setProgress(null)
      try {
        const res = await fetch('/api/founder-dna/archetype', {
          credentials: 'include',
          signal: ac.signal,
        })
        if (res.status === 403) {
          setLocked(true)
          const json = (await res.json()) as LockedResponse
          if (!cancelled) setProgress(json.progress)
          return
        }
        if (!res.ok) throw new Error('Failed to load founder archetype')
        const json = (await res.json()) as ArchetypePayload
        if (json.status !== 'preview' && json.status !== 'full') {
          throw new Error('Unexpected archetype response')
        }
        if (!cancelled) setData(json)
      } catch (err) {
        if (cancelled || (err instanceof Error && err.name === 'AbortError')) return
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    run()
    return () => {
      cancelled = true
      ac.abort()
    }
  }, [])

  const handleManualRefresh = async () => {
    setRefreshing(true)
    try {
      const res = await fetch('/api/founder-dna/archetype/refresh', {
        method: 'POST',
        credentials: 'include',
      })
      const json = (await res.json().catch(() => ({}))) as ArchetypePayload & { error?: string }
      if (!res.ok) {
        throw new Error((json as { error?: string }).error || 'Failed to refresh')
      }
      if (json.status !== 'full') {
        throw new Error('Unexpected response')
      }
      setData(json)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('toast', { detail: { message: 'Archetype updated with your latest data.', type: 'success' } })
        )
      }
    } catch (err) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('toast', {
            detail: {
              message: err instanceof Error ? err.message : 'Could not refresh archetype.',
              type: 'error',
            },
          })
        )
      }
    } finally {
      setRefreshing(false)
    }
  }

  const handleEvolutionDismiss = () => {
    if (evolutionAckPrompt) {
      try {
        localStorage.setItem('wof-archetype-evolution-ack-at', evolutionAckPrompt.at)
      } catch {
        /* ignore */
      }
    }
    setEvolutionAckPrompt(null)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('archetype-updated'))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-[#ef725c]" />
      </div>
    )
  }

  if (locked) {
    const current = progress?.daysActive ?? 0
    const required = progress?.targetDays ?? ARCHETYPE_PREVIEW_MIN_DAYS
    return (
      <LockedFeature type="archetype" progress={{ current, required }} />
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50/30 dark:bg-red-900/20 p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-red-800 dark:text-red-200">
          <AlertTriangle className="w-4 h-4" />
          Could not load your archetype
        </div>
        <div className="text-sm text-red-700/90 dark:text-red-100 mt-2">{error}</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/30 p-4">
        <div className="text-sm font-medium text-gray-900 dark:text-white">No archetype data</div>
      </div>
    )
  }

  if (data.status === 'preview') {
    const { distribution, message, daysUntilFull, topSignals, unlockChecklist } = data
    const visibleDistribution = (distribution ?? []).filter((item) => item.percentage > 0).slice(0, 3)
    const blurredPlaceholders = (distribution ?? [])
      .filter((item) => item.percentage > 0)
      .slice(3, 8)
      .map((item) => item.icon)
    const fallbackEmojis = ['🧭', '🌿', '⚡', '🔮', '🛠️']
    return (
      <>
        <div className="rounded-xl border border-dashed border-amber-200/90 dark:border-amber-800/50 bg-gradient-to-b from-amber-50/40 to-white/60 dark:from-amber-950/20 dark:to-gray-800/30 p-4 w-full max-w-3xl">
          <div className="flex items-center justify-between gap-2 mb-3">
            <Badge variant="neutral" className="bg-amber-100 dark:bg-amber-900/50 text-amber-950 dark:text-amber-100 border-amber-200 dark:border-amber-800">
              Preview
            </Badge>
            <span className="text-[11px] text-gray-500 dark:text-gray-400">Emerging pattern</span>
          </div>
          <div className="mb-3">
            <div className="font-semibold text-sm text-gray-900 dark:text-white">What we see so far</div>
            <div className="text-xs text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">
              Mrs. Deer reads your reflections below; the full profile unlocks after {ARCHETYPE_FULL_MIN_DAYS} days.
            </div>
          </div>
          <div className="space-y-2">
            {visibleDistribution.map((item) => (
              <div
                key={item.name}
                className="flex items-center justify-between rounded-lg border border-amber-200/70 dark:border-amber-800/40 bg-white/50 dark:bg-gray-900/20 px-3 py-2"
              >
                <div className="text-sm text-gray-900 dark:text-gray-100">
                  <span className="mr-2">{item.icon}</span>
                  {item.label}
                </div>
                <div className="text-sm font-medium text-amber-900 dark:text-amber-200">{item.percentage}%</div>
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed mt-4 mb-2">{message}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {daysUntilFull === 0
              ? `You’ve reached ${ARCHETYPE_FULL_MIN_DAYS} days — refresh if your full profile hasn’t appeared yet.`
              : `At ${ARCHETYPE_FULL_MIN_DAYS} days, you'll see your full archetype profile. ${daysUntilFull} more day${daysUntilFull === 1 ? '' : 's'} to go.`}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/dashboard" className="text-sm" style={{ color: colors.navy.DEFAULT }}>
              Back to dashboard
            </Link>
          </div>
        </div>

        <ArchetypeBreakdown
          mode="preview"
          breakdown={{
            signals: Array.isArray(topSignals) ? topSignals : [],
            totalConfidence: visibleDistribution[0]?.percentage ?? 0,
            explanation:
              'These are the strongest signals in your data so far. Keep logging mornings and evenings — the full breakdown unlocks after 30 days.',
          }}
          primaryArchetype={{
            label: visibleDistribution[0]?.label ?? 'Emerging',
            icon: visibleDistribution[0]?.icon ?? '🔮',
          }}
        />

        <div className="rounded-xl border border-dashed border-[#152b50]/20 dark:border-sky-900/40 bg-white/50 dark:bg-gray-900/25 p-4 w-full max-w-3xl mt-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#152b50] dark:text-sky-200 mb-2">
            Path to evolution
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
            Your full Founder Archetype profile—including trait breakdown and evolution cues—unlocks after{' '}
            {ARCHETYPE_FULL_MIN_DAYS} days of signal. You’re on the path; a few more consistent mornings and evenings
            sharpen the read.
          </p>
          <ul className="mt-3 space-y-1.5 text-sm text-gray-600 dark:text-gray-300">
            <li>
              <span className="font-medium text-gray-900 dark:text-white">Days until full unlock:</span>{' '}
              {unlockChecklist?.unlock
                ? unlockChecklist.unlock.daysRemaining
                : daysUntilFull}
            </li>
            {unlockChecklist?.decisionsSignal && unlockChecklist.decisionsSignal.total > 0 ? (
              <li>
                <span className="font-medium text-gray-900 dark:text-white">Decisions in your signal:</span>{' '}
                {unlockChecklist.decisionsSignal.total} logged ({unlockChecklist.decisionsSignal.strategic} strategic,{' '}
                {unlockChecklist.decisionsSignal.tactical} tactical)
                {unlockChecklist.decisionsSignal.ready ? ' · threshold met' : ''}
              </li>
            ) : null}
            {unlockChecklist?.taskPlansSignal && unlockChecklist.taskPlansSignal.totalCompletedTasks > 0 ? (
              <li>
                <span className="font-medium text-gray-900 dark:text-white">Action plans completed:</span>{' '}
                {unlockChecklist.taskPlansSignal.totalCompletedTasks}
                {unlockChecklist.taskPlansSignal.topPlan
                  ? ` · often “${unlockChecklist.taskPlansSignal.topPlan}”`
                  : ''}
              </li>
            ) : null}
          </ul>
          {(blurredPlaceholders.length > 0 ? blurredPlaceholders : fallbackEmojis).length > 0 ? (
            <div
              className="mt-4 flex flex-wrap gap-3 justify-center sm:justify-start rounded-lg border border-gray-200/60 dark:border-gray-700/60 bg-gray-50/80 dark:bg-gray-900/40 px-3 py-2"
              aria-hidden
            >
              {(blurredPlaceholders.length > 0 ? blurredPlaceholders : fallbackEmojis).map((icon, i) => (
                <span
                  key={`${icon}-${i}`}
                  className="text-2xl leading-none opacity-50 blur-[3px] select-none pointer-events-none"
                >
                  {icon}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </>
    )
  }

  const full = data as ArchetypeApiFullResponse
  const { primary, secondary, traits, breakdown: breakdownRaw, personalityProfile: pp } = full
  const personalityProfile = {
    tagline: pp?.tagline ?? '',
    title: pp?.title ?? '',
    description: pp?.description ?? '',
    recentExampleBox: {
      date: pp?.recentExampleBox?.date ?? '—',
      headline: pp?.recentExampleBox?.headline ?? 'Example',
      example: pp?.recentExampleBox?.example ?? '',
      interpretation:
        pp?.recentExampleBox?.interpretation ??
        'Your pattern is emerging—keep reflecting for richer examples.',
    },
    keyCharacteristics: Array.isArray(pp?.keyCharacteristics) ? pp.keyCharacteristics : [],
    strengths: Array.isArray(pp?.strengths) ? pp.strengths : [],
    growthEdges: Array.isArray(pp?.growthEdges) ? pp.growthEdges : [],
    relationshipsAndWork: pp?.relationshipsAndWork ?? '',
    cognitivePattern: {
      dominant: pp?.cognitivePattern?.dominant ?? '',
      auxiliary: pp?.cognitivePattern?.auxiliary ?? '',
      underdeveloped: pp?.cognitivePattern?.underdeveloped ?? '',
      stressResponse: pp?.cognitivePattern?.stressResponse ?? '',
    },
  }
  const breakdown = {
    signals: Array.isArray(breakdownRaw?.signals) ? breakdownRaw.signals : [],
    totalConfidence: breakdownRaw?.totalConfidence ?? primary.confidence,
    explanation: breakdownRaw?.explanation ?? '',
  }
  const stillForming = primary.confidence < 80
  const evolutionPreview = getArchetypeEvolutionPreview(primary.name, traits.strategic)

  const howCalculatedBlock = (
    <div className="mt-4 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
      <div className="font-medium text-gray-900 dark:text-white mb-2">How it was calculated</div>
      <div>
        Mrs. Deer looks at your decision mix (strategic vs tactical), your morning action plans, and keyword signals from
        your evening wins/lessons to estimate your archetype.
      </div>
      <div className="mt-2">
        Your full profile is recomputed automatically every {ARCHETYPE_SNAPSHOT_REFRESH_DAYS} days (and whenever you use
        Refresh) so your identity read stays stable between updates.
      </div>
    </div>
  )

  const updatedLabel = formatArchetypeDate(full.archetypeUpdatedAt)
  const nextLabel = formatArchetypeDate(full.nextArchetypeUpdateAt)

  return (
    <>
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/30 p-4 w-full max-w-3xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between mb-2">
          <div className="min-w-0 w-full flex-1">
            <div className="flex flex-col sm:flex-row sm:items-start gap-3">
              <div className="text-3xl leading-none shrink-0">{primary.icon}</div>
              <div className="min-w-0 w-full">
                <div className="font-semibold text-base sm:text-lg text-gray-900 dark:text-white break-words max-w-full">
                  {primary.label}
                </div>
                <div className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 mt-1 break-words max-w-full">
                  {personalityProfile.tagline}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300 mt-2 leading-relaxed break-words">
                  {personalityProfile.description}
                </div>
              </div>
            </div>
            {stillForming ? (
              <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">Still forming... your next reflections will sharpen the signal.</div>
            ) : (
              <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                Your pattern is emerging clearly.
              </div>
            )}
          </div>

          {secondary ? (
            <div className="shrink-0 text-left lg:text-right w-full sm:w-auto">
              <div className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400">Also strong</div>
              <div className="inline-flex items-center gap-2 mt-1 px-3 py-2 rounded-lg border border-gray-200/70 dark:border-gray-700/70 bg-white/40 dark:bg-gray-800/40 max-w-full">
                <span className="text-lg shrink-0">{secondary.icon}</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white break-words text-left">
                  {secondary.label}
                </span>
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border border-gray-200/80 dark:border-gray-700/80 bg-gray-50/50 dark:bg-gray-900/20 px-3 py-2.5">
          <div className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed min-w-0">
            {updatedLabel ? (
              <>
                <span className="text-gray-900 dark:text-gray-200 font-medium">Updated:</span> {updatedLabel}
                {nextLabel ? (
                  <>
                    {' '}
                    · <span className="text-gray-900 dark:text-gray-200 font-medium">Next auto-update:</span> {nextLabel}
                  </>
                ) : null}
              </>
            ) : nextLabel ? (
              <>
                <span className="text-gray-900 dark:text-gray-200 font-medium">Next auto-update:</span> {nextLabel}
              </>
            ) : (
              <span>Full profile refreshes every {ARCHETYPE_SNAPSHOT_REFRESH_DAYS} days. Use Refresh to update sooner.</span>
            )}
            {typeof full.fromCache === 'boolean' ? (
              <span className="block mt-1 text-[11px] text-gray-500 dark:text-gray-500">
                {full.fromCache
                  ? 'Showing your saved profile between automatic refreshes.'
                  : 'Just recomputed from your latest data.'}
              </span>
            ) : null}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 rounded-lg"
            disabled={refreshing}
            onClick={() => void handleManualRefresh()}
          >
            {refreshing ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
            ) : (
              <>
                <RefreshCw className="w-3.5 h-3.5 mr-1.5 inline" aria-hidden />
                Refresh now
              </>
            )}
          </Button>
        </div>

        {(full.evolutionHistory?.length ?? 0) > 0 ? (
          <div className="mt-4 rounded-lg border border-amber-200/60 dark:border-amber-900/45 bg-gradient-to-br from-amber-50/50 to-white/60 dark:from-amber-950/25 dark:to-gray-900/30 p-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200 mb-2">
              Evolution lineage
            </div>
            <ul className="space-y-1.5 text-sm text-gray-800 dark:text-gray-100">
              {(full.evolutionHistory ?? []).map((e) => (
                <li key={`${e.at}-${e.fromPrimary}-${e.toPrimary}`} className="flex flex-wrap items-baseline gap-x-1.5">
                  <span className="font-medium capitalize">{e.fromPrimary}</span>
                  <span className="text-gray-500 dark:text-gray-400 text-xs">({e.periodLabel})</span>
                  <span className="text-amber-700 dark:text-amber-300" aria-hidden>
                    →
                  </span>
                  <span className="font-medium capitalize">{e.toPrimary}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white/40 dark:bg-gray-800/40 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
            <span>📅</span>
            <span>From your history</span>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {personalityProfile.recentExampleBox?.date ?? '—'}
          </div>
          <div className="text-sm text-gray-700 dark:text-gray-200 mt-2">
            <span className="font-medium">{personalityProfile.recentExampleBox?.headline ?? 'Example'}:</span>{' '}
            {personalityProfile.recentExampleBox?.example ?? ''}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-300 mt-2 leading-relaxed">
            {personalityProfile.recentExampleBox?.interpretation ?? 'Your pattern is emerging—keep reflecting for richer examples.'}
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">Strategic leaning</div>
            <Progress value={traits.strategic} max={100} className="h-1.5" />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">Tactical leaning</div>
            <Progress value={traits.tactical} max={100} className="h-1.5" />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">Visionary signal</div>
            <Progress value={traits.visionary} max={100} className="h-1.5" />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">Builder signal</div>
            <Progress value={traits.builder} max={100} className="h-1.5" />
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-dashed border-[#ef725c]/45 bg-gradient-to-br from-[#152b50]/10 to-[#ef725c]/10 dark:from-[#152b50]/25 dark:to-[#ef725c]/15 p-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#152b50] dark:text-sky-200 mb-3">
            Path to evolution
          </div>
          <div className="flex items-start gap-4">
            <div className="relative h-14 w-14 shrink-0">
              <div
                className="absolute inset-0 flex items-center justify-center rounded-2xl bg-gray-300/60 dark:bg-gray-600 text-3xl blur-sm opacity-70"
                aria-hidden
              >
                {evolutionPreview.nextIcon}
              </div>
              <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-[#ef725c]/50 bg-white/90 dark:bg-gray-800/90 text-2xl shadow-sm">
                {evolutionPreview.nextIcon}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs text-gray-500 dark:text-gray-400">Next level in your DNA read</div>
              <div className="text-sm font-semibold text-gray-900 dark:text-white">{evolutionPreview.nextLabel}</div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 leading-relaxed">{evolutionPreview.statsHint}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-6">
            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-white mb-2">Key characteristics</div>
              <div className="space-y-2 text-sm text-gray-700 dark:text-gray-200">
                {personalityProfile.keyCharacteristics.map((c, i) => (
                  <div key={`${i}-${c}`} className="flex gap-2">
                    <span className="mt-0.5">•</span>
                    <span className="leading-relaxed">{c}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-white mb-2">Your strengths</div>
              <div className="space-y-2 text-sm text-gray-700 dark:text-gray-200">
                {personalityProfile.strengths.map((c, i) => (
                  <div key={`${i}-${c}`} className="flex gap-2">
                    <span className="mt-0.5">✅</span>
                    <span className="leading-relaxed">{c}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-white mb-2">Your growth edges</div>
              <div className="space-y-2 text-sm text-gray-700 dark:text-gray-200">
                {personalityProfile.growthEdges.map((c, i) => (
                  <div key={`${i}-${c}`} className="flex gap-2">
                    <span className="mt-0.5">⚠️</span>
                    <span className="leading-relaxed">{c}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-white mb-2">In relationships and work</div>
              <div className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
                {personalityProfile.relationshipsAndWork}
              </div>
            </div>

            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-white mb-2">Your cognitive pattern</div>
              <div className="space-y-2 text-sm text-gray-700 dark:text-gray-200">
                <div className="flex gap-2">
                  <span className="mt-0.5">Dominant:</span>
                  <span className="leading-relaxed">{personalityProfile.cognitivePattern.dominant}</span>
                </div>
                <div className="flex gap-2">
                  <span className="mt-0.5">Auxiliary:</span>
                  <span className="leading-relaxed">{personalityProfile.cognitivePattern.auxiliary}</span>
                </div>
                <div className="flex gap-2">
                  <span className="mt-0.5">Underdeveloped:</span>
                  <span className="leading-relaxed">{personalityProfile.cognitivePattern.underdeveloped}</span>
                </div>
                <div className="flex gap-2">
                  <span className="mt-0.5">Stress response:</span>
                  <span className="leading-relaxed">{personalityProfile.cognitivePattern.stressResponse}</span>
                </div>
              </div>
            </div>
          </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowBreakdown((v) => !v)}
            className="rounded-lg"
          >
            {showBreakdown ? 'Hide how it was calculated' : 'How it was calculated'}
          </Button>
          <Link href="/dashboard" className="text-sm" style={{ color: colors.navy.DEFAULT }}>
            Back to dashboard
          </Link>
        </div>
        {showBreakdown ? howCalculatedBlock : null}
      </div>

      <ArchetypeBreakdown
        mode="full"
        breakdown={breakdown}
        primaryArchetype={{
          label: primary.label,
          icon: primary.icon,
        }}
      />

      {evolutionAckPrompt ? (
        <ArchetypeEvolutionModal
          isOpen
          onClose={handleEvolutionDismiss}
          onContinue={handleEvolutionDismiss}
          entry={evolutionAckPrompt}
        />
      ) : null}
    </>
  )
}

