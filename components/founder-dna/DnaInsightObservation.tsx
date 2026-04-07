'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'

export type DnaInsightObservationProps = {
  verdict: string
  children: ReactNode
  recommendation: string
  action?: { label: string; href: string }
}

export function DnaInsightObservation({
  verdict,
  children,
  recommendation,
  action,
}: DnaInsightObservationProps) {
  return (
    <div className="rounded-lg border border-[#152b50]/15 bg-white/90 dark:bg-gray-900/30 p-3 shadow-sm dark:border-gray-600/40">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#152b50] dark:text-sky-200 mb-2">{verdict}</p>
      <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{children}</div>
      <div className="mt-3 pt-3 border-t border-gray-200/90 dark:border-gray-600/50">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
          Mrs. Deer&apos;s recommendation
        </p>
        <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">{recommendation}</p>
      </div>
      {action ? (
        <div className="mt-3">
          <Link
            href={action.href}
            className="inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium text-white bg-gradient-to-r from-[#f0886c] to-[#ef725c] shadow-[0_0_10px_rgba(239,114,92,0.4)] transition hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ef725c] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900"
          >
            {action.label} →
          </Link>
        </div>
      ) : null}
    </div>
  )
}
