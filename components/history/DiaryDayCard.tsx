'use client'

import { Check, Square } from 'lucide-react'
import { MarkdownText } from '@/components/MarkdownText'

const MOOD_LABELS: Record<number, string> = {
  1: 'Tough',
  2: 'Meh',
  3: 'Okay',
  4: 'Good',
  5: 'Great',
}

const ENERGY_LABELS: Record<number, string> = {
  1: 'Very Low',
  2: 'Low',
  3: 'Medium',
  4: 'High',
  5: 'Very High',
}

function parseWinsOrLessons(val: unknown): string[] {
  if (!val) return []
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val)
      if (Array.isArray(parsed)) return parsed.filter((s: unknown) => typeof s === 'string' && s.trim())
      if (typeof parsed === 'string' && parsed.trim()) return [parsed]
    } catch {
      if (val.trim()) return [val]
    }
  }
  return []
}

interface MorningTask {
  id: string
  description: string
  needle_mover?: boolean
  completed?: boolean
}

interface MorningDecision {
  id: string
  decision: string
  decision_type: string
  why_this_decision?: string
}

interface EveningReview {
  journal?: string
  mood?: number
  energy?: number
  wins?: string
  lessons?: string
}

interface Emergency {
  id: string
  description: string
  severity?: string
  notes?: string
  resolved?: boolean
  created_at?: string
  insight?: string | null
}

interface DiaryDayCardProps {
  dateStr: string
  dateLabel: string
  isToday: boolean
  /** When false, hide the top date row (sidebar already shows the date). */
  showDateHeader?: boolean
  morningInsight: string | null
  morningTasks: MorningTask[]
  morningDecisions: MorningDecision[]
  postMorningInsight: string | null
  emergencies: Emergency[]
  eveningReview: EveningReview | null
  eveningInsight: string | null
  stats?: {
    morningCompleted: boolean
    eveningCompleted: boolean
    currentStreak: number
    daysWithEntries: number
    nextBadge: { name: string; daysRemaining: number; note?: string } | null
  }
}

export function DiaryDayCard({
  dateStr,
  dateLabel,
  isToday,
  showDateHeader = true,
  morningInsight,
  morningTasks,
  morningDecisions,
  postMorningInsight,
  emergencies,
  eveningReview,
  eveningInsight,
  stats,
}: DiaryDayCardProps) {
  const hasReflection =
    !!eveningReview &&
    !!(
      eveningReview.journal?.trim() ||
      eveningReview.wins ||
      eveningReview.lessons ||
      eveningReview.mood != null ||
      eveningReview.energy != null
    )

  const hasAnyData =
    morningInsight ||
    morningTasks.length > 0 ||
    morningDecisions.length > 0 ||
    postMorningInsight ||
    emergencies.length > 0 ||
    hasReflection ||
    eveningInsight

  const formatEmergencyTime = (createdAt?: string) => {
    if (!createdAt) return null
    try {
      const d = new Date(createdAt)
      return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    } catch {
      return null
    }
  }

  if (!hasAnyData) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
        <p className="text-gray-500 dark:text-gray-400">No data for this date.</p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {showDateHeader ? (
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {dateLabel}
            {isToday && <span className="ml-2 text-sm font-medium text-[#ef725c]">Today</span>}
          </h2>
        </div>
      ) : null}

      <div className="p-6 space-y-6">
        {/* 1. Morning Insight */}
        {morningInsight?.trim() && (
          <section>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <span className="text-base">🦌</span>
              Morning Insight
            </h3>
            <div className="rounded-lg p-4 bg-[#f8f4f0] dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/50">
              <MarkdownText className="text-sm text-gray-800 dark:text-gray-200 italic">
                {morningInsight}
              </MarkdownText>
            </div>
          </section>
        )}

        {/* 2. Morning Plan */}
        {(morningTasks.length > 0 || morningDecisions.length > 0) && (
          <div className="border-t border-gray-200 dark:border-gray-700" />
        )}
        {(morningTasks.length > 0 || morningDecisions.length > 0) && (
          <section>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <span className="text-base">☀️</span>
              Morning Plan
            </h3>
            {morningTasks.length > 0 && (
              <ul className="space-y-2 mb-4">
                {morningTasks.map((task) => (
                  <li
                    key={task.id}
                    className={`flex items-center gap-3 p-3 rounded-lg ${
                      task.completed ? 'bg-emerald-50/50 dark:bg-emerald-900/20' : 'bg-gray-50 dark:bg-gray-900'
                    }`}
                  >
                    {task.completed ? (
                      <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    )}
                    <span className="text-sm text-gray-900 dark:text-white">{task.description}</span>
                    {task.needle_mover && (
                      <span className="text-xs px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 rounded shrink-0">
                        Most important
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {morningDecisions.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">📌 Decision</h4>
                {morningDecisions.map((d) => (
                  <div key={d.id} className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <p className="text-sm text-gray-900 dark:text-white font-medium">{d.decision}</p>
                    {d.why_this_decision && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 italic">{d.why_this_decision}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* 3. Post-Morning Insight */}
        {postMorningInsight?.trim() && (
          <div className="border-t border-gray-200 dark:border-gray-700" />
        )}
        {postMorningInsight?.trim() && (
          <section>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <span className="text-base">📝</span>
              Post-Morning Insight
            </h3>
            <div className="rounded-lg p-4 bg-[#f8f4f0] dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/50">
              <MarkdownText className="text-sm text-gray-800 dark:text-gray-200 italic">
                {postMorningInsight}
              </MarkdownText>
            </div>
          </section>
        )}

        {/* 4. Emergency + Emergency Insight */}
        {emergencies.length > 0 && (
          <div className="border-t border-gray-200 dark:border-gray-700" />
        )}
        {emergencies.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <span className="text-base">🚨</span>
              Emergency
              {emergencies.length > 1 && (
                <span className="text-xs font-normal text-gray-500">({emergencies.length})</span>
              )}
            </h3>
            {emergencies.map((e) => {
              const timeStr = formatEmergencyTime(e.created_at)
              return (
                <div key={e.id} className="space-y-2 mb-4 last:mb-0">
                  <div
                    className={`p-4 rounded-lg border ${
                      e.resolved
                        ? 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700'
                        : 'bg-orange-50/50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-700'
                    }`}
                  >
                    {timeStr && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">({timeStr})</p>
                    )}
                    <p className="text-sm text-gray-900 dark:text-white font-medium">{e.description}</p>
                    {e.resolved && e.notes?.trim() && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                        Resolved: {e.notes}
                      </p>
                    )}
                    {e.resolved && !e.notes?.trim() && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2">✓ Resolved</p>
                    )}
                  </div>
                  {e.insight && (
                    <div className="rounded-lg p-4 bg-[#f8f4f0] dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/50 ml-4 border-l-2 border-l-amber-500">
                      <h4 className="text-xs font-medium text-amber-800 dark:text-amber-200 mb-1">🦌 Emergency Insight</h4>
                      <MarkdownText className="text-sm text-gray-800 dark:text-gray-200 italic">
                        {e.insight}
                      </MarkdownText>
                    </div>
                  )}
                </div>
              )
            })}
          </section>
        )}

        {/* 5. Evening Reflection */}
        {(hasReflection || (!morningInsight && !morningTasks.length && !postMorningInsight && emergencies.length === 0 ? false : true)) && (
          <div className="border-t border-gray-200 dark:border-gray-700" />
        )}
        {hasReflection ? (
          <section>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <span className="text-base">🌙</span>
              Evening Reflection
            </h3>
            <div className="space-y-4">
              {parseWinsOrLessons(eveningReview.wins).length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">✓ Wins</p>
                  <ul className="list-disc list-inside space-y-0.5 text-sm text-gray-900 dark:text-white">
                    {parseWinsOrLessons(eveningReview.wins).map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
              {parseWinsOrLessons(eveningReview.lessons).length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">✎ Lessons</p>
                  <ul className="list-disc list-inside space-y-0.5 text-sm text-gray-900 dark:text-white">
                    {parseWinsOrLessons(eveningReview.lessons).map((l, i) => (
                      <li key={i}>{l}</li>
                    ))}
                  </ul>
                </div>
              )}
              {eveningReview.journal?.trim() && (
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">💭 Journal</p>
                  <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">{eveningReview.journal}</p>
                </div>
              )}
            </div>
          </section>
        ) : (
          !morningInsight && !morningTasks.length && !postMorningInsight && emergencies.length === 0 ? null : (
            <section>
              <div className="rounded-lg p-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">⏳ Day in progress...</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Evening reflection not yet logged</p>
              </div>
            </section>
          )
        )}

        {/* 6. Evening Insight */}
        {eveningInsight?.trim() && (
          <div className="border-t border-gray-200 dark:border-gray-700" />
        )}
        {eveningInsight?.trim() && (
          <section>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <span className="text-base">🦌</span>
              Evening Insight
            </h3>
            <div className="rounded-lg p-4 bg-[#f8f4f0] dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/50">
              <MarkdownText className="text-sm text-gray-800 dark:text-gray-200 italic">
                {eveningInsight}
              </MarkdownText>
            </div>
          </section>
        )}

        {/* 7. Mood & Energy */}
        {eveningReview && (eveningReview.mood != null || eveningReview.energy != null) && (
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700 flex flex-wrap gap-4">
            {eveningReview.mood != null && (
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Mood: {MOOD_LABELS[eveningReview.mood] ?? eveningReview.mood} ({eveningReview.mood}/5)
              </span>
            )}
            {eveningReview.energy != null && (
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Energy: {ENERGY_LABELS[eveningReview.energy] ?? eveningReview.energy} ({eveningReview.energy}/5)
              </span>
            )}
          </div>
        )}

        {/* 8. Today's Stats */}
        {stats ? (
          <>
            <div className="border-t border-gray-200 dark:border-gray-700" />
            <section>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <span className="text-base">✨</span>
                Today&apos;s Stats
              </h3>
              <ul className="space-y-1 text-sm text-gray-800 dark:text-gray-200">
                <li>Morning completed: {stats.morningCompleted ? '✅' : '❌'}</li>
                <li>Evening completed: {stats.eveningCompleted ? '✅' : '❌'}</li>
                <li>Current streak: {stats.currentStreak} day{stats.currentStreak === 1 ? '' : 's'}</li>
                <li>Total days with entries: {stats.daysWithEntries}</li>
              </ul>

              <div className="mt-4">
                <h4 className="text-xs font-semibold tracking-wide uppercase text-gray-500 dark:text-gray-400 mb-1">📈 Coming Up</h4>
                {stats.nextBadge ? (
                  <p className="text-sm text-gray-800 dark:text-gray-200">
                    {stats.nextBadge.note ? (
                      <>
                        Next: <span className="font-medium">{stats.nextBadge.name}</span> — {stats.nextBadge.note}
                      </>
                    ) : (
                      <>
                        Next badge: <span className="font-medium">{stats.nextBadge.name}</span> in{' '}
                        <span className="font-medium">{stats.nextBadge.daysRemaining}</span> more day
                        {stats.nextBadge.daysRemaining === 1 ? '' : 's'}
                      </>
                    )}
                  </p>
                ) : (
                  <p className="text-sm text-emerald-700 dark:text-emerald-300">🎉 All badges unlocked! You&apos;re on a roll!</p>
                )}
              </div>
            </section>
          </>
        ) : null}
      </div>
    </div>
  )
}
