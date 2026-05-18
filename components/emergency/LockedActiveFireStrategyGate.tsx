'use client'

import Link from 'next/link'
import { Lock } from 'lucide-react'
import { MORNING_BLUEPRINTS_SUBCARD_CLASS } from '@/lib/morning/morning-loop-card-styles'
import { viewProPlansCtaClassName } from '@/lib/ui/view-pro-plans-cta'

type LockedActiveFireStrategyGateProps = {
  locked: boolean
  children: React.ReactNode
}

/**
 * Freemium: keep “What you reported” visible; blur Mrs. Deer strategy blocks behind navy-dotted glass.
 */
export function LockedActiveFireStrategyGate({ locked, children }: LockedActiveFireStrategyGateProps) {
  if (!locked) return <>{children}</>

  return (
    <div
      className={`relative isolate min-h-[12rem] overflow-hidden ${MORNING_BLUEPRINTS_SUBCARD_CLASS}`}
      role="region"
      aria-labelledby="active-fire-strategy-locked-heading"
    >
      <div className="pointer-events-none select-none space-y-4 p-4 blur-[3px] grayscale-[0.35] opacity-70" aria-hidden>
        {children}
      </div>
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 border border-[#152b50]/15 bg-white/93 p-5 text-center shadow-inner backdrop-blur-[2px] dark:border-sky-900/35 dark:bg-gray-950/93">
        <Lock className="h-6 w-6 text-[#152b50] dark:text-sky-300" aria-hidden />
        <p
          id="active-fire-strategy-locked-heading"
          className="max-w-sm text-sm font-medium leading-relaxed text-gray-900 dark:text-gray-100"
        >
          Mrs. Deer reads your hot fires against today&apos;s morning plan to suggest what to hold, pivot, or drop.
        </p>
        <Link href="/pricing" className={`${viewProPlansCtaClassName} px-5 py-2.5 text-sm`}>
          Unlock Pro Triage
        </Link>
      </div>
    </div>
  )
}
