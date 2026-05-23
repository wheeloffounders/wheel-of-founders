'use client'

import type { ReactNode } from 'react'
import { CelebrationHeader } from '@/components/weekly/CelebrationHeader'
import { WeeklyInsightSection } from '@/components/weekly/WeeklyInsightSection'
import type { WeeklyInsightAccent } from '@/components/weekly/WeeklyInsightSection'
import { generateProgressInsight } from '@/lib/weekly-analysis'

type WeeklyInsightProfileCardProps = {
  quote: string
  dateRange: string
  greetingName: string
  needleMoversCompleted: number
  needleMoversTotal: number
  needlePct: number
  pace: string
  bestDayName: string | null
  bestDayNeedleCount: number
  firesTotal: number
  firesResolved: number
  decisions: number
  progressAccent: WeeklyInsightAccent
  reflectionSlot?: ReactNode
}

export function WeeklyInsightProfileCard({
  quote,
  dateRange,
  greetingName,
  needleMoversCompleted,
  needleMoversTotal,
  needlePct,
  pace,
  bestDayName,
  bestDayNeedleCount,
  firesTotal,
  firesResolved,
  decisions,
  progressAccent,
  reflectionSlot,
}: WeeklyInsightProfileCardProps) {
  return (
    <div className="space-y-6">
      <CelebrationHeader quote={quote} dateRange={dateRange} greetingName={greetingName} />

      <WeeklyInsightSection title="Week at a glance" accent={progressAccent}>
        <div className="space-y-3">
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            Needle Movers: {needleMoversCompleted}/{needleMoversTotal} ({needlePct}%)
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300">Pace: {pace}</p>
          {bestDayName ? (
            <p className="text-sm text-gray-900 dark:text-white">
              Your best day: {bestDayName} ({bestDayNeedleCount})
            </p>
          ) : null}
          {firesTotal > 0 ? (
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Fires: {firesResolved}/{firesTotal} resolved
            </p>
          ) : null}
          {decisions > 0 ? (
            <p className="text-sm text-gray-700 dark:text-gray-300">Decisions logged: {decisions}</p>
          ) : null}
          <p className="border-t border-slate-100 pt-4 text-sm leading-relaxed text-gray-800 dark:border-slate-700/80 dark:text-gray-200">
            {generateProgressInsight(needleMoversCompleted, needleMoversTotal, bestDayName)}
          </p>
        </div>
      </WeeklyInsightSection>

      {reflectionSlot}
    </div>
  )
}
