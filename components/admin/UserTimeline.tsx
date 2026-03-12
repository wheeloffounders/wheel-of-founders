'use client'

import { format } from 'date-fns'
import { getActionPlanLabel } from './action-plan-labels'

export type DayEntry = {
  date: string
  morningInsight?: { prompt_text?: string; generated_at?: string; [k: string]: unknown }
  morningTasks?: Array<{
    description?: string
    completed?: boolean
    action_plan?: string
    why_this_matters?: string
    task_order?: number
    [k: string]: unknown
  }>
  morningDecision?: { decision?: string; decision_type?: string; why_this_decision?: string; [k: string]: unknown }
  postMorningInsight?: { prompt_text?: string; generated_at?: string; [k: string]: unknown }
  emergencies?: Array<{ description?: string; resolved?: boolean; fire_date?: string; [k: string]: unknown }>
  emergencyInsights?: Array<{ prompt_text?: string; generated_at?: string; [k: string]: unknown }>
  eveningReview?: {
    journal?: string
    mood?: number
    energy?: number
    wins?: string
    lessons?: string
    [k: string]: unknown
  }
  eveningInsight?: { prompt_text?: string; generated_at?: string; [k: string]: unknown }
  feedback?: Array<{ feedback?: string; feedback_text?: string; insight_type?: string; created_at?: string; [k: string]: unknown }>
}

export interface UserTimelineProps {
  days: Record<string, DayEntry>
}

const MOOD_EMOJI: Record<number, string> = {
  1: '😞',
  2: '😕',
  3: '😐',
  4: '😊',
  5: '😄',
}

const ENERGY_EMOJI: Record<number, string> = {
  1: '💤',
  2: '🔋',
  3: '⚡',
  4: '🔥',
  5: '🚀',
}

function getMoodEmoji(mood: number | null | undefined): string {
  if (mood == null || mood < 1 || mood > 5) return '😐'
  return MOOD_EMOJI[mood] ?? '😐'
}

function getEnergyEmoji(energy: number | null | undefined): string {
  if (energy == null || energy < 1 || energy > 5) return '⚡'
  return ENERGY_EMOJI[energy] ?? '⚡'
}

function getDecisionTypeLabel(type: string | null | undefined): string {
  if (!type) return ''
  if (type === 'strategic') return 'Purpose-aligned'
  if (type === 'tactical') return 'Day-to-day'
  return type
}

export function UserTimeline({ days }: UserTimelineProps) {
  const sortedDates = Object.keys(days)
    .filter((s) => s && !isNaN(new Date(s).getTime()))
    .sort()
    .reverse()

  if (sortedDates.length === 0) {
    return (
      <div className="text-gray-500 dark:text-gray-400 text-sm py-8 text-center">
        No activity yet
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {sortedDates.map((dateStr) => {
        const day = days[dateStr]
        const date = new Date(dateStr)
        const dayName = format(date, 'EEEE')
        const fullDate = format(date, 'MMMM d, yyyy')

        const hasContent =
          day.morningInsight ||
          (day.morningTasks && day.morningTasks.length > 0) ||
          day.morningDecision ||
          day.postMorningInsight ||
          (day.emergencies && day.emergencies.length > 0) ||
          (day.emergencyInsights && day.emergencyInsights.length > 0) ||
          day.eveningReview ||
          day.eveningInsight ||
          (day.feedback && day.feedback.length > 0)

        if (!hasContent) return null

        return (
          <div
            key={dateStr}
            className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden"
          >
            <div className="bg-gray-50 dark:bg-gray-800/50 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                📅 {dayName}, {fullDate}
              </h3>
            </div>

            <div className="p-4 space-y-4">
              {/* 1. Morning Insight */}
              {day.morningInsight?.prompt_text && (
                <section>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    🌅 MORNING INSIGHT
                  </h4>
                  <div className="bg-sky-50 dark:bg-sky-900/20 rounded-lg p-3 border border-sky-200 dark:border-sky-800/50">
                    <p className="text-sm text-sky-900 dark:text-sky-100 italic">
                      &ldquo;{day.morningInsight.prompt_text}&rdquo;
                    </p>
                  </div>
                </section>
              )}

              {/* 2. Morning Tasks + Decision */}
              {((day.morningTasks && day.morningTasks.length > 0) || day.morningDecision) && (
                <section>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    📋 MORNING PLAN
                  </h4>
                  {day.morningTasks && day.morningTasks.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Tasks:</p>
                      <ul className="space-y-1.5">
                        {day.morningTasks.map((t, i) => {
                          const completed = t.completed ?? false
                          const label = getActionPlanLabel(t.action_plan)
                          const why = t.why_this_matters?.trim()
                          return (
                            <li key={i} className="text-sm">
                              <span className="text-gray-700 dark:text-gray-300">
                                {completed ? '✓' : '○'} {t.description ?? '—'}
                                {label && (
                                  <span className="text-gray-500 dark:text-gray-400 ml-1">
                                    ({label})
                                  </span>
                                )}
                                {completed ? (
                                  <span className="text-green-600 dark:text-green-400 ml-1">— COMPLETED</span>
                                ) : (
                                  <span className="text-amber-600 dark:text-amber-400 ml-1">— PENDING</span>
                                )}
                              </span>
                              {why && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 ml-4">
                                  → Why: {why}
                                </p>
                              )}
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  )}
                  {day.morningDecision?.decision && (
                    <div className="mb-3">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Decision:</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        &ldquo;{day.morningDecision.decision}&rdquo;
                        {day.morningDecision.decision_type && (
                          <span className="text-gray-500 dark:text-gray-400 ml-1">
                            ({getDecisionTypeLabel(day.morningDecision.decision_type)})
                          </span>
                        )}
                      </p>
                    </div>
                  )}
                </section>
              )}

              {/* 3. Post-Morning Insight */}
              {day.postMorningInsight?.prompt_text && (
                <section>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    🦌 MRS. DEER&apos;S MORNING INSIGHT
                  </h4>
                  <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 border border-amber-200 dark:border-amber-800/50">
                    <p className="text-sm text-amber-900 dark:text-amber-100 italic">
                      &ldquo;{day.postMorningInsight.prompt_text}&rdquo;
                    </p>
                  </div>
                </section>
              )}

              {/* 4. Emergencies */}
              {day.emergencies && day.emergencies.length > 0 && (
                <section>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    🚨 EMERGENCIES
                  </h4>
                  <ul className="space-y-2">
                    {day.emergencies.map((e, i) => (
                      <li key={i} className="text-sm text-gray-700 dark:text-gray-300">
                        {e.description ?? '—'}
                        {e.resolved != null && (
                          <span className={e.resolved ? 'text-green-600 ml-1' : 'text-amber-600 ml-1'}>
                            ({e.resolved ? 'Resolved' : 'Open'})
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* 5. Emergency Insights */}
              {day.emergencyInsights && day.emergencyInsights.length > 0 && (
                <section>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    💬 EMERGENCY INSIGHTS
                  </h4>
                  {day.emergencyInsights.map((ins, i) => (
                    <div key={i} className="bg-rose-50 dark:bg-rose-900/20 rounded-lg p-3 border border-rose-200 dark:border-rose-800/50 mb-2">
                      <p className="text-sm text-rose-900 dark:text-rose-100 italic">
                        &ldquo;{ins.prompt_text ?? '—'}&rdquo;
                      </p>
                    </div>
                  ))}
                </section>
              )}

              {/* 6. Evening Review */}
              {day.eveningReview && (
                <section>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    🌙 EVENING REFLECTION
                  </h4>
                  <div className="space-y-2">
                    {day.eveningReview.journal && (
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        <span className="text-gray-500 dark:text-gray-400">Journal:</span>{' '}
                        &ldquo;{day.eveningReview.journal}&rdquo;
                      </p>
                    )}
                    <div className="flex gap-4 text-sm">
                      <span className="text-gray-700 dark:text-gray-300">
                        {getMoodEmoji(day.eveningReview.mood)} Mood: {day.eveningReview.mood ?? '—'}/5
                      </span>
                      <span className="text-gray-700 dark:text-gray-300">
                        {getEnergyEmoji(day.eveningReview.energy)} Energy: {day.eveningReview.energy ?? '—'}/5
                      </span>
                    </div>
                    {day.eveningReview.wins && (
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        <span className="text-gray-500 dark:text-gray-400">Wins:</span>{' '}
                        &ldquo;{day.eveningReview.wins}&rdquo;
                      </p>
                    )}
                    {day.eveningReview.lessons && (
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        <span className="text-gray-500 dark:text-gray-400">Lessons:</span>{' '}
                        &ldquo;{day.eveningReview.lessons}&rdquo;
                      </p>
                    )}
                  </div>
                </section>
              )}

              {/* 7. Evening Insight */}
              {day.eveningInsight?.prompt_text && (
                <section>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    🌃 MRS. DEER&apos;S EVENING INSIGHT
                  </h4>
                  <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-3 border border-indigo-200 dark:border-indigo-800/50">
                    <p className="text-sm text-indigo-900 dark:text-indigo-100 italic">
                      &ldquo;{day.eveningInsight.prompt_text}&rdquo;
                    </p>
                  </div>
                </section>
              )}

              {/* 8. Feedback */}
              {day.feedback && day.feedback.length > 0 && (
                <section>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    💭 FEEDBACK
                  </h4>
                  <div className="space-y-2">
                    {day.feedback.map((f, i) => (
                      <div key={i} className="text-sm">
                        <span
                          className={
                            f.feedback === 'helpful'
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-amber-600 dark:text-amber-400'
                          }
                        >
                          {f.feedback === 'helpful' ? '✓ Helpful' : '✗ Not helpful'}
                        </span>
                        {f.feedback_text && (
                          <span className="text-gray-600 dark:text-gray-400 ml-2">
                            &ldquo;{f.feedback_text}&rdquo;
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
