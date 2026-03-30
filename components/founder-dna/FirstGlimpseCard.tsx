'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, Loader2, Lock } from 'lucide-react'
import { colors } from '@/lib/design-tokens'
import type { FirstGlimpseResponse } from '@/lib/types/founder-dna'
import { FounderDnaNextUpdateHint } from '@/components/founder-dna/FounderDnaNextUpdateHint'

type LockedBody = {
  error: string
  progress: { eveningsCompleted: number; target: number; remaining: number }
}

export function FirstGlimpseCard() {
  const [loading, setLoading] = useState(true)
  const [locked, setLocked] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<FirstGlimpseResponse | null>(null)
  const [progress, setProgress] = useState<LockedBody['progress'] | null>(null)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setLoading(true)
      setLocked(false)
      setError(null)
      setData(null)
      setProgress(null)
      try {
        const res = await fetch('/api/founder-dna/first-glimpse', { credentials: 'include' })
        if (res.status === 403) {
          const json = (await res.json()) as LockedBody
          if (!cancelled) {
            setLocked(true)
            setProgress(json.progress)
          }
          return
        }
        if (!res.ok) throw new Error('Failed to load')
        const json = (await res.json()) as FirstGlimpseResponse
        if (!cancelled) setData(json)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
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
    return (
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/30 p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
          <Lock className="w-4 h-4 text-[#ef725c]" />
          🔓 First Glimpse
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 leading-relaxed">
          Complete your first evening reflection to unlock. Mrs. Deer will mirror what you wrote, preview how tomorrow’s
          morning insight connects to tonight, and invite you back into the daily cycle.
        </p>
        {progress ? (
          <p className="mt-3 text-[11px] text-gray-500 dark:text-gray-400">
            {progress.eveningsCompleted}/{progress.target} evening{progress.target === 1 ? '' : 's'} ·{' '}
            {progress.remaining > 0 ? `${progress.remaining} more to unlock` : 'Almost there'}
          </p>
        ) : null}
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50/30 dark:bg-red-900/20 p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-red-800 dark:text-red-200">
          <AlertTriangle className="w-4 h-4" />
          Could not load First Glimpse
        </div>
        <p className="text-sm text-red-700/90 dark:text-red-100 mt-2">{error}</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/30 p-4 text-sm text-gray-600 dark:text-gray-300">
        No data yet.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-amber-200/80 dark:border-amber-900/40 bg-gradient-to-br from-amber-50/90 to-orange-50/50 dark:from-amber-950/25 dark:to-orange-950/20 p-5 shadow-sm">
        <p className="text-sm text-gray-800 dark:text-gray-100 leading-relaxed whitespace-pre-line">{data.insight}</p>
      </div>

      <p className="text-[11px] text-gray-500 dark:text-gray-400">
        Shaped from your first evening (and the earliest morning you logged) · {data.eveningsSampled} evening
        {data.eveningsSampled === 1 ? '' : 's'} so far.
      </p>

      <FounderDnaNextUpdateHint cadenceLabel="Tuesday" nextUpdate={data.nextUpdate ?? null} />

      <p className="text-[11px] text-gray-500 dark:text-gray-400">
        After the first message, this refreshes on Tuesdays in your timezone — a fresh angle on your rhythm.
      </p>

      <Link href="/dashboard" className="text-sm inline-block" style={{ color: colors.navy.DEFAULT }}>
        ← Back to dashboard
      </Link>
    </div>
  )
}
