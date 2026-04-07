'use client'

import Link from 'next/link'
import { Lock } from 'lucide-react'
import type { ReactNode } from 'react'
import { colors } from '@/lib/design-tokens'

export type StrategicProLockVariant = 'morning_prism' | 'insights_analytics'

const COPY: Record<
  StrategicProLockVariant,
  { title: string; description: string; ctaLabel: string }
> = {
  morning_prism: {
    title: 'Strategy Prism & alignment',
    description:
      "Upgrade to restore Mrs. Deer's strategic angles, prism, and blueprint shortcuts — your task lines below stay yours to edit.",
    ctaLabel: 'View Pro plans',
  },
  insights_analytics: {
    title: 'Mood & pattern analytics',
    description:
      "Upgrade to keep Mrs. Deer's weekly mood trends, pattern spotlights, and deeper alignment views — your wins and reflections above stay yours.",
    ctaLabel: 'View Pro plans',
  },
}

export type StrategicProLockOverlayProps = {
  active: boolean
  children: ReactNode
  /** Defaults to morning (Strategy Prism copy). */
  variant?: StrategicProLockVariant
}

/**
 * Shared lock surface for Pro-only strategic / analytics UI (trial expired, non-subscriber).
 */
export function StrategicProLockOverlay({ active, children, variant = 'morning_prism' }: StrategicProLockOverlayProps) {
  if (!active) return <>{children}</>

  const copy = COPY[variant]

  return (
    <div className="relative z-40 overflow-hidden rounded-xl">
      <div className="pointer-events-none select-none blur-[0.5px] opacity-[0.88] saturate-75">{children}</div>
      <div
        className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-3 rounded-xl bg-gradient-to-b from-white/85 via-white/80 to-slate-50/90 p-5 text-center backdrop-blur-[3px] dark:from-gray-950/90 dark:via-gray-950/85 dark:to-gray-900/92"
        role="region"
        aria-label="Pro feature locked"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#152b50]/10 dark:bg-sky-400/15">
          <Lock className="h-6 w-6 text-[#152b50] dark:text-sky-200" strokeWidth={2} aria-hidden />
        </div>
        <p className="max-w-sm text-sm font-semibold text-[#152b50] dark:text-sky-100">{copy.title}</p>
        <p className="max-w-sm text-xs leading-relaxed text-slate-600 dark:text-slate-300">{copy.description}</p>
        <Link
          href="/pricing"
          className="pointer-events-auto inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-95"
          style={{ backgroundColor: colors.coral.DEFAULT }}
        >
          {copy.ctaLabel}
        </Link>
      </div>
    </div>
  )
}
