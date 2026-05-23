'use client'

import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { ArchetypeEditorialCard } from '@/components/founder-dna/ArchetypeEditorialCard'
import {
  journeyGradientRingClassName,
  journeyLeftAccentClassName,
} from '@/lib/founder-dna/archetype-report-card-styles'
import { cn } from '@/components/ui/utils'

type JourneyBlueprintCardProps = {
  as?: 'article' | 'section' | 'div' | 'nav'
  children: ReactNode
  innerClassName?: string
  topAccentClassName?: string
} & ComponentPropsWithoutRef<'article'>

/** Journey bento primitive — lighter gradient ring + slate left anchor. */
export function JourneyBlueprintCard({
  as: Tag = 'article',
  className,
  innerClassName,
  topAccentClassName,
  children,
  ...props
}: JourneyBlueprintCardProps) {
  return (
    <ArchetypeEditorialCard
      as={Tag}
      className={className}
      innerClassName={cn('pt-7', innerClassName)}
      gradientRingClassName={journeyGradientRingClassName}
      leftAccentClassName={journeyLeftAccentClassName}
      {...props}
    >
      {topAccentClassName ? (
        <div
          className={cn(
            'pointer-events-none absolute left-0 right-0 top-0 z-30 h-[3.5px] rounded-t-[11px]',
            topAccentClassName,
          )}
          aria-hidden
        />
      ) : null}
      <div className="relative z-10 min-w-0">{children}</div>
    </ArchetypeEditorialCard>
  )
}
