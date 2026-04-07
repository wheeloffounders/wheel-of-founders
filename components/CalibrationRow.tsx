'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send } from 'lucide-react'
import { INSIGHT_FEEDBACK_HELPFUL, INSIGHT_FEEDBACK_TONE_ADJUSTMENT } from '@/lib/insight-feedback'

const FEEDBACK_COUNT_KEY = 'insight_feedback_count'

function incrementFeedbackCount(): number {
  if (typeof window === 'undefined') return 0
  const raw = window.localStorage.getItem(FEEDBACK_COUNT_KEY)
  const n = Math.max(0, parseInt(raw ?? '0', 10) + 1)
  window.localStorage.setItem(FEEDBACK_COUNT_KEY, String(n))
  return n
}

export interface CalibrationRowProps {
  /** Stable id for this insight row (stored as TEXT in insight_feedback.insight_id). */
  insightId: string
  insightType: string
  /** Freemium: keep Spot on; disable tone tweak entry. */
  toneAdjustLocked?: boolean
}

const PILL =
  'inline-flex items-center justify-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none ' +
  'bg-amber-100/70 text-amber-950 hover:bg-amber-200/60 dark:bg-amber-950/35 dark:text-amber-50 dark:hover:bg-amber-900/45 ' +
  'border border-amber-200/50 dark:border-amber-800/40 shadow-sm'

export function CalibrationRow({ insightId, insightType, toneAdjustLocked = false }: CalibrationRowProps) {
  const [done, setDone] = useState(false)
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [toneNote, setToneNote] = useState('')
  const [toneNoteBusy, setToneNoteBusy] = useState(false)

  useEffect(() => {
    if (toneAdjustLocked) setAdjustOpen(false)
  }, [toneAdjustLocked])

  const finish = useCallback(() => {
    setDone(true)
    setAdjustOpen(false)
    setToneNote('')
    incrementFeedbackCount()
  }, [])

  const handleSpotOn = async () => {
    if (busy || toneNoteBusy) return
    const id = insightId.trim()
    if (!id) return
    setBusy(true)
    try {
      const res = await fetch('/api/feedback/insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          insightId: id,
          insightType,
          feedback: INSIGHT_FEEDBACK_HELPFUL,
          feedbackText: '',
        }),
        credentials: 'include',
      })
      if (res.ok) finish()
    } catch (e) {
      console.error('[CalibrationRow] spot on', e)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('toast', {
            detail: { message: 'Could not log calibration. Try again.', type: 'error' },
          })
        )
      }
    } finally {
      setBusy(false)
    }
  }

  const submitToneNote = useCallback(async () => {
    const text = toneNote.trim()
    if (!text || toneNoteBusy || busy) return
    const id = insightId.trim()
    if (!id) return
    setToneNoteBusy(true)
    try {
      const res = await fetch('/api/feedback/insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          insightId: id,
          insightType,
          feedback: INSIGHT_FEEDBACK_TONE_ADJUSTMENT,
          feedbackText: text,
        }),
        credentials: 'include',
      })
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(j.error || 'Could not save tone note')
      }
      finish()
    } catch (e) {
      console.error('[CalibrationRow] tone note', e)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('toast', {
            detail: {
              message: e instanceof Error ? e.message : 'Could not save tone note.',
              type: 'error',
            },
          })
        )
      }
    } finally {
      setToneNoteBusy(false)
    }
  }, [busy, finish, insightId, insightType, toneNote, toneNoteBusy])

  if (done) {
    return (
      <motion.p
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="text-sm text-amber-900/90 dark:text-amber-100/90 leading-relaxed"
        role="status"
      >
        Mrs. Deer is calibrated.
      </motion.p>
    )
  }

  return (
    <div className="border-t border-amber-200/40 mt-4 pt-4 dark:border-amber-800/35">
      <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600/60 dark:text-amber-500/50 mb-3 block">
        Mrs. Deer Calibration
      </span>
      <p className="mb-3 text-[11px] leading-snug text-amber-800/75 dark:text-amber-200/70">
        Once your plan is set, you have one note for next time: happy as-is, or a single line to steer her voice.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => void handleSpotOn()} disabled={busy || toneNoteBusy} className={PILL}>
          <span aria-hidden>🎯</span>
          <span className="italic">Spot on</span>
        </button>
        <button
          type="button"
          onClick={() => setAdjustOpen((v) => !v)}
          disabled={toneAdjustLocked || busy || toneNoteBusy}
          className={PILL}
          aria-expanded={adjustOpen}
          title={toneAdjustLocked ? 'Tone Calibration is a Pro feature.' : undefined}
        >
          <span aria-hidden>⚙️</span>
          <span className="italic">Adjust Tone</span>
        </button>
      </div>

      <AnimatePresence initial={false}>
        {adjustOpen ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="mt-3">
              <label
                htmlFor="calibration-tone-note"
                className="mb-1.5 block text-[11px] font-medium text-amber-900/85 dark:text-amber-100/85"
              >
                Your one-line tweak
              </label>
              <p className="mb-2 text-[10px] leading-snug text-amber-800/70 dark:text-amber-200/65">
                e.g. &quot;Focus on ROI, stop the fluff&quot; — press Enter to send. Saves to your profile for the next
                Plan Review.
              </p>
              <div className="flex items-center gap-2">
                <input
                  id="calibration-tone-note"
                  type="text"
                  value={toneNote}
                  onChange={(e) => setToneNote(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      void submitToneNote()
                    }
                  }}
                  disabled={busy || toneNoteBusy}
                  maxLength={2000}
                  placeholder="One line for Mrs. Deer…"
                  className="min-w-0 flex-1 rounded-lg border border-amber-200/70 bg-white/90 px-3 py-2 text-sm text-amber-950 placeholder:text-amber-800/40 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-300/50 disabled:opacity-50 dark:border-amber-800/50 dark:bg-amber-950/20 dark:text-amber-50 dark:placeholder:text-amber-200/35"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => void submitToneNote()}
                  disabled={busy || toneNoteBusy || !toneNote.trim()}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-amber-200/80 bg-amber-50 text-amber-900 transition hover:bg-amber-100 disabled:pointer-events-none disabled:opacity-40 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-50 dark:hover:bg-amber-900/50"
                  aria-label="Send tone tweak"
                  title="Send"
                >
                  <Send className="h-4 w-4" strokeWidth={2.25} aria-hidden />
                </button>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
