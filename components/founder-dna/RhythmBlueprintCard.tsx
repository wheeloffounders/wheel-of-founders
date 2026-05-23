'use client'

import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { ArchetypeEditorialCard } from '@/components/founder-dna/ArchetypeEditorialCard'
import { rhythmLeftAccentClassName } from '@/lib/founder-dna/archetype-report-card-styles'
import { cn } from '@/components/ui/utils'

export type RhythmHeaderTagTone = 'indigo' | 'violet' | 'sky' | 'amber' | 'slate'

const headerTagDotClass: Record<RhythmHeaderTagTone, string> = {
  indigo: 'bg-indigo-500',
  violet: 'bg-violet-500',
  sky: 'bg-sky-500',
  amber: 'bg-amber-500',
  slate: 'bg-slate-500',
}

const headerTagPillClass: Record<RhythmHeaderTagTone, string> = {
  indigo: 'border-indigo-200/80 bg-indigo-50/80 text-indigo-800 dark:border-indigo-800/50 dark:bg-indigo-950/30 dark:text-indigo-200',
  violet:
    'border-violet-200/80 bg-violet-50/80 text-violet-800 dark:border-violet-800/50 dark:bg-violet-950/30 dark:text-violet-200',
  sky: 'border-sky-200/80 bg-sky-50/80 text-sky-800 dark:border-sky-800/50 dark:bg-sky-950/30 dark:text-sky-200',
  amber:
    'border-amber-200/80 bg-amber-50/80 text-amber-900 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-100',
  slate:
    'border-slate-200/80 bg-slate-50/80 text-slate-700 dark:border-slate-600/50 dark:bg-slate-900/40 dark:text-slate-200',
}

type RhythmBlueprintCardProps = {
  as?: 'article' | 'section' | 'div'
  children: ReactNode
  innerClassName?: string
  headerTag?: { label: string; tone?: RhythmHeaderTagTone }
  title?: string
  titleId?: string
  titleEmoji?: string
} & ComponentPropsWithoutRef<'article'>

/** Rhythm sections — archetype gradient frame + light grey left rail. */
export function RhythmBlueprintCard({
  as: Tag = 'article',
  className,
  innerClassName,
  headerTag,
  title,
  titleId,
  titleEmoji,
  children,
  ...props
}: RhythmBlueprintCardProps) {
  const tone = headerTag?.tone ?? 'indigo'
  const showHeader = Boolean(headerTag || title)

  return (
    <ArchetypeEditorialCard
      as={Tag}
      className={className}
      innerClassName={innerClassName}
      leftAccentClassName={rhythmLeftAccentClassName}
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
