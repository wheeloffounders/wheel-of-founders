'use client'

import type { ReactNode } from 'react'
import {
  INSIGHT_PERIOD_CARD_HEADER_CLASS,
  INSIGHT_PERIOD_SECTION_TITLE_CLASS,
  insightPeriodCardClass,
  type InsightPeriodAccent,
} from '@/lib/insights/insight-period-card-styles'
import { cn } from '@/components/ui/utils'

type InsightPeriodSectionProps = {
  title: string
  children: ReactNode
  accent: InsightPeriodAccent
  headerActions?: ReactNode
  className?: string
  cardClassName?: string
  id?: string
}

export function InsightPeriodSection({
  title,
  children,
  accent,
  headerActions,
  className,
  cardClassName,
  id,
}: InsightPeriodSectionProps) {
  return (
    <section id={id} className={className}>
      <div className={cn(insightPeriodCardClass(accent), cardClassName)}>
        <div className={INSIGHT_PERIOD_CARD_HEADER_CLASS}>
          <h2 className={INSIGHT_PERIOD_SECTION_TITLE_CLASS}>{title}</h2>
          {headerActions ? <div className="flex shrink-0 items-center gap-2">{headerActions}</div> : null}
        </div>
        {children}
      </div>
    </section>
  )
}
