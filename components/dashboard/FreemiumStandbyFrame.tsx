'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { Lock } from 'lucide-react'

import { PRO_GATE_BADGE_SURFACE_CLASS } from '@/lib/morning/pro-gate-badge-styles'

type FreemiumStandbyFrameProps = {
  active: boolean
  children: ReactNode
  /** When true, muted content does not receive pointer events (pair with disabled inputs). */
  blockPointerOnContent?: boolean
  /** Top-right Pro chip (surfaces without an in-flow header badge can keep this on). */
  showCornerBadge?: boolean
  /**
   * Rendered above the tinted layer at full opacity (e.g. Clear the Path + Pro badge while brain dump stays muted).
   */
  aboveTintChrome?: ReactNode
}

/**
 * “Industrial standby” for AI / insight surfaces: muted chrome + corner lock while data stays in the DOM.
 */
export function FreemiumStandbyFrame({
  active,
  children,
  blockPointerOnContent = false,
  showCornerBadge = true,
  aboveTintChrome,
}: FreemiumStandbyFrameProps) {
  if (!active) return <>{children}</>

  return (
    <div className="relative">
      {aboveTintChrome ? (
        <div className="relative z-[50] w-full">{aboveTintChrome}</div>
      ) : null}
      {showCornerBadge ? (
        <Link
          href="/pricing"
          className={`absolute right-2 top-2 z-[55] cursor-pointer transition hover:scale-105 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-950 ${PRO_GATE_BADGE_SURFACE_CLASS}`}
          aria-label="Upgrade to Pro — view plans"
        >
          <Lock className="h-3.5 w-3.5 shrink-0 text-white/90" strokeWidth={2.5} aria-hidden />
          <span>Pro</span>
        </Link>
      ) : null}
      <div
        className={`relative z-0 opacity-[0.72] ${blockPointerOnContent ? 'pointer-events-none' : ''}`}
      >
        {children}
      </div>
    </div>
  )
}
