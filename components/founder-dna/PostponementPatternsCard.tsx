'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2, AlertTriangle, Lock } from 'lucide-react'
import { DnaInsightBlock } from '@/components/founder-dna/DnaInsightBlock'
import { usePrimaryArchetypeName } from '@/lib/hooks/usePrimaryArchetypeName'

type PostponementPattern = {
  actionPlan: string
  count: number
  percentage: number
  tip: string
}

type PostponementResponse = {
  patterns: PostponementPattern[]
  totalPostponements: number
  mostPostponed: string
  insight: string
  nextUpdate?: string
}

type LockedResponse = {
  error: string
  progress: {
    daysActive: number
    target: number
    remaining: number
  }
}

export function PostponementPatternsCard() {
  const currentArchetype = usePrimaryArchetypeName()
  const [loading, setLoading] = useState(true)
  const [locked, setLocked] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<PostponementResponse | null>(null)
  const [progress, setProgress] = useState<LockedResponse['progress'] | null>(null)

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      setLoading(true)
      setLocked(false)
      setError(null)
      setData(null)
      setProgress(null)

      try {
        const res = await fetch('/api/founder-dna/postponements', { credentials: 'include' })
        if (res.status === 403) {
          const json = (await res.json()) as LockedResponse
          if (!cancelled) {
            setLocked(true)
            setProgress(json.progress)
          }
          return
        }
        if (!res.ok) throw new Error('Failed to load postponement patterns')
        const json = (await res.json()) as PostponementResponse
        if (!cancelled) setData(json)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [])

  const topPatterns = useMemo(() => data?.patterns?.slice(0, 3) ?? [], [data])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-[#ef725c]" />
      </div>
    )
  }

  if (locked) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/30 p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
          <Lock className="w-4 h-4 text-[#ef725c]" />
          ⏳ Postponement Patterns
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-300 mt-2">
          Available after {progress?.target ?? 15} days with entries
        </div>
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          After {progress?.target ?? 15} days with entries, Mrs. Deer will share gentle observations about which tasks you tend to delay
          — no judgment, just awareness.
        </div>
        {progress ? (
          <div className="mt-3 text-[11px] text-gray-500 dark:text-gray-400">
            You are {progress.daysActive}/{progress.target} days with entries. {progress.remaining} more day(s) to go.
          </div>
        ) : null}
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50/30 dark:bg-red-900/20 p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-red-800 dark:text-red-200">
          <AlertTriangle className="w-4 h-4" />
          Could not load your patterns
        </div>
        <div className="text-sm text-red-700/90 dark:text-red-100 mt-2">{error}</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/30 p-4">
        <div className="text-sm font-medium text-gray-900 dark:text-white">No data found</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/30 p-4">
        <div className="text-sm font-semibold text-gray-900 dark:text-white mb-3">⏳ Postponement Patterns</div>
        <DnaInsightBlock
          description={data.insight}
          kind="postponement"
          morningIntent="postponement"
          currentArchetype={currentArchetype}
        />
      </div>

      <div className="space-y-2">
        <div className="text-sm font-medium text-gray-900 dark:text-white">Your patterns</div>
        <ul className="list-disc ml-5 space-y-1">
          {topPatterns.map((p) => (
            <li key={`${p.actionPlan}-${p.count}`} className="text-sm text-gray-600 dark:text-gray-300">
              <span className="font-medium text-gray-900 dark:text-white">{p.actionPlan}</span> · {p.count} times
            </li>
          ))}
        </ul>
      </div>

      {/* Educational note */}
      <div className="rounded-xl border border-gray-200/70 dark:border-gray-700/70 bg-white/60 dark:bg-gray-800/30 p-4 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
        <div className="font-medium text-gray-900 dark:text-white mb-2">Why this matters</div>
        These aren&apos;t failures - they&apos;re signals. Each postponement is telling you something about what needs to change.
        The task itself isn&apos;t the problem; the conditions around it are.
      </div>
    </div>
  )
}

