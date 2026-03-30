'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, Loader2, Lock } from 'lucide-react'
import { colors } from '@/lib/design-tokens'
import type { CelebrationGapResponse } from '@/lib/types/founder-dna'
import { CELEBRATION_GAP_MIN_DAYS } from '@/lib/founder-dna/unlock-schedule-config'

type LockedBody = {
  error: string
  progress: { daysActive: number; target: number; remaining: number }
}

function formatLessonDate(iso: string): string {
  if (!iso || iso.length < 10) return ''
  const d = new Date(`${iso.slice(0, 10)}T12:00:00Z`)
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10)
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function CelebrationGapCard() {
  const [loading, setLoading] = useState(true)
  const [locked, setLocked] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<CelebrationGapResponse | null>(null)
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
        const res = await fetch('/api/founder-dna/celebration-gap', { credentials: 'include' })
        if (res.status === 403) {
          const json = (await res.json()) as LockedBody
          if (!cancelled) {
            setLocked(true)
            setProgress(json.progress)
          }
          return
        }
        if (!res.ok) throw new Error('Failed to load')
        const json = (await res.json()) as CelebrationGapResponse
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

  const lessonDateLabel = useMemo(() => (data?.lessonDate ? formatLessonDate(data.lessonDate) : ''), [data?.lessonDate])

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
          🪞 Celebration Gap
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 leading-relaxed">
          Mrs. Deer will take something you wrote as a “lesson” and show you the quiet win hiding inside it — refreshed on
          your weekly rhythm.
        </p>
        {progress ? (
          <p className="mt-3 text-[11px] text-gray-500 dark:text-gray-400">
            {progress.daysActive}/{progress.target} days with entries · {progress.remaining} more to unlock
          </p>
        ) : (
          <p className="mt-3 text-[11px] text-gray-500 dark:text-gray-400">
            Unlocks after {CELEBRATION_GAP_MIN_DAYS} days with entries.
          </p>
        )}
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50/30 dark:bg-red-900/20 p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-red-800 dark:text-red-200">
          <AlertTriangle className="w-4 h-4" />
          Could not load Celebration Gap
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

  const hasLesson = data.lesson.trim().length > 0

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
        Mrs. Deer holds up a mirror on one recent lesson — the part that felt like a problem — and names what’s already
        working that you might have missed.
      </p>
      <p className="text-[11px] text-gray-500 dark:text-gray-400">
        Based on {data.eveningsSampled} evening{data.eveningsSampled === 1 ? '' : 's'} in the last 30 days.
      </p>

      {hasLesson ? (
        <div className="space-y-4">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
              Your lesson{lessonDateLabel ? ` · ${lessonDateLabel}` : ''}
            </h3>
            <blockquote className="rounded-lg border border-gray-200/80 dark:border-gray-600/60 bg-gray-50/80 dark:bg-gray-900/40 px-4 py-3 text-sm text-gray-800 dark:text-gray-100 leading-relaxed whitespace-pre-line italic">
              {data.lesson}
            </blockquote>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#ef725c] mb-2">What Mrs. Deer sees</h3>
            <p className="text-sm text-gray-800 dark:text-gray-100 leading-relaxed whitespace-pre-line">{data.insight}</p>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-600 bg-white/40 dark:bg-gray-800/20 p-4">
          <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed whitespace-pre-line">{data.insight}</p>
        </div>
      )}

      <Link href="/dashboard" className="text-sm inline-block" style={{ color: colors.navy.DEFAULT }}>
        ← Back to dashboard
      </Link>
    </div>
  )
}
