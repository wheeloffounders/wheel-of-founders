'use client'

import { MrsDeerMessageBubble } from '@/components/MrsDeerMessageBubble'

interface CelebrationHeaderProps {
  quote: string
  dateRange: string
  /** First name (or Founder) for a short letter-style greeting */
  greetingName?: string
}

/** Weekly page header - patterns-focused, no transformation language */
export function CelebrationHeader({ quote, dateRange, greetingName }: CelebrationHeaderProps) {
  return (
    <div className="space-y-4">
      <div>
        {greetingName ? (
          <p className="text-base italic text-gray-600 dark:text-gray-300 mb-2">Hi {greetingName},</p>
        ) : null}
        <h2 className="text-2xl font-bold mb-1 text-[#152B50] dark:text-[#E2E8F0]">
          Your Week in Review
        </h2>
        <p className="text-sm text-gray-700 dark:text-gray-300 dark:text-gray-300">
          {dateRange}
        </p>
      </div>
      <MrsDeerMessageBubble expression="encouraging">
        <p className="leading-relaxed text-gray-900 dark:text-gray-100 dark:text-gray-100">
          &quot;{quote}&quot;
        </p>
        <p className="text-xs mt-2 italic text-gray-700 dark:text-gray-300 dark:text-gray-300">
          — Mrs. Deer, your AI companion
        </p>
      </MrsDeerMessageBubble>
    </div>
  )
}
