'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const PROGRESS_TARGET_PCT = 90
const PROGRESS_DURATION_MS = 8000

type Props = {
  open: boolean
  brainDumpPreview?: string
  coreObjectivePreview?: string
  /**
   * First-save discovery: no self-dismiss, no CTA — parent clears `saving` after AI + min delay.
   */
  masterGate?: boolean
  /** Non–master-gate: hide overlay visually; save continues until parent clears `saving`. */
  onDismiss: () => void
}

export function MorningSaveProcessingOverlay({
  open,
  brainDumpPreview = '',
  coreObjectivePreview = '',
  masterGate = false,
  onDismiss,
}: Props) {
  const [mounted, setMounted] = useState(false)
  const [progress, setProgress] = useState(0)
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
      className="fixed inset-0 z-[120] flex min-h-[100svh] flex-col items-center justify-center bg-[#f0f2f5] px-4 py-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] dark:bg-slate-950"
    >
      <div className="w-full max-w-lg">
        <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-[#f8f9fa] shadow-md dark:border-slate-600/60 dark:bg-gray-900/90">
          <div
            className="h-1 w-full shrink-0 overflow-hidden rounded-t-xl bg-slate-200/90 dark:bg-slate-600/50"
            aria-hidden
          >
            <div
              className="h-full bg-gradient-to-r from-[#6b9bd4] to-[#ef725c]"
              style={{
                width: `${Math.min(100, progress)}%`,
                minWidth: progress > 0 ? '2px' : undefined,
              }}
            />
          </div>

          <div className="border-l-4 border-[#ef725c] px-5 py-5 sm:px-6 sm:py-6 dark:border-[#f0886c]">
            <h2 className="mb-3 text-lg font-bold leading-snug text-slate-800 dark:text-white sm:text-xl">
              <span className="mr-1.5" aria-hidden>
                🦌
              </span>
              Mrs. Deer is reading your tasks…
            </h2>

            <p className="mb-2 text-sm text-slate-600 dark:text-slate-400">She&apos;s looking for:</p>
            <ul className="mb-4 list-inside list-disc space-y-1 text-sm text-slate-700 dark:text-slate-300">
              <li>What themes are emerging today</li>
              <li>Where your energy naturally wants to go</li>
              <li>One question to ask you tomorrow</li>
            </ul>

            <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">This takes just a moment.</p>

            <div className="mb-5 rounded-lg border border-amber-300/90 bg-amber-50/95 px-3 py-3 dark:border-amber-700/50 dark:bg-amber-950/35">
              <p className="text-[11px] font-bold uppercase tracking-wide text-amber-900/90 dark:text-amber-200/95">
                I&apos;m distilling this for you now…
              </p>
              {snapshot ? (
                <p className="mt-2 max-h-28 overflow-y-auto text-sm leading-relaxed text-slate-800 dark:text-slate-200">
                  {snapshot}
                  {snapshotTruncated ? '…' : ''}
                </p>
              ) : (
                <p className="mt-2 text-sm italic text-slate-500 dark:text-slate-400">
                  Your plan details will appear here as Mrs. Deer reads them.
                </p>
              )}
            </div>

            {masterGate ? (
              <p className="text-center text-sm font-medium text-slate-600 dark:text-slate-400">
                Hang tight — we&apos;ll show what she noticed as soon as it&apos;s ready.
              </p>
            ) : (
              <button
                type="button"
                onClick={() => onDismiss()}
                className="w-full rounded-lg py-3 text-center text-sm font-semibold text-white shadow-sm transition hover:opacity-95 active:opacity-90"
                style={{ backgroundColor: '#ef725c' }}
              >
                Minimize this screen
              </button>
            )}
          </div>
        </div>
      </div>

      {!masterGate ? (
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => onDismiss()}
            className="text-xs font-medium text-slate-500 underline-offset-4 hover:text-slate-700 hover:underline dark:text-slate-400 dark:hover:text-slate-200"
          >
            Close
          </button>
          <p className="mt-1 max-w-md text-[10px] leading-tight text-slate-400 dark:text-slate-500">
            Your save keeps running — buttons stay locked until it finishes.
          </p>
        </div>
      ) : (
        <p className="mt-4 max-w-md text-center text-[10px] leading-tight text-slate-400 dark:text-slate-500">
          Your save is finishing — stay on this screen for a seamless handoff.
        </p>
      )}
    </div>
  )

  return createPortal(node, document.body)
}
