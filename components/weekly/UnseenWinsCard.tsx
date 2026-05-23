'use client'

import ReactMarkdown from 'react-markdown'
import { PatternQuestion } from '@/components/weekly/PatternQuestion'
import { WeeklyInsightSection } from '@/components/weekly/WeeklyInsightSection'
import type { WeeklyInsightAccent } from '@/components/weekly/WeeklyInsightSection'
import type { PatternForQuestion, TopicCount } from '@/lib/weekly-analysis'

type UnseenWinsCardProps = {
  patternsAccent: WeeklyInsightAccent
  patternForQuestion: PatternForQuestion | null
  allTopics: TopicCount[]
  quoteAnalysisLocked: boolean
  onUpgradeClick: () => void
  unseenWinsPattern: string | null
}

/** Pattern lift + stored unseen-wins narrative for psychological calibration. */
export function UnseenWinsCard({
  patternsAccent,
  patternForQuestion,
  allTopics,
  quoteAnalysisLocked,
  onUpgradeClick,
  unseenWinsPattern,
}: UnseenWinsCardProps) {
  const hasPatterns = Boolean(patternForQuestion || allTopics.length > 0)
  const hasUnseen = Boolean(unseenWinsPattern?.trim())
  if (!hasPatterns && !hasUnseen) return null

  return (
    <div className="min-w-0 space-y-6">
      {hasPatterns ? (
        <WeeklyInsightSection title="Patterns Noticed" accent={patternsAccent}>
          <PatternQuestion
            pattern={patternForQuestion}
            allTopics={allTopics}
            quoteAnalysisLocked={quoteAnalysisLocked}
            onUpgradeClick={onUpgradeClick}
          />
        </WeeklyInsightSection>
      ) : null}

      {hasUnseen ? (
        <WeeklyInsightSection title="Unseen Wins" accent={patternsAccent}>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            Mrs. Deer surfaced this from your last 14 days — saved with your week.
          </p>
          <div className="text-sm text-gray-900 dark:text-white leading-relaxed break-words [&_p]:my-0 [&_p]:break-words [&_li]:break-words [&_strong]:font-semibold">
            <ReactMarkdown>{unseenWinsPattern}</ReactMarkdown>
          </div>
        </WeeklyInsightSection>
      ) : null}
    </div>
  )
}
