'use client'

import { format } from 'date-fns'
import type { DayData } from '@/lib/weekly-analysis'
import { WeeklyInsightSection } from '@/components/weekly/WeeklyInsightSection'
import type { WeeklyInsightAccent } from '@/components/weekly/WeeklyInsightSection'
import { MOOD_LABELS } from '@/lib/weekly/weekly-mood-labels'

type WeeklyDayLogTimelineProps = {
  days: DayData[]
  accent: WeeklyInsightAccent
}

function dayHasActivity(day: DayData): boolean {
  return (
    day.needleMoversCompleted > 0 ||
    day.wins.length > 0 ||
    day.lessons.length > 0 ||
    day.mood != null ||
    day.energy != null ||
    Boolean(day.eveningInsight?.trim())
  )
}

export function WeeklyDayLogTimeline({ days, accent }: WeeklyDayLogTimelineProps) {
  const activeDays = days.filter(dayHasActivity)
  if (activeDays.length === 0) return null

  return (
    <div className="space-y-4" aria-label="Daily log timeline">
      {activeDays.map((day) => {
        const label = format(new Date(`${day.date}T12:00:00`), 'EEEE, MMM d')
        return (
          <WeeklyInsightSection key={day.date} title={label} accent={accent} className="!mb-0">
            <div className="space-y-3 text-sm text-gray-800 dark:text-gray-200">
              {day.needleMovers > 0 ? (
                <p>
                  <span className="font-medium text-gray-600 dark:text-gray-400">Needle movers:</span>{' '}
                  {day.needleMoversCompleted}/{day.needleMovers}
                </p>
              ) : null}
              {day.mood != null || day.energy != null ? (
                <p className="text-gray-600 dark:text-gray-300">
                  {day.mood != null ? (
                    <span>
                      Mood: {MOOD_LABELS[Math.round(day.mood)] ?? day.mood}/5
                    </span>
                  ) : null}
                  {day.mood != null && day.energy != null ? ' · ' : null}
                  {day.energy != null ? <span>Energy: {day.energy}/5</span> : null}
                </p>
              ) : null}
              {day.wins.length > 0 ? (
                <ul className="space-y-1">
                  {day.wins.map((win, i) => (
                    <li key={`w-${i}`}>
                      <span className="text-[#ef725c]" aria-hidden>
                        ✓{' '}
                      </span>
                      {win}
                    </li>
                  ))}
                </ul>
              ) : null}
              {day.lessons.length > 0 ? (
                <ul className="space-y-1 text-gray-700 dark:text-gray-300">
                  {day.lessons.map((lesson, i) => (
                    <li key={`l-${i}`}>
                      <span className="font-medium text-gray-500 dark:text-gray-400">Lesson:</span> {lesson}
                    </li>
                  ))}
                </ul>
              ) : null}
              {day.eveningInsight?.trim() ? (
                <p className="italic text-gray-600 dark:text-gray-400 border-t border-slate-100 dark:border-slate-700/80 pt-2">
                  {day.eveningInsight}
                </p>
              ) : null}
            </div>
          </WeeklyInsightSection>
        )
      })}
    </div>
  )
}
