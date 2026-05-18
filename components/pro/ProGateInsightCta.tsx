'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { Lock } from 'lucide-react'
import { MORNING_BLUEPRINTS_SUBCARD_CLASS } from '@/lib/morning/morning-loop-card-styles'
import { viewProPlansCtaClassName } from '@/lib/ui/view-pro-plans-cta'
import { cn } from '@/components/ui/utils'

export type ProGateInsightCtaProps = {
  description: string
  ctaLabel?: string
  ctaHref?: string
  footer?: ReactNode
  className?: string
  headingId?: string
}

export function ProGateInsightCta({
  description,
  ctaLabel = 'Unlock Pro',
  ctaHref = '/pricing',
  footer,
  className,
  headingId,
}: ProGateInsightCtaProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 overflow-y-auto px-5 py-6 text-center',
        MORNING_BLUEPRINTS_SUBCARD_CLASS,
        'rounded-xl border border-[#152b50]/15 bg-white/93 shadow-inner backdrop-blur-[2px] dark:border-sky-900/35 dark:bg-gray-950/93 sm:py-7',
        className
      )}
      role="region"
      aria-labelledby={headingId}
    >
      <Lock className="h-6 w-6 text-[#152b50] dark:text-sky-300" aria-hidden />
      <p
        id={headingId}
        className="max-w-sm text-sm font-medium leading-relaxed text-gray-900 dark:text-gray-100"
      >
        {description}
      </p>
      <Link href={ctaHref} className={`${viewProPlansCtaClassName} px-5 py-2.5 text-sm`}>
        {ctaLabel}
      </Link>
      {footer ? <div className="text-xs text-slate-600 dark:text-slate-400">{footer}</div> : null}
    </div>
  )
}
