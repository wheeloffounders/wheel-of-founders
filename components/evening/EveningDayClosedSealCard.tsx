'use client'

import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'

/**
 * In-page “day closed” stamp — replaces celebratory modals; shown when `is_day_complete` is true.
 */
export function EveningDayClosedSealCard() {
  return (
    <section
      aria-label="Day closed"
      className="mb-0 rounded-2xl border border-emerald-200/80 bg-emerald-50/30 px-5 py-5 shadow-sm dark:border-emerald-900/50 dark:bg-emerald-950/25"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
        <CheckCircle2
          className="h-8 w-8 shrink-0 text-emerald-600 dark:text-emerald-400"
          strokeWidth={2}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-[#152B50] dark:text-emerald-50">The Empire is Secure</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
            Noise dumped, fires audited, wins recorded. Rest belongs to you.
          </p>
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            Curious about the trends? See your long-term growth in{' '}
            <Link
              href="/founder-dna/journey"
              className="font-medium text-[#ef725c] underline-offset-2 hover:underline dark:text-[#f0886c]"
            >
              Journey
            </Link>{' '}
            or{' '}
            <Link
              href="/founder-dna/rhythm"
              className="font-medium text-[#ef725c] underline-offset-2 hover:underline dark:text-[#f0886c]"
            >
              Rhythm
            </Link>
            .
          </p>
        </div>
      </div>
    </section>
  )
}
