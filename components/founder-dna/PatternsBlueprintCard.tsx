'use client'

import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { ArchetypeEditorialCard } from '@/components/founder-dna/ArchetypeEditorialCard'
import {
  patternsGradientRingClassName,
  patternsLeftAccentClassName,
} from '@/lib/founder-dna/archetype-report-card-styles'
import { cn } from '@/components/ui/utils'

export type PatternsHeaderTagTone = 'emerald' | 'teal' | 'amber' | 'rose' | 'slate'

const headerTagDotClass: Record<PatternsHeaderTagTone, string> = {
  emerald: 'bg-emerald-500',
  teal: 'bg-teal-500',
  amber: 'bg-amber-500',
  rose: 'bg-rose-500',
  slate: 'bg-slate-500',
}

const headerTagPillClass: Record<PatternsHeaderTagTone, string> = {
  emerald:
    'border-emerald-200/80 bg-emerald-50/80 text-emerald-900 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-200',
  teal: 'border-teal-200/80 bg-teal-50/80 text-teal-900 dark:border-teal-800/50 dark:bg-teal-950/30 dark:text-teal-200',
  amber:
    'border-amber-200/80 bg-amber-50/80 text-amber-950 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-100',
  rose: 'border-rose-200/80 bg-rose-50/80 text-rose-900 dark:border-rose-800/50 dark:bg-rose-950/30 dark:text-rose-200',
  slate:
    'border-slate-200/80 bg-slate-50/80 text-slate-700 dark:border-slate-600/50 dark:bg-slate-900/40 dark:text-slate-200',
}

type PatternsBlueprintCardProps = {
  as?: 'article' | 'section' | 'div'
  children: ReactNode
  innerClassName?: string
  headerTag?: { label: string; tone?: PatternsHeaderTagTone }
  title?: string
  titleId?: string
  titleEmoji?: string
} & ComponentPropsWithoutRef<'article'>

/** Patterns pillar — lighter gradient ring + slate-blue left rail. */
export function PatternsBlueprintCard({
  as: Tag = 'article',
  className,
  innerClassName,
  headerTag,
  title,
  titleId,
  titleEmoji,
  children,
  ...props
}: PatternsBlueprintCardProps) {
  const tone = headerTag?.tone ?? 'slate'
  const showHeader = Boolean(headerTag || title)

  return (
    <ArchetypeEditorialCard
      as={Tag}
      className={className}
      innerClassName={innerClassName}
      gradientRingClassName={patternsGradientRingClassName}
      leftAccentClassName={patternsLeftAccentClassName}
      {...props}
    >
      {showHeader ? (
        <header className="relative z-10 mb-5 flex flex-wrap items-center gap-x-3 gap-y-2">
          {headerTag ? (
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
                headerTagPillClass[tone],
              )}
            >
              <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', headerTagDotClass[tone])} aria-hidden />
              {headerTag.label}
            </span>
          ) : null}
          {title ? (
            <h2 id={titleId} className="text-sm font-semibold leading-snug text-gray-900 dark:text-white">
              {titleEmoji ? (
                <span aria-hidden className="mr-1">
                  {titleEmoji}
                </span>
              ) : null}
              {title}
            </h2>
          ) : null}
        </header>
      ) : null}
      <div className="relative z-10 min-w-0">{children}</div>
    </ArchetypeEditorialCard>
  )
}
