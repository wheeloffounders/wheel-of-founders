'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, Loader2, Lock } from 'lucide-react'
import { colors } from '@/lib/design-tokens'
import type { RecurringQuestionResponse } from '@/lib/types/founder-dna'
import { RECURRING_QUESTION_MIN_DAYS } from '@/lib/founder-dna/unlock-schedule-config'

type LockedBody = {
  error: string
  progress: { daysActive: number; target: number; remaining: number }
}

export function RecurringQuestionCard() {
  const [loading, setLoading] = useState(true)
  const [locked, setLocked] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<RecurringQuestionResponse | null>(null)
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
        const res = await fetch('/api/founder-dna/recurring-question', { credentials: 'include' })
        if (res.status === 403) {
          const json = (await res.json()) as LockedBody
          if (!cancelled) {
            setLocked(true)
            setProgress(json.progress)
          }
          return
        }
        if (!res.ok) throw new Error('Failed to load')
        const json = (await res.json()) as RecurringQuestionResponse
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
          💫 Recurring Question
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 leading-relaxed">
          Mrs. Deer listens for questions you ask yourself again and again — in lessons and in why you chose a decision.
        </p>
        {progress ? (
          <p className="mt-3 text-[11px] text-gray-500 dark:text-gray-400">
            {progress.daysActive}/{progress.target} days with entries · {progress.remaining} more to unlock
          </p>
        ) : (
          <p className="mt-3 text-[11px] text-gray-500 dark:text-gray-400">
            Unlocks after {RECURRING_QUESTION_MIN_DAYS} days with entries.
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
          Could not load Recurring Question
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
    <div className="space-y-6">
      <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">{data.intro}</p>
      <p className="text-[11px] text-gray-500 dark:text-gray-400">
        Scanned {data.eveningsSampled} evening{data.eveningsSampled === 1 ? '' : 's'} and {data.decisionsSampled} decision
        {data.decisionsSampled === 1 ? '' : 's'}.
      </p>

      {data.questions.length === 0 ? (
        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          No single question has repeated clearly yet. That’s okay — keep writing; echoes often appear quietly.
        </p>
      ) : (
        <ul className="space-y-5">
          {data.questions.map((q) => (
            <li
              key={q.question}
              className="rounded-xl border border-violet-200/80 dark:border-violet-900/50 bg-violet-50/40 dark:bg-violet-950/20 p-4"
            >
              <p className="text-sm font-medium text-gray-900 dark:text-white leading-snug">“{q.question}”</p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">Noticed ~{q.count} times</p>
              <p className="text-sm text-gray-700 dark:text-gray-200 mt-3 leading-relaxed">{q.observation}</p>
            </li>
          ))}
        </ul>
      )}

      <Link href="/dashboard" className="text-sm inline-block" style={{ color: colors.navy.DEFAULT }}>
        ← Back to dashboard
      </Link>
    </div>
  )
}
