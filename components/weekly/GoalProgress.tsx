'use client'

import { MrsDeerMessageBubble } from '@/components/MrsDeerMessageBubble'
import { colors } from '@/lib/design-tokens'

interface GoalProgressProps {
  primaryGoal: string | null
  progressItems: string[]
  missingItem?: string | null
  mrsDeerQuestion: string
}

export function GoalProgress({
  primaryGoal,
  progressItems,
  missingItem,
  mrsDeerQuestion,
}: GoalProgressProps) {
  if (!primaryGoal) return null

  return (
    <div className="space-y-4">
      <div className="p-4 border-2" style={{ borderColor: colors.navy.DEFAULT }}>
        <p className="text-xs font-semibold uppercase tracking-wide mb-1 text-gray-600 dark:text-gray-300">
          Your goal
        </p>
        <p className="font-medium text-gray-900 dark:text-white">
          {primaryGoal}
        </p>
      </div>
      {progressItems.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-2 text-gray-600 dark:text-white">
            This week&apos;s progress
          </p>
          <ul className="list-disc list-inside space-y-1 text-gray-900 dark:text-white">
            {progressItems.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      )}
      {missingItem && (
        <p className="text-sm italic text-gray-600 dark:text-gray-300">
          Missing: {missingItem}
        </p>
      )}
      <MrsDeerMessageBubble expression="thoughtful">
        <p className="leading-relaxed text-gray-900 dark:text-white">
          {mrsDeerQuestion}
        </p>
      </MrsDeerMessageBubble>
    </div>
  )
}
