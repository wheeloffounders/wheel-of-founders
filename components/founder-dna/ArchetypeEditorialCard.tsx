'use client'

import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import {
  archetypeGradientRingClassName,
  archetypeLeftAccentClassName,
  archetypeReportCardInnerClassName,
} from '@/lib/founder-dna/archetype-report-card-styles'
import { founderDnaBlueprintCardStyle } from '@/lib/founder-dna/founder-dna-blueprint-styles'
import { cn } from '@/components/ui/utils'

type ArchetypeEditorialCardProps = {
  as?: 'article' | 'div' | 'section'
  children: ReactNode
  innerClassName?: string
  /** Defaults to archetype slate-900 rail; Rhythm passes light grey. */
  leftAccentClassName?: string
} & ComponentPropsWithoutRef<'article'>

/** Gradient ring + blueprint interior + solid left accent rail. */
export function ArchetypeEditorialCard({
  as: Tag = 'article',
  className,
  innerClassName,
  leftAccentClassName = archetypeLeftAccentClassName,
  children,
  ...props
}: ArchetypeEditorialCardProps) {
  return (
    <Tag className={cn(archetypeGradientRingClassName, className)} {...props}>
      <div
        className={cn(archetypeReportCardInnerClassName, innerClassName)}
        style={founderDnaBlueprintCardStyle}
      >
        <div className={leftAccentClassName} aria-hidden />
        {children}
      </div>
    </Tag>
  )
}
