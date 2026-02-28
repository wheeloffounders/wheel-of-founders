'use client'

import { MrsDeerMessageBubble } from '@/components/MrsDeerMessageBubble'
import type { PatternForQuestion, TopicCount } from '@/lib/weekly-analysis'
import { format } from 'date-fns'
import { TopicVisualization } from './TopicVisualization'

interface PatternQuestionProps {
  pattern: PatternForQuestion | null
  allTopics?: TopicCount[]
}

export function PatternQuestion({ pattern, allTopics = [] }: PatternQuestionProps) {
  if (!pattern && allTopics.length === 0) return null

  const dayName = pattern?.date ? format(new Date(pattern.date), 'EEEE') : 'this week'

  return (
    <div className="space-y-5">
      {allTopics.length > 0 && (
        <TopicVisualization topics={allTopics} />
      )}
      {pattern && (
        <>
          <p className="text-sm text-gray-900 dark:text-white">
            &quot;You mentioned {pattern.topic} {pattern.count} times this week—more than any other topic. On {dayName} you said: &apos;{pattern.example}&apos;&quot;
          </p>
          <p className="text-sm text-gray-700 dark:text-white">
            Is it working? What&apos;s different from before? What would tell you it&apos;s truly working?
          </p>
        </>
      )}
    </div>
  )
}
