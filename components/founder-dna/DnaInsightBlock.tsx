'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  deriveInsightRecommendation,
  deriveInsightVerdict,
  type InsightPresentationKind,
} from '@/lib/founder-dna/insight-card-presentation'
import { getInsightArchetypeVoiceCached } from '@/lib/founder-dna/insight-archetype-fetch'
import { toInsightArchetypeVoice, type InsightArchetypeVoice } from '@/lib/founder-dna/insight-archetype-voice'
import { colors } from '@/lib/design-tokens'

export type DnaInsightBlockProps = {
  description: string
  kind?: InsightPresentationKind
  /** Deep-link to morning plan (e.g. focus / postponement) */
  morningIntent?: 'focus' | 'postponement' | 'energy'
  showChallengeCta?: boolean
  /**
   * Explicit coaching voice (overrides `currentArchetype`).
   * If omitted, derive from `currentArchetype` or a one-time cached archetype fetch.
   */
  archetypeVoice?: InsightArchetypeVoice | null
  /**
   * Primary archetype API `name` (e.g. builder, visionary, strategist).
   * Prefer passing from `usePrimaryArchetypeName()` in the parent to avoid duplicate fetches.
   */
  currentArchetype?: string | null
}

export function DnaInsightBlock({
  description,
  kind = 'default',
  morningIntent,
  showChallengeCta = true,
  archetypeVoice: archetypeVoiceProp,
  currentArchetype,
}: DnaInsightBlockProps) {
  const [voice, setVoice] = useState<InsightArchetypeVoice | null>(null)

  useEffect(() => {
    if (archetypeVoiceProp !== undefined) {
      setVoice(archetypeVoiceProp)
      return
    }
    if (currentArchetype !== undefined) {
      setVoice(toInsightArchetypeVoice(currentArchetype))
      return
    }
    let cancelled = false
    void getInsightArchetypeVoiceCached().then((v) => {
      if (!cancelled) setVoice(v)
    })
    return () => {
      cancelled = true
    }
  }, [archetypeVoiceProp, currentArchetype])

  const verdict = deriveInsightVerdict(description, kind, voice)
  const recommendation = deriveInsightRecommendation(description, kind, voice)
  const href =
    morningIntent === 'postponement'
      ? '/morning?dna=postponement'
      : morningIntent === 'energy'
        ? '/morning?dna=energy'
        : morningIntent === 'focus'
          ? '/morning?dna=focus'
          : '/morning'

  const showCta =
    showChallengeCta &&
    (kind === 'postponement' ||
      kind === 'energy' ||
      /postpon|energy|focus|gap/i.test(description))

  const ctaLabel =
    kind === 'postponement'
      ? 'Accept challenge: Lock 1 focus block tomorrow →'
      : "Set a goal on tomorrow's plan →"

  return (
    <div className="rounded-lg border border-[#152b50]/15 bg-white/90 dark:bg-gray-900/30 p-3 shadow-sm dark:border-gray-600/40">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#152b50] dark:text-sky-200 mb-2">
        {verdict}
      </p>
      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{description}</p>
      <div className="mt-3 pt-3 border-t border-gray-200/90 dark:border-gray-600/50">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
          Mrs. Deer&apos;s recommendation
        </p>
        <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">{recommendation}</p>
      </div>
      {showCta ? (
        <div className="mt-3">
          <Link
            href={href}
            className="inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium text-white transition hover:opacity-90"
            style={{ backgroundColor: colors.coral.DEFAULT }}
          >
            {ctaLabel}
          </Link>
        </div>
      ) : null}
    </div>
  )
}
