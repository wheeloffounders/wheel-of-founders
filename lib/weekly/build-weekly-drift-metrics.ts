import { format } from 'date-fns'
import type { DayData } from '@/lib/weekly-analysis'
import type { WeeklyArchetypeDriftMetrics } from '@/lib/weekly/compute-weekly-archetype-drift'

export function buildWeeklyDriftMetrics(params: {
  needleMoversCompleted: number
  needleMoversTotal: number
  proactivePct: number
  avgMood: number | null
  avgEnergy: number | null
  daysCompleted: number
  daysInWeek: number
  dayData: DayData[]
}): WeeklyArchetypeDriftMetrics {
  const bestDay = params.dayData
    .filter((d) => d.needleMoversCompleted > 0)
    .sort((a, b) => b.needleMoversCompleted - a.needleMoversCompleted)[0]

  return {
    needleMoversCompleted: params.needleMoversCompleted,
    needleMoversTotal: params.needleMoversTotal,
    proactivePct: params.proactivePct,
    avgMood: params.avgMood,
    avgEnergy: params.avgEnergy,
    daysCompleted: params.daysCompleted,
    daysInWeek: params.daysInWeek,
    bestDayName: bestDay
      ? format(new Date(`${bestDay.date}T12:00:00`), 'EEEE')
      : null,
  }
}
