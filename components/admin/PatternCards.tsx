'use client'

import { getActionPlanLabel } from './action-plan-labels'

export type PatternsData = {
  postponementStats: {
    total: number
    byActionPlan: Record<string, number>
  }
  mostPostponedTask?: { description: string; count: number }
  needleMoverPostponeRate: number
  commonFeedbackThemes?: string[]
}

export interface PatternCardsProps {
  patterns: PatternsData
  userPatterns?: Array<{ pattern_type?: string; pattern_text?: string }>
}

export function PatternCards({ patterns, userPatterns = [] }: PatternCardsProps) {
  const {
    postponementStats,
    mostPostponedTask,
    needleMoverPostponeRate,
    commonFeedbackThemes,
  } = patterns

  const hasPostponements = postponementStats.total > 0
  const hasUserPatterns = userPatterns.length > 0
  const hasPatterns = hasPostponements || hasUserPatterns || commonFeedbackThemes?.length

  if (!hasPatterns) {
    return (
      <div className="text-gray-500 dark:text-gray-400 text-sm py-8 text-center">
        No patterns detected yet
      </div>
    )
  }

  const topPostponedType = Object.entries(postponementStats.byActionPlan).sort(
    (a, b) => b[1] - a[1]
  )[0]

  return (
    <div className="space-y-6">
      {/* Postponement stats */}
      {hasPostponements && (
        <section>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            📋 POSTPONEMENT INSIGHTS
          </h3>
          <ul className="space-y-2">
            {topPostponedType && (
              <li className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                <span className="text-gray-400">•</span>
                <span>
                  Postpones &ldquo;{getActionPlanLabel(topPostponedType[0])}&rdquo; tasks most
                  ({topPostponedType[1]}x)
                </span>
              </li>
            )}
            {mostPostponedTask && (
              <li className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                <span className="text-gray-400">•</span>
                <span>
                  Most postponed: &ldquo;{mostPostponedTask.description}&rdquo; ({mostPostponedTask.count}x)
                </span>
              </li>
            )}
            {needleMoverPostponeRate >= 50 && (
              <li className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                <span className="text-gray-400">•</span>
                <span>
                  {needleMoverPostponeRate}% of postponed tasks are needle movers
                </span>
              </li>
            )}
            <li className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
              <span className="text-gray-400">•</span>
              <span>Total postponements: {postponementStats.total}</span>
            </li>
          </ul>
        </section>
      )}

      {/* User patterns from user_patterns table */}
      {hasUserPatterns && (
        <section>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            📊 DETECTED PATTERNS
          </h3>
          <ul className="space-y-2">
            {userPatterns.map((p, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300"
              >
                <span className="text-gray-400">•</span>
                <span>{p.pattern_text ?? p.pattern_type ?? '—'}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Common feedback themes */}
      {commonFeedbackThemes && commonFeedbackThemes.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            💬 COMMON FEEDBACK THEMES
          </h3>
          <ul className="space-y-2">
            {commonFeedbackThemes.map((theme, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300"
              >
                <span className="text-gray-400">•</span>
                <span>&ldquo;{theme}&rdquo;</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
