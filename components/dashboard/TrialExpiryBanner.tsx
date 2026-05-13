'use client'

import Link from 'next/link'
import { Lock } from 'lucide-react'
import { viewProPlansCtaClassName } from '@/lib/ui/view-pro-plans-cta'

type TrialExpiryBannerProps = {
  /** When true, show the soft-amber banner with pricing CTA. */
  visible: boolean
}

/**
 * Slim banner when Pro trial has ended — keeps tasks usable, nudges toward upgrade.
 */
export function TrialExpiryBanner({ visible }: TrialExpiryBannerProps) {
  if (!visible) return null

  return (
    <div
      className="mb-4 rounded-xl border border-indigo-400/30 bg-gradient-to-br from-indigo-950 via-indigo-900 to-slate-950 px-4 py-3.5 text-white shadow-md dark:border-indigo-500/35"
      role="region"
      aria-label="Pro trial ended"
    >
      <div className="flex flex-wrap items-start gap-3">
        <span
          className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-500/25 ring-1 ring-amber-200/35"
          aria-hidden
        >
          <Lock className="h-5 w-5 text-amber-100" strokeWidth={2.25} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-snug text-white/95">
            Your Pro trial has ended. Mrs. Deer&apos;s strategic tools are offline, but your tasks are safe.
          </p>
          <Link href="/pricing" className={`mt-3 ${viewProPlansCtaClassName}`}>
            View Pro plans
          </Link>
        </div>
      </div>
    </div>
  )
}
