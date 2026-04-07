'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const WISDOM_QUOTES = [
  'Do not mistake movement for achievement.',
  "Focus is a matter of deciding what things you're not going to do.",
  'Clarity comes from engagement, not thought.',
  'Ship small, learn fast.',
  'What you do every day matters more than what you do once in a while.',
] as const

const PROGRESS_TARGET_PCT = 90
const PROGRESS_DURATION_MS = 8000

type Props = {
  open: boolean
  brainDumpPreview?: string
  coreObjectivePreview?: string
}

export function MorningSaveProcessingOverlay({
  open,
  brainDumpPreview = '',
  coreObjectivePreview = '',
}: Props) {
  const [mounted, setMounted] = useState(false)
  const [progress, setProgress] = useState(0)
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
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      startRef.current = null
      return
    }

    setQuotePick((k) => k + 1)
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
      className="fixed inset-0 z-[120] flex min-h-[100svh] flex-col items-center justify-center bg-[#f8f9fa] px-4 py-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] dark:bg-slate-950"
    >
      <div className="w-full max-w-2xl">
        <div className="relative overflow-hidden rounded-xl border-l-4 border-[#ef725c] bg-[#152b50]/5 shadow-sm dark:border-[#f0886c] dark:bg-[#152b50]/20">
          {/* Subtle progress — top edge of card */}
          <div
            className="h-0.5 w-full bg-slate-200/80 dark:bg-slate-600/60"
            aria-hidden
          >
            <div
              className="h-full bg-gradient-to-r from-[#5A7D66] to-[#ef725c] transition-[width] duration-150 ease-out"
              style={{ width: `${Math.min(100, progress)}%` }}
            />
          </div>

          <div className="p-4 sm:p-6">
            <h2 className="mb-3 flex items-center gap-2 text-xl font-semibold text-gray-900 dark:text-white">
              <span
                className="inline-flex motion-safe:animate-pulse"
                aria-hidden
              >
                🦌
              </span>
              Mrs. Deer is reading your tasks…
            </h2>

            <p className="mb-2 text-sm text-gray-600 dark:text-gray-400">She&apos;s looking for:</p>
            <ul className="mb-5 list-inside list-disc space-y-1 text-sm text-gray-600 dark:text-gray-400">
              <li>What themes are emerging today</li>
              <li>Where your energy naturally wants to go</li>
              <li>One question to ask you tomorrow</li>
            </ul>

            {snapshot ? (
              <div className="mb-5 rounded-lg border border-amber-200/60 bg-white/70 px-3 py-2.5 dark:border-amber-900/40 dark:bg-gray-900/50">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#5A7D66] dark:text-emerald-300/90">
                  I&apos;m distilling this for you now…
                </p>
                <p className="mt-2 max-h-28 overflow-y-auto text-sm leading-relaxed text-gray-800 dark:text-gray-200">
                  {snapshot}
                  {snapshotTruncated ? '…' : ''}
                </p>
              </div>
            ) : null}

            <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <span
                className="inline-block h-2 w-2 shrink-0 rounded-full bg-[#ef725c] motion-safe:animate-pulse dark:bg-[#f0886c]"
                aria-hidden
              />
              Mrs. Deer is finalizing your plan…
            </div>

            <p className="mt-4 text-center text-xs italic leading-snug text-gray-500 dark:text-gray-500">
              &ldquo;{quote}&rdquo;
            </p>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(node, document.body)
}
