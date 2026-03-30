'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { LockedFeature } from '@/components/LockedFeature'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { colors } from '@/lib/design-tokens'
import { ArchetypeBreakdown } from '@/components/founder-dna/ArchetypeBreakdown'
import { Progress } from '@/components/ui/progress'
import type { ArchetypeApiFullResponse, ArchetypeApiPreviewResponse } from '@/lib/types/founder-dna'
import { ARCHETYPE_FULL_MIN_DAYS, ARCHETYPE_PREVIEW_MIN_DAYS } from '@/lib/founder-dna/archetype-timing'

type ArchetypePayload = ArchetypeApiPreviewResponse | ArchetypeApiFullResponse

type LockedResponse = {
  error: string
  progress: {
    daysActive: number
    targetDays: number
    daysRemaining: number
  }
}

export function FounderArchetypeCard() {
  const [loading, setLoading] = useState(true)
  const [locked, setLocked] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<ArchetypePayload | null>(null)
  const [progress, setProgress] = useState<LockedResponse['progress'] | null>(null)
  const [showBreakdown, setShowBreakdown] = useState(false)

  const planKeyToLabel = (key: string | null | undefined): string | null => {
    switch (key) {
      case 'my_zone':
        return 'Focus Time'
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
    const { primary, message, daysUntilFull, topSignals } = data
    return (
      <>
        <div className="rounded-xl border border-dashed border-amber-200/90 dark:border-amber-800/50 bg-gradient-to-b from-amber-50/40 to-white/60 dark:from-amber-950/20 dark:to-gray-800/30 p-4 w-full max-w-3xl">
          <div className="flex items-center justify-between gap-2 mb-3">
            <Badge variant="neutral" className="bg-amber-100 dark:bg-amber-900/50 text-amber-950 dark:text-amber-100 border-amber-200 dark:border-amber-800">
              Preview
            </Badge>
            <span className="text-[11px] text-gray-500 dark:text-gray-400">Emerging pattern</span>
          </div>
          <div className="flex items-start gap-3 mb-3">
            <div className="text-3xl leading-none">{primary.icon}</div>
            <div className="min-w-0 max-w-full">
              <div className="font-semibold text-sm text-gray-900 dark:text-white break-words">{primary.label}</div>
              <div className="text-xs text-gray-600 dark:text-gray-300 mt-1 leading-relaxed break-words">
                {primary.description}
              </div>
              <div className="text-[11px] text-amber-800/90 dark:text-amber-200/90 mt-2">
                ~{primary.confidence}% confidence (preview range)
              </div>
            </div>
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed mb-2">{message}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {daysUntilFull === 0
              ? `You’ve reached ${ARCHETYPE_FULL_MIN_DAYS} days — refresh if your full profile hasn’t appeared yet.`
              : `${daysUntilFull} more day${daysUntilFull === 1 ? '' : 's'} until your full archetype profile unlocks.`}
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
            totalConfidence: primary.confidence,
            explanation:
              'These are the strongest signals in your data so far. Keep logging mornings and evenings — the full breakdown unlocks after 30 days.',
          }}
          primaryArchetype={{ label: primary.label, icon: primary.icon }}
        />
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

  const howCalculatedBlock = (
    <div className="mt-4 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
      <div className="font-medium text-gray-900 dark:text-white mb-2">How it was calculated</div>
      <div>
        Mrs. Deer looks at your decision mix (strategic vs tactical), your morning action plans, and keyword signals from
        your evening wins/lessons to estimate your archetype.
      </div>
      <div className="mt-2">Confidence increases as you log more entries over time.</div>
    </div>
  )

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

        <div className="mt-4 space-y-3">
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
    </>
  )
}

