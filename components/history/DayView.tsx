'use client'

import { format } from 'date-fns'
import { DiaryDayCard } from './DiaryDayCard'

export interface DayData {
  morningInsight: string | null
  morningPlan: { tasks: Array<{ id: string; plan_date: string; description: string; needle_mover?: boolean; completed?: boolean; task_order?: number }>; decision: { id: string; decision: string; decision_type: string; why_this_decision?: string } | null }
  postMorningInsight: string | null
  emergencies: Array<{ id: string; fire_date: string; description: string; severity?: string; notes?: string; resolved?: boolean; created_at?: string }>
  emergencyInsight: string | null
  eveningReview: { review_date: string; journal?: string; mood?: number; energy?: number; wins?: string; lessons?: string } | null
  eveningInsight: string | null
}

interface DayViewProps {
  dateStr: string
  dateLabel: string
  isToday: boolean
  dayData: DayData | null
  loading?: boolean
}

export function DayView({ dateStr, dateLabel, isToday, dayData, loading }: DayViewProps) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mx-auto" />
          <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    )
  }

  if (!dayData) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
        <p className="text-gray-500 dark:text-gray-400">No entries for this day.</p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">Select another day or add your morning plan and evening reflection.</p>
      </div>
    )
  }

  const emergencyInsightByDate: Record<string, string> = {}
  if (dayData.emergencyInsight) {
    emergencyInsightByDate[dateStr] = dayData.emergencyInsight
  }

  return (
    <DiaryDayCard
      dateStr={dateStr}
      dateLabel={dateLabel}
      isToday={isToday}
      morningInsight={dayData.morningInsight}
      morningTasks={dayData.morningPlan.tasks.map((t) => ({
        id: t.id,
        description: t.description,
        needle_mover: t.needle_mover,
        completed: t.completed,
      }))}
      morningDecisions={dayData.morningPlan.decision ? [dayData.morningPlan.decision] : []}
      postMorningInsight={dayData.postMorningInsight}
      emergencies={dayData.emergencies}
      emergencyInsightByDate={emergencyInsightByDate}
      eveningReview={dayData.eveningReview}
      eveningInsight={dayData.eveningInsight}
    />
  )
}
