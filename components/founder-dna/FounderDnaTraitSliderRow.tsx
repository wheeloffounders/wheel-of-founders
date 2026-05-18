'use client'

import type { ReactNode } from 'react'
import { Lock } from 'lucide-react'
import { cn } from '@/components/ui/utils'

export type FounderDnaTraitSliderRowProps = {
  label: string
  value: number
  /** Secondary dimensions: frozen thumb + mini lock. */
  thumbLocked?: boolean
  badge?: ReactNode
  className?: string
}

/**
 * Trait dimension row — visible fill + optional locked thumb for freemium secondary axes.
 */
export function FounderDnaTraitSliderRow({
  label,
  value,
  thumbLocked = false,
  badge,
  className,
}: FounderDnaTraitSliderRowProps) {
  const pct = Math.max(0, Math.min(100, value))

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex flex-wrap items-center gap-2 gap-y-1">
        <span className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400">{label}</span>
        {badge}
        {thumbLocked ? (
          <Lock className="h-3 w-3 shrink-0 text-gray-400 dark:text-gray-500" strokeWidth={2} aria-hidden />
        ) : null}
      </div>
      <div className="relative h-2 w-full overflow-visible rounded-full bg-gray-200 dark:bg-gray-700">
        <div
          className={cn(
            'h-full rounded-full transition-[width]',
            thumbLocked ? 'bg-[#ef725c]/55' : 'bg-[#ef725c]'
          )}
          style={{ width: `${pct}%` }}
        />
        <div
          className={cn(
            'absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full border-2 shadow-sm',
            thumbLocked
              ? 'cursor-not-allowed border-gray-200 bg-gray-300 dark:border-gray-600 dark:bg-gray-500'
              : 'border-white bg-[#ef725c] dark:border-gray-800'
          )}
          style={{ left: `clamp(0px, calc(${pct}% - 7px), calc(100% - 14px))` }}
          aria-hidden
        />
      </div>
    </div>
  )
}
