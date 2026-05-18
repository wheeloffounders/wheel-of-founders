'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { Lock } from 'lucide-react'
import { viewProPlansCtaClassName } from '@/lib/ui/view-pro-plans-cta'
import { cn } from '@/components/ui/utils'

export type WeeklyInsightProGlassOverlayProps = {
  description: string
  ctaLabel?: string
  ctaHref?: string
  footer?: ReactNode
  headingId?: string
  className?: string
}

export function WeeklyInsightProGlassOverlay({
  description,
  ctaLabel = 'Unlock Pro',
  ctaHref = '/pricing',
  footer,
  headingId,
  className,
}: WeeklyInsightProGlassOverlayProps) {
  return (
    <div
      className={cn(
        'absolute inset-0 z-20 flex items-center justify-center overflow-y-auto rounded-xl px-4 py-6',
        'bg-white/55 backdrop-blur-[3px] dark:bg-gray-950/45',
        className
      )}
      role="region"
      aria-labelledby={headingId}
    >
      <div
        className={cn(
          'my-auto flex w-full max-w-sm shrink-0 flex-col items-center rounded-xl border border-slate-200/70',
          'bg-white/95 px-5 py-4 pb-5 text-center shadow-lg dark:border-slate-600/60 dark:bg-gray-900/95',
          footer ? 'gap-2.5' : 'gap-3'
        )}
      >
        <Lock className="h-6 w-6 shrink-0 text-[#152b50] dark:text-sky-300" aria-hidden />
        <p
          id={headingId}
          className="text-sm font-medium leading-relaxed text-gray-900 dark:text-gray-100"
        >
          {description}
        </p>
        <Link href={ctaHref} className={`${viewProPlansCtaClassName} shrink-0 px-5 py-2.5 text-sm`}>
          {ctaLabel}
        </Link>
        {footer ? (
          <div className="w-full text-xs leading-relaxed text-slate-600 dark:text-slate-400">{footer}</div>
        ) : null}
      </div>
    </div>
  )
}
