'use client'

import type { ReactNode } from 'react'
import { InsightUpgradeCtaButton } from '@/components/insights/InsightUpgradeCtaButton'
import { cn } from '@/components/ui/utils'

export type FounderDnaMatrixStaggerTeaserProps = {
  locked: boolean
  rows: ReactNode[]
  ctaLabel?: string
  onUpgradeClick?: () => void
  className?: string
  rowClassName?: string
}

/**
 * Trait / signal matrix — row 1 sharp; rows 2+ full-height white dissolve + centered upgrade CTA.
 */
export function FounderDnaMatrixStaggerTeaser({
  locked,
  rows,
  ctaLabel = 'Unlock Your Full Founder Identity Map',
  onUpgradeClick,
  className,
  rowClassName,
}: FounderDnaMatrixStaggerTeaserProps) {
  if (!locked || rows.length === 0) {
    return (
      <div className={cn('space-y-4', className)}>
        {rows.map((row, i) => (
          <div key={i} className={rowClassName}>
            {row}
          </div>
        ))}
      </div>
    )
  }

  const [first, ...rest] = rows
  if (rest.length === 0) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className={rowClassName}>{first}</div>
      </div>
    )
  }

  const cta = <InsightUpgradeCtaButton label={ctaLabel} onUpgradeClick={onUpgradeClick} />

  return (
    <div className={cn('space-y-4', className)}>
      <div className={rowClassName}>{first}</div>
      <div className="relative min-h-[12rem]">
        <div className={cn('space-y-4', rowClassName)}>
          {rest.map((row, i) => (
            <div key={i} className="pointer-events-none select-none blur-[2px] opacity-90">
              {row}
            </div>
          ))}
        </div>
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 top-8 z-10 rounded-b-xl bg-gradient-to-b from-transparent via-white/80 to-white dark:via-gray-800/85 dark:to-gray-800/95"
          aria-hidden
        />
        <div className="absolute inset-x-0 bottom-0 top-8 z-20 flex items-center justify-center px-4 py-10">
          {cta}
        </div>
      </div>
    </div>
  )
}
