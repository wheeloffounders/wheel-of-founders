'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useFounderJourney } from '@/lib/hooks/useFounderJourney'

type ArchetypeApiShape = {
  status?: 'preview' | 'full'
  primary?: { icon?: string; label?: string; description?: string }
  personalityProfile?: { growthEdges?: string[] }
}

export function ArchetypeTeaser() {
  const { data, loading, error } = useFounderJourney()
  const archetype = data?.archetype
  const status = archetype?.status ?? 'locked'
  const [details, setDetails] = useState<ArchetypeApiShape | null>(null)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const res = await fetch('/api/founder-dna/archetype', { credentials: 'include' })
        if (!res.ok) return
        const json = (await res.json()) as ArchetypeApiShape
        if (!cancelled) setDetails(json)
      } catch {
        // non-critical
      }
    }
    if (status !== 'locked') void run()
    return () => {
      cancelled = true
    }
  }, [status])

  const icon = details?.primary?.icon ?? '🏷️'
  const label = details?.primary?.label ?? 'Founder Archetype'
  const trait = details?.primary?.description ?? 'You are building a recognizable founder pattern over time.'
  const growthEdge = useMemo(
    () => details?.personalityProfile?.growthEdges?.[0] ?? 'pruning friction before it compounds',
    [details]
  )

  return (
    <div className="border border-gray-200 dark:border-gray-700 border-l-4 border-l-[#ef725c] bg-white/60 dark:bg-gray-800/40 px-4 pb-4 pt-4">
      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
        🏷️ Archetype Teaser
      </h3>
      {loading ? <p className="text-sm text-gray-500 mt-2">Loading...</p> : null}
      {error ? <p className="text-sm text-red-500 mt-2">{error}</p> : null}
      {!loading && !error ? (
        <div className="mt-3">
          {status === 'full' ? (
            <>
              <p className="text-base text-gray-900 dark:text-gray-100">
                {icon} <span className="font-semibold">{label}</span>. {trait}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                Your growth edge: {growthEdge}. Review your full profile for strategy-level next steps.
              </p>
              <Link href="/founder-dna/archetype" className="text-sm text-[#ef725c] hover:underline inline-block mt-2">
                Open full profile now →
              </Link>
            </>
          ) : status === 'preview' ? (
            <>
              <p className="text-base text-gray-900 dark:text-gray-100">
                {icon} Emerging <span className="font-semibold">{label}</span>. {trait}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                About {archetype?.daysUntilFull ?? 0} day(s) until full profile. Growth edge teaser: {growthEdge}.
              </p>
              <Link href="/founder-dna/archetype" className="text-sm text-[#ef725c] hover:underline inline-block mt-2">
                See your emerging profile →
              </Link>
            </>
          ) : (
            <>
              <p className="text-base text-gray-900 dark:text-gray-100">
                Your archetype unlocks as your journey data grows.
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Unlocks in ~{archetype?.daysUntilPreview ?? 0} day(s)
              </p>
              <Link href="/founder-dna/journey" className="text-sm text-[#ef725c] hover:underline inline-block mt-2">
                View unlock path →
              </Link>
            </>
          )}
        </div>
      ) : null}
    </div>
  )
}

