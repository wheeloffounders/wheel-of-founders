'use client'

import { DiaryDayCard } from './DiaryDayCard'
import Link from 'next/link'

export interface DayData {
  morningInsight: string | null
  morningPlan: { tasks: Array<{ id: string; plan_date: string; description: string; needle_mover?: boolean; completed?: boolean; task_order?: number }>; decision: { id: string; decision: string; decision_type: string; why_this_decision?: string } | null }
  postMorningInsight: string | null
  emergencies: Array<{ id: string; fire_date: string; description: string; severity?: string; notes?: string; resolved?: boolean; created_at?: string; insight?: string | null }>
  emergencyInsight: string | null
  eveningReview: { review_date: string; journal?: string; mood?: number; energy?: number; wins?: string; lessons?: string } | null
  eveningInsight: string | null
}

function isEveningComplete(ev: DayData['eveningReview']): boolean {
  if (!ev) return false
  return !!(
    ev.journal?.trim() ||
    ev.wins ||
    ev.lessons ||
    ev.mood != null ||
    ev.energy != null
  )
}

interface DayViewProps {
  dateStr: string
  dateLabel: string
  isToday: boolean
  dayData: DayData | null
  loading?: boolean
  /** Hide duplicate date row in the card when the sidebar already shows the date. */
  hideDateHeader?: boolean
  celebrate?: boolean
  stats?: {
    currentStreak: number
    daysWithEntries: number
    nextBadge: { name: string; daysRemaining: number; note?: string } | null
  }
}

export function DayView({ dateStr, dateLabel, isToday, dayData, loading, hideDateHeader, celebrate, stats }: DayViewProps) {
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

  const showDayInProgress =
    isToday && dayData && !isEveningComplete(dayData.eveningReview)

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {celebrate && isToday && stats ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-4 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100">
          <p className="text-lg font-semibold">🎉 Day {stats.daysWithEntries} Complete! 🎉</p>
          <p className="text-sm mt-1">You&apos;ve added another day to your founder&apos;s journey.</p>
          <p className="text-sm mt-1">
            Your streak: {stats.currentStreak} day{stats.currentStreak === 1 ? '' : 's'} | Total days with entries: {stats.daysWithEntries}
          </p>
          <Link href="/dashboard" className="inline-flex mt-3 text-sm font-medium text-emerald-700 dark:text-emerald-300 hover:underline">
            Back to Dashboard
          </Link>
        </div>
      ) : null}
      {showDayInProgress && (
        <div
          className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100"
          role="status"
        >
          <span className="font-medium">Day in progress…</span>{' '}
          <span className="text-amber-900/90 dark:text-amber-200/90">
            Complete your evening reflection to close the loop.
          </span>
        </div>
      )}
      <DiaryDayCard
        dateStr={dateStr}
        dateLabel={dateLabel}
        isToday={isToday}
        showDateHeader={!hideDateHeader}
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
        eveningReview={dayData.eveningReview}
        eveningInsight={dayData.eveningInsight}
        stats={
          stats
            ? {
                morningCompleted: dayData.morningPlan.tasks.length > 0,
                eveningCompleted: isEveningComplete(dayData.eveningReview),
                currentStreak: stats.currentStreak,
                daysWithEntries: stats.daysWithEntries,
                nextBadge: stats.nextBadge,
              }
            : undefined
        }
      />
    </div>
  )
}
