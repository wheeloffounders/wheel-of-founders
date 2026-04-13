'use client'

import Link from 'next/link'
import { colors } from '@/lib/design-tokens'

type Props = {
  pageLabel: string
}

/**
 * Lightweight “browse mode” lock — dimmed page + card (avoids heavy blur on children for mobile).
 */
export function MorningRequirementOverlay({ pageLabel: _pageLabel }: Props) {
  return null
  /*
  return (
    <div
      className="pointer-events-auto absolute inset-0 z-[50] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="morning-requirement-title"
    >
      <div className="absolute inset-0 bg-slate-950/55 dark:bg-black/70" aria-hidden />
      <div
        className="relative z-10 w-full max-w-md rounded-2xl border-2 border-amber-200/90 bg-white p-6 shadow-2xl dark:border-amber-700/50 dark:bg-gray-900"
        style={{ boxShadow: '0 24px 80px rgba(15, 23, 42, 0.25)' }}
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200/90">
          Browse mode
        </p>
        <h2 id="morning-requirement-title" className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">
          Morning loop still open
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
          You&apos;re previewing <span className="font-semibold text-gray-900 dark:text-white">{pageLabel}</span>. To
          unlock your real data and daily insights, finish your Morning Canvas first.
        </p>
        <Link
          href="/morning"
          className="mt-5 flex w-full items-center justify-center rounded-lg border-2 px-4 py-3 text-center text-sm font-semibold text-white shadow-sm transition hover:opacity-95"
          style={{
            backgroundColor: colors.coral.DEFAULT,
            borderColor: colors.coral.hover,
          }}
        >
          Finish Morning Canvas
        </Link>
      </div>
    </div>
  )
  */
}
