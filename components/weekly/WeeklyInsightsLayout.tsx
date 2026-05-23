'use client'

import type { ReactNode } from 'react'
import { WeeklyArchetypeDriftCard } from '@/components/weekly/WeeklyArchetypeDriftCard'
import type { WeeklyArchetypeDriftMetrics } from '@/lib/weekly/compute-weekly-archetype-drift'
import {
  weeklyPageGridClassName,
  weeklyPageLeftColumnClassName,
  weeklyPageRightColumnClassName,
} from '@/components/weekly/weekly-page-layouts'

export const WEEKLY_INSIGHTS_LAYOUT_VERSION = 'weekly-v2' as const

export const weeklyInsightsShellClassName = 'max-w-6xl mx-auto px-4 py-8'

type WeeklyInsightsLayoutProps = {
  driftMetrics: WeeklyArchetypeDriftMetrics
  left: ReactNode
  right: ReactNode
  afterGrid?: ReactNode
}

/** Full-width drift row + 50/50 grid (Weekly Insights). */
export function WeeklyInsightsLayout({ driftMetrics, left, right, afterGrid }: WeeklyInsightsLayoutProps) {
  return (
    <div className={weeklyInsightsShellClassName} data-layout={WEEKLY_INSIGHTS_LAYOUT_VERSION}>
      <div className="w-full mb-8" data-testid="weekly-archetype-drift-row">
        <WeeklyArchetypeDriftCard {...driftMetrics} />
      </div>

      <div className={weeklyPageGridClassName}>
        <div className={weeklyPageLeftColumnClassName}>{left}</div>
        <aside className={weeklyPageRightColumnClassName} aria-label="Weekly reflections">
          {right}
        </aside>
      </div>

      {afterGrid}
    </div>
  )
}
