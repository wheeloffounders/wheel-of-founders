'use client'

import type { ReactNode } from 'react'
import { Lock } from 'lucide-react'

type FreemiumStandbyFrameProps = {
  active: boolean
  children: ReactNode
  /** Optional line over the muted region (e.g. Pro+ feature name). */
  caption?: string
  /** When true, muted content does not receive pointer events (pair with disabled inputs). */
  blockPointerOnContent?: boolean
}

/**
 * “Industrial standby” for AI / insight surfaces: muted chrome + corner lock while data stays in the DOM.
 */
export function FreemiumStandbyFrame({
  active,
  children,
  caption,
  blockPointerOnContent = false,
}: FreemiumStandbyFrameProps) {
  if (!active) return <>{children}</>

  return (
    <div className="relative">
      <div
        className="pointer-events-none absolute right-2 top-2 z-10 flex items-center gap-1 rounded-md bg-gradient-to-br from-indigo-600 to-indigo-900 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm ring-1 ring-indigo-400/40 dark:from-indigo-500 dark:to-indigo-950 dark:ring-indigo-300/30"
        aria-hidden
      >
        <Lock className="h-3.5 w-3.5 shrink-0 text-amber-100" strokeWidth={2.5} />
        <span>Pro</span>
      </div>
      {caption ? (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-3 z-10 mx-auto max-w-md px-3 text-center"
          role="note"
        >
          <p className="rounded-lg border border-indigo-400/30 bg-gradient-to-br from-indigo-950 via-indigo-900 to-slate-950 px-3 py-2 text-xs font-semibold leading-snug text-white shadow-md">
            {caption}
          </p>
        </div>
      ) : null}
      <div className={`opacity-50 grayscale ${blockPointerOnContent ? 'pointer-events-none' : ''}`}>{children}</div>
    </div>
  )
}
