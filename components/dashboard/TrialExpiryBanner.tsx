'use client'

import Link from 'next/link'
import { Lock } from 'lucide-react'
import { viewProPlansCtaClassName } from '@/lib/ui/view-pro-plans-cta'

type TrialExpiryBannerProps = {
  /** When true, show the light “sky blueprint” banner with pricing CTA. */
  visible: boolean
}

/**
 * Slim banner when Pro trial has ended — sky blueprint shell; Pro CTA gradient unchanged.
 */
export function TrialExpiryBanner({ visible }: TrialExpiryBannerProps) {
  if (!visible) return null

  return (
    <div
      className="mb-4 rounded-xl border border-sky-300 bg-sky-50/50 px-4 py-3.5 shadow-[0_0_18px_rgba(14,165,233,0.15)] backdrop-blur-sm dark:border-sky-500/45 dark:bg-sky-950/30 dark:shadow-[0_0_18px_rgba(56,189,248,0.18)]"
      role="region"
      aria-label="Pro trial ended"
    >
      <div className="flex flex-wrap items-start gap-3">
        <span
          className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-sky-300 bg-white shadow-sm dark:border-sky-600/55 dark:bg-slate-900/60 dark:shadow-none"
          aria-hidden
        >
          <Lock className="h-5 w-5 text-sky-600 dark:text-sky-400" strokeWidth={2.25} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-snug text-slate-700 dark:text-slate-200">
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
