'use client'

import { Button } from '@/components/ui/button'
import { MrsDeerMessageBubble } from '@/components/MrsDeerMessageBubble'
import { colors } from '@/lib/design-tokens'

interface IntentionSettingProps {
  userIntention: string
  mrsDeerSuggestion: string
  onSetIntention: () => void
  isSet: boolean
}

export function IntentionSetting({
  userIntention,
  mrsDeerSuggestion,
  onSetIntention,
  isSet,
}: IntentionSettingProps) {
  return (
    <div className="space-y-4">
      <div className="p-4 border-2" style={{ borderColor: colors.navy.DEFAULT }}>
        <p className="text-xs font-semibold uppercase tracking-wide mb-1 text-gray-600 dark:text-gray-300">
          Based on what you shared
        </p>
        <p className="italic text-gray-900 dark:text-white">
          &quot;{userIntention}&quot;
        </p>
      </div>
      <MrsDeerMessageBubble expression="thoughtful">
        <p className="text-sm font-medium mb-1 text-gray-600 dark:text-gray-300">
          Mrs. Deer, your AI companion suggests
        </p>
        <p className="leading-relaxed text-gray-900 dark:text-white">
          {mrsDeerSuggestion}
        </p>
      </MrsDeerMessageBubble>
      <Button
        variant="primary"
        onClick={onSetIntention}
        disabled={isSet}
        className="w-full"
      >
        {isSet ? 'Focus Set' : 'Set as My Intention'}
      </Button>
    </div>
  )
}
