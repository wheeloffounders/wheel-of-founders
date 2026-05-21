'use client'

import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import {
  archetypeBlueprintCardStyle,
  archetypeGradientRingClassName,
  archetypeReportCardInnerClassName,
} from '@/lib/founder-dna/archetype-report-card-styles'
import { cn } from '@/components/ui/utils'

type ArchetypeEditorialCardProps = {
  as?: 'article' | 'div'
  children: ReactNode
  innerClassName?: string
} & ComponentPropsWithoutRef<'article'>

/** Gradient ring + white blueprint interior. */
export function ArchetypeEditorialCard({
  as: Tag = 'article',
  className,
  innerClassName,
  children,
  ...props
}: ArchetypeEditorialCardProps) {
  return (
    <Tag className={cn(archetypeGradientRingClassName, className)} {...props}>
      <div
        className={cn(archetypeReportCardInnerClassName, innerClassName)}
        style={archetypeBlueprintCardStyle}
      >
        {children}
      </div>
    </Tag>
  )
}
