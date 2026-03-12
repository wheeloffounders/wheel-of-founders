'use client'

import { Check, Square, Zap } from 'lucide-react'
import { ACTION_PLAN_OPTIONS_2 } from '@/app/morning/page'

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

const ENERGY_BATTERY: Record<number, string> = {
  1: '🔋',
  2: '🔋🔋',
  3: '🔋🔋🔋',
  4: '🔋🔋🔋🔋',
  5: '🔋🔋🔋🔋🔋',
}

const SEVERITY_LABELS: Record<string, string> = {
  hot: '🔥 Hot',
  warm: '🌡️ Warm',
  contained: '✅ Contained',
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
  action_plan?: string
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

interface DayCardProps {
  dateStr: string
  morningTasks: MorningTask[]
  morningDecisions: MorningDecision[]
  postMorningInsight: string | null
  eveningReview: EveningReview | null
  postEveningInsight: string | null
  emergencies: { id: string; description: string; severity?: string; notes?: string; resolved?: boolean }[]
}

export function DayCard({
  dateStr,
  morningTasks,
  morningDecisions,
  postMorningInsight,
  eveningReview,
  postEveningInsight,
  emergencies,
}: DayCardProps) {
  const tasksCompleted = morningTasks.filter((t) => t.completed).length
  const completionRate = morningTasks.length > 0 ? Math.round((tasksCompleted / morningTasks.length) * 100) : 0
  const hasReflection =
    !!eveningReview &&
    !!(
      eveningReview.journal?.trim() ||
      eveningReview.wins ||
      eveningReview.lessons ||
      eveningReview.mood != null ||
      eveningReview.energy != null
    )

  const hasMorning = morningTasks.length > 0 || morningDecisions.length > 0 || postMorningInsight
  const hasEvening = eveningReview || postEveningInsight

  return (
    <div className="space-y-6">
      {/* Morning Section */}
      {hasMorning && (
        <section className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-l-4 border-amber-500">
          <h2 className="text-lg font-semibold text-amber-600 dark:text-amber-400 mb-4 flex items-center gap-2">
            <span className="text-base">☀️</span>
            Morning
          </h2>
          <div className="space-y-4">
            {morningTasks.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Tasks</p>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {tasksCompleted}/{morningTasks.length} completed
                  </span>
                </div>
                <div className="mb-2 w-full bg-gray-50 dark:bg-gray-900 rounded-full h-2">
                  <div
                    className="bg-emerald-500 h-2 rounded-full transition-all"
                    style={{ width: `${completionRate}%` }}
                  />
                </div>
                <ul className="space-y-2">
                  {morningTasks.map((task) => (
                    <li
                      key={task.id}
                      className={`flex items-center gap-3 p-3 rounded-lg ${
                        task.completed ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-gray-50 dark:bg-gray-900'
                      }`}
                    >
                      {task.completed ? (
                        <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 dark:text-white">{task.description}</p>
                        <div className="flex gap-2 mt-1">
                          {task.needle_mover && (
                            <span className="text-xs px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 rounded">
                              Needle Mover
                            </span>
                          )}
                          {task.action_plan && (
                            <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
                              {ACTION_PLAN_OPTIONS_2.find((o) => o.value === task.action_plan)?.label ?? task.action_plan}
                            </span>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {morningDecisions.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
                  <Zap className="w-4 h-4 text-amber-500" />
                  Key Decisions
                </p>
                <ul className="space-y-2">
                  {morningDecisions.map((d) => (
                    <li key={d.id} className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                      <p className="text-sm text-gray-900 dark:text-white font-medium">{d.decision}</p>
                      <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">{d.decision_type}</span>
                      {d.why_this_decision && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 italic">{d.why_this_decision}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {postMorningInsight?.trim() && (
              <div className="rounded-lg p-4 bg-[#f8f4f0] dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                <p className="text-xs font-semibold text-amber-800 dark:text-amber-200 mb-2">✨ Mrs. Deer, your AI companion&apos;s reflection</p>
                <p className="text-sm text-gray-900 dark:text-white italic">&quot;{postMorningInsight}&quot;</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Evening Section */}
      {hasEvening && (
        <section className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border-l-4 border-indigo-500">
          <h2 className="text-lg font-semibold text-indigo-600 dark:text-indigo-400 mb-4 flex items-center gap-2">
            <span className="text-base">🌙</span>
            Evening
          </h2>
          <div className="space-y-4">
            {eveningReview && (eveningReview.mood != null || eveningReview.energy != null) && (
              <div className="space-y-2">
                {eveningReview.mood != null && (
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Mood: {MOOD_LABELS[eveningReview.mood] ?? eveningReview.mood} ({eveningReview.mood}/5)
                    </p>
                    <div className="w-full bg-gray-50 dark:bg-gray-900 rounded-full h-1.5 mt-0.5">
                      <div
                        className="bg-amber-500 h-1.5 rounded-full"
                        style={{ width: `${(eveningReview.mood / 5) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
                {eveningReview.energy != null && (
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Energy: {ENERGY_BATTERY[eveningReview.energy] ?? '🔋'} {ENERGY_LABELS[eveningReview.energy] ?? eveningReview.energy} ({eveningReview.energy}/5)
                    </p>
                    <div className="w-full bg-gray-50 dark:bg-gray-900 rounded-full h-1.5 mt-0.5">
                      <div
                        className="bg-blue-500 h-1.5 rounded-full"
                        style={{ width: `${(eveningReview.energy / 5) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
            {postEveningInsight?.trim() && (
              <div className="rounded-lg p-4 bg-[#f8f4f0] dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                <p className="text-xs font-semibold text-amber-800 dark:text-amber-200 mb-2">✨ Mrs. Deer, your AI companion&apos;s reflection</p>
                <p className="text-sm text-gray-900 dark:text-white italic">&quot;{postEveningInsight}&quot;</p>
              </div>
            )}
            {eveningReview && parseWinsOrLessons(eveningReview.wins).length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Wins</p>
                <ul className="list-disc list-inside space-y-0.5 text-sm text-gray-900 dark:text-white">
                  {parseWinsOrLessons(eveningReview.wins).map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}
            {eveningReview && parseWinsOrLessons(eveningReview.lessons).length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Lessons</p>
                <ul className="list-disc list-inside space-y-0.5 text-sm text-gray-900 dark:text-white">
                  {parseWinsOrLessons(eveningReview.lessons).map((l, i) => (
                    <li key={i}>{l}</li>
                  ))}
                </ul>
              </div>
            )}
            {eveningReview?.journal?.trim() && (
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Journal</p>
                <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">{eveningReview.journal}</p>
              </div>
            )}
            {emergencies.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-orange-600 dark:text-orange-400 mb-2">🚨 Emergencies</p>
                <ul className="space-y-2">
                  {emergencies.map((e) => (
                    <li
                      key={e.id}
                      className={`p-3 rounded-lg border text-sm ${
                        e.resolved ? 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700' : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-700'
                      }`}
                    >
                      <p className="text-gray-900 dark:text-white font-medium">{e.description}</p>
                      <div className="flex gap-2 mt-1">
                        {e.severity && (
                          <span className="text-xs px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 rounded">
                            {SEVERITY_LABELS[e.severity] ?? e.severity}
                          </span>
                        )}
                        {e.resolved && (
                          <span className="text-xs px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 rounded">
                            Resolved
                          </span>
                        )}
                      </div>
                      {e.notes?.trim() && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{e.notes}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {!hasMorning && !hasEvening && (
        <p className="text-sm text-gray-500 dark:text-gray-400 italic py-4">No data for this date.</p>
      )}
    </div>
  )
}
