'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const WISDOM_QUOTES = [
  'Do not mistake movement for achievement.',
  "Focus is a matter of deciding what things you're not going to do.",
  'Clarity comes from engagement, not thought.',
  'Ship small, learn fast.',
  'What you do every day matters more than what you do once in a while.',
  'The way to get started is to quit talking and begin doing.',
  'Mrs. Deer is untangling your threads…',
  'Your morning plan is the conversation before the work begins.',
] as const

const STATUS_CYCLE = [
  'Sorting threads…',
  'Identifying Needle Movers…',
  'Finalizing your day…',
] as const

const PROGRESS_TARGET_PCT = 90
const PROGRESS_DURATION_MS = 8000
/** Rotate status copy ~every 2.7s while the bar runs (3 beats in ~8s). */
const STATUS_INTERVAL_MS = 2667

type Props = {
  open: boolean
  /** Brain dump text (optional micro-review). */
  brainDumpPreview?: string
  /** Core objective / decision line when no dump. */
  coreObjectivePreview?: string
  /** Hides overlay only; save continues (controls stay disabled while saving). */
  onDismiss: () => void
}

export function MorningSaveProcessingOverlay({
  open,
  brainDumpPreview = '',
  coreObjectivePreview = '',
  onDismiss,
}: Props) {
  const [mounted, setMounted] = useState(false)
  const [progress, setProgress] = useState(0)
  const [statusIndex, setStatusIndex] = useState(0)
  const [quotePick, setQuotePick] = useState(0)
  const rafRef = useRef<number | null>(null)
  const startRef = useRef<number | null>(null)
  const reducedMotionRef = useRef(false)

  useEffect(() => {
    setMounted(true)
    if (typeof window !== 'undefined') {
      reducedMotionRef.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    }
  }, [])

  useEffect(() => {
    if (!open) {
      setProgress(0)
      setStatusIndex(0)
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      startRef.current = null
      return
    }

    setQuotePick((k) => k + 1)
    setStatusIndex(0)
    setProgress(0)
    startRef.current = performance.now()

    if (reducedMotionRef.current) {
      setProgress(PROGRESS_TARGET_PCT)
      return
    }

    const tick = (now: number) => {
      const start = startRef.current ?? now
      const elapsed = now - start
      const next = Math.min(PROGRESS_TARGET_PCT, (elapsed / PROGRESS_DURATION_MS) * PROGRESS_TARGET_PCT)
      setProgress(next)
      if (next < PROGRESS_TARGET_PCT) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        rafRef.current = null
      }
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const t = window.setInterval(() => {
      setStatusIndex((i) => (i + 1) % STATUS_CYCLE.length)
    }, STATUS_INTERVAL_MS)
    return () => clearInterval(t)
  }, [open])

  const quote = useMemo(() => {
    const i = Math.floor(Math.random() * WISDOM_QUOTES.length)
    return WISDOM_QUOTES[i]!
  }, [quotePick])

  const dumpTrim = brainDumpPreview.trim()
  const coreTrim = coreObjectivePreview.trim()
  const snapshot =
    (dumpTrim ? dumpTrim.slice(0, 420) : '') || (coreTrim ? coreTrim.slice(0, 280) : '') || ''
  const snapshotTruncated = Boolean(dumpTrim.length > 420 || (!dumpTrim && coreTrim.length > 280))

  if (!mounted || !open) return null

  const node = (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="fixed inset-0 z-[120] flex min-h-[100svh] flex-col bg-gradient-to-b from-slate-50 via-white to-slate-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950"
    >
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 pb-6 pt-[max(1.5rem,env(safe-area-inset-top))]">
        <div className="w-full max-w-md space-y-6 text-center">
          {snapshot ? (
            <div className="rounded-xl border border-slate-200/90 bg-white/90 px-4 py-3 text-left shadow-sm dark:border-slate-600/80 dark:bg-gray-900/90">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#5A7D66] dark:text-emerald-300/90">
                I&apos;m distilling this for you now…
              </p>
              <p className="mt-2 max-h-28 overflow-y-auto text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                {snapshot}
                {brainDumpPreview.trim().length > 420 ? '…' : ''}
              </p>
            </div>
          ) : null}

          <div className="space-y-3">
            <p className="text-lg font-semibold leading-snug text-[#152b50] dark:text-sky-100 sm:text-xl">
              &ldquo;{quote}&rdquo;
            </p>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{STATUS_CYCLE[statusIndex]}</p>
          </div>

          <div className="mx-auto w-full max-w-xs space-y-2">
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#5A7D66] to-[#ef725c] transition-[width] duration-150 ease-out"
                style={{ width: `${Math.min(100, progress)}%` }}
              />
            </div>
            <p className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
              {Math.round(Math.min(100, progress))}%
            </p>
          </div>
        </div>
      </div>

      <div className="shrink-0 border-t border-slate-200/80 bg-white/80 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-center backdrop-blur-sm dark:border-slate-700/80 dark:bg-gray-950/80">
        <button
          type="button"
          onClick={onDismiss}
          className="text-xs font-medium text-slate-500 underline-offset-4 hover:text-slate-700 hover:underline dark:text-slate-400 dark:hover:text-slate-200"
        >
          Close
        </button>
        <p className="mt-1 text-[10px] leading-tight text-slate-400 dark:text-slate-500">
          Your save keeps running — buttons stay locked until it finishes.
        </p>
      </div>
    </div>
  )

  return createPortal(node, document.body)
}
