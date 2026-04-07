'use client'

import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'

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
      className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800/60 dark:bg-amber-950/25"
      role="region"
      aria-label="Pro trial ended"
    >
      <div className="flex flex-wrap items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-400" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-amber-950 dark:text-amber-100">
            Your Pro trial has ended. Mrs. Deer&apos;s strategic tools are offline, but your tasks are safe.
          </p>
          <Link
            href="/pricing"
            className="mt-2 inline-flex text-sm font-semibold text-[#152b50] underline-offset-2 hover:underline dark:text-sky-200"
          >
            View Pro plans
          </Link>
        </div>
      </div>
    </div>
  )
}
