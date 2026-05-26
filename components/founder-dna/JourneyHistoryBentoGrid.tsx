'use client'

import { Loader2 } from 'lucide-react'
import type { JourneyWeekRecord } from '@/lib/founder-dna/journey-week-records'
import { JourneyWeekBentoCard } from '@/components/founder-dna/JourneyWeekBentoCard'
import { journeyBentoGridClassName } from '@/components/founder-dna/journey-page-layouts'

type JourneyHistoryBentoGridProps = {
  weeks: JourneyWeekRecord[]
  loading: boolean
  error: string | null
  weeklyNarrativeLocked?: boolean
  onOpenWeek?: (weekStart: string) => void
}

export function JourneyHistoryBentoGrid({
  weeks,
  loading,
  error,
  weeklyNarrativeLocked = false,
  onOpenWeek,
}: JourneyHistoryBentoGridProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-sm text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin text-[#ef725c]" />
        Building your roadmap…
      </div>
    )
  }

  if (error) {
    return (
      <p className="text-sm text-red-600 dark:text-red-400" role="alert">
        {error}
      </p>
    )
  }

  if (weeks.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-300/80 px-6 py-12 text-center text-sm text-slate-600 dark:border-slate-600 dark:text-gray-300">
        Your past chapters will appear here once Mrs. Deer has saved at least one weekly insight.
      </p>
    )
  }

  return (
    <div className={journeyBentoGridClassName}>
      {weeks.map((record, i) => (
        <JourneyWeekBentoCard
          key={record.weekStart}
          record={record}
          accentIndex={i}
          weeklyNarrativeLocked={weeklyNarrativeLocked}
          onOpenWeek={onOpenWeek}
        />
      ))}
    </div>
  )
}
