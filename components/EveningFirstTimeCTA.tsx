'use client'

import Link from 'next/link'
import { colors } from '@/lib/design-tokens'
import { getEffectivePlanDate } from '@/lib/effective-plan-date'

/** Link always uses founder-day date (before 4am = previous calendar day) so after-midnight works. */
export function EveningFirstTimeCTA() {
  const eveningDate = getEffectivePlanDate()
  return (
    <div
      className="mb-8 p-6 rounded-xl border-l-4 border-[#ef725c] bg-[#152b50]/5 dark:bg-[#152b50]/20"
      data-tour="evening-first-cta"
    >
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
        🌙 Something is waiting for you
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Every evening reflection unlocks a new layer of understanding about yourself.
      </p>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
        After tonight, Mrs. Deer will know:
      </p>
      <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 mb-4 list-disc list-inside">
        <li>What drained your energy (so you can fix it)</li>
        <li>What you should celebrate more often</li>
        <li>One small thing to adjust tomorrow</li>
      </ul>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Three evenings from now, patterns start to emerge. Seven evenings, and you&apos;ll see what&apos;s really been driving you.
      </p>
      <Link
        href={`/evening?date=${eveningDate}#evening-form`}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white hover:opacity-90 transition"
        style={{ backgroundColor: colors.coral.DEFAULT }}
      >
        Begin tonight&apos;s reflection →
      </Link>
    </div>
  )
}
