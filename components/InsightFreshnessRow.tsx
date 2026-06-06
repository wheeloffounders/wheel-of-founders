'use client'

import { useCallback, useState } from 'react'
import { motion } from 'framer-motion'

const DAILY_INSIGHT_TYPES = new Set([
  'morning',
  'post_morning',
  'post-morning',
  'post_evening',
  'evening',
  'emergency',
])

type FreshnessChoice = 'felt-fresh' | 'felt-same' | 'too-long'

export interface InsightFreshnessRowProps {
  insightId: string
  insightType: string
}

const PILL =
  'inline-flex items-center justify-center rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors disabled:opacity-50 ' +
  'bg-stone-100/90 text-stone-800 hover:bg-stone-200/80 dark:bg-stone-800/50 dark:text-stone-100 dark:hover:bg-stone-700/60 ' +
  'border border-stone-200/60 dark:border-stone-600/40'

export function InsightFreshnessRow({ insightId, insightType }: InsightFreshnessRowProps) {
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  const submit = useCallback(
    async (feedback: FreshnessChoice) => {
      if (busy || !insightId.trim()) return
      setBusy(true)
      try {
        const res = await fetch('/api/feedback/insight', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            insightId: insightId.trim(),
            insightType,
            feedback,
            feedbackText: '',
          }),
        })
        if (res.ok) setDone(true)
      } catch (e) {
        console.error('[InsightFreshnessRow]', e)
      } finally {
        setBusy(false)
      }
    },
    [busy, insightId, insightType]
  )

  if (!DAILY_INSIGHT_TYPES.has(insightType)) return null

  if (done) {
    return (
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mt-3 text-xs text-stone-600 dark:text-stone-400"
        role="status"
      >
        Thanks — that helps Mrs. Deer stay fresh.
      </motion.p>
    )
  }

  return (
    <div className="mt-3 border-t border-stone-200/50 pt-3 dark:border-stone-700/50">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-stone-500 dark:text-stone-400">
        How did this feel?
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy} className={PILL} onClick={() => void submit('felt-fresh')}>
          Fresh
        </button>
        <button type="button" disabled={busy} className={PILL} onClick={() => void submit('felt-same')}>
          Same as usual
        </button>
        <button type="button" disabled={busy} className={PILL} onClick={() => void submit('too-long')}>
          Too long
        </button>
      </div>
    </div>
  )
}
