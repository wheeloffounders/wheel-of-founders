'use client'

import type { PatternForQuestion, TopicCount } from '@/lib/weekly-analysis'
import { buildPatternQuoteAnalysisCopy } from '@/lib/weekly-analysis'
import { format } from 'date-fns'
import { TopicVisualization } from './TopicVisualization'
import { WeeklyInsightTeaserLock } from './WeeklyInsightTeaserLock'

interface PatternQuestionProps {
  pattern: PatternForQuestion | null
  allTopics?: TopicCount[]
  quoteAnalysisLocked?: boolean
  onUpgradeClick?: () => void
}

export function PatternQuestion({
  pattern,
  allTopics = [],
  quoteAnalysisLocked = false,
  onUpgradeClick,
}: PatternQuestionProps) {
  if (!pattern && allTopics.length === 0) return null

  const dayName = pattern?.date ? format(new Date(pattern.date), 'EEEE') : 'this week'

  const quoteBlock = pattern ? (
    <div className="space-y-3 pt-1">
      <p className="text-sm leading-relaxed break-words text-gray-900 dark:text-white">
        &quot;You mentioned {pattern.topic} {pattern.count} times this week—more than any other topic. On{' '}
        {dayName} you said: &apos;{pattern.example}&apos;&quot;
      </p>
      <p className="text-sm leading-relaxed break-words text-gray-700 dark:text-gray-300">
        Is it working? What&apos;s different from before? What would tell you it&apos;s truly working?
      </p>
    </div>
  ) : null

  return (
    <div className="space-y-6">
      {allTopics.length > 0 ? <TopicVisualization topics={allTopics} /> : null}
      {pattern && quoteAnalysisLocked ? (
        <WeeklyInsightTeaserLock
          message={buildPatternQuoteAnalysisCopy(pattern, dayName)}
          markdown={false}
          ctaHeadingId="weekly-pattern-quote-pro-cta"
          ctaDescription="Pro unlocks Mrs. Deer’s quote intersections—how your wins and lessons connect across the week."
          onUpgradeClick={onUpgradeClick}
        />
      ) : (
        quoteBlock
      )}
    </div>
  )
}
