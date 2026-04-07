'use client'

import Link from 'next/link'
import { Sparkles, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { colors } from '@/lib/design-tokens'

/**
 * Free-tier placeholder when a Hot fire is active but AI triage is Pro-only.
 */
export function LockedTriageCard({
  fireDescription,
  onContained,
  containing,
}: {
  fireDescription: string
  onContained: () => void
  containing: boolean
}) {
  return (
    <div className="rounded-xl border border-gray-200/90 bg-white/90 p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900/60">
      <div className="relative">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Shield className="h-5 w-5 shrink-0 text-amber-700 dark:text-amber-300" aria-hidden />
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">The Active Fire</h3>
          <span
            className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-950 dark:bg-amber-900/60 dark:text-amber-100"
            title="Pro feature"
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Upgrade to Pro
          </span>
        </div>
        <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
          <span className="font-medium text-gray-900 dark:text-gray-100">What you reported: </span>
          {fireDescription}
        </p>

        <div className="relative mt-5 min-h-[140px] rounded-xl border border-dashed border-amber-200/90 bg-slate-50/80 dark:border-amber-800/50 dark:bg-gray-800/50">
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center backdrop-blur-[2px]"
            style={{ filter: 'grayscale(0.85)', opacity: 0.92 }}
          >
            <p className="max-w-sm text-sm font-medium text-gray-600 dark:text-gray-400">
              Mrs. Deer is ready to triage this. Pro users get a &quot;Hold / Pivot / Drop&quot; strategy and tactical
              safe steps.
            </p>
            <Link
              href="/pricing"
              className="pointer-events-auto mt-1 inline-flex items-center justify-center rounded-none px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-95"
              style={{ backgroundColor: colors.coral.DEFAULT }}
            >
              Unlock triage with Pro
            </Link>
          </div>
        </div>

        <Button
          type="button"
          className="mt-5 w-full font-semibold"
          variant="outline"
          disabled={containing}
          onClick={onContained}
        >
          {containing ? 'Saving…' : "I've contained this fire"}
        </Button>
      </div>
    </div>
  )
}
