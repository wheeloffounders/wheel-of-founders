'use client'

import { Button } from '@/components/ui/button'
import { MrsDeerMessageBubble } from '@/components/MrsDeerMessageBubble'
import { colors } from '@/lib/design-tokens'

interface NextWeekFocusProps {
  userChoice: string | null
  mrsDeerSuggestion: string
  onSetFocus: () => void
  isSet: boolean
}

export function NextWeekFocus({
  userChoice,
  mrsDeerSuggestion,
  onSetFocus,
  isSet,
}: NextWeekFocusProps) {
  return (
    <div className="space-y-4">
      {userChoice && (
        <div className="p-4 border-2" style={{ borderColor: colors.navy.DEFAULT }}>
          <p className="text-sm font-medium mb-1 text-gray-600 dark:text-gray-300">
            You chose
          </p>
          <p className="text-gray-900 dark:text-white">&quot;{userChoice}&quot;</p>
        </div>
      )}
      <MrsDeerMessageBubble expression="thoughtful">
        <p className="leading-relaxed text-gray-900 dark:text-white">
          {mrsDeerSuggestion}
        </p>
      </MrsDeerMessageBubble>
      <Button
        variant="primary"
        onClick={onSetFocus}
        disabled={isSet}
        className="w-full"
      >
        {isSet ? 'Focus Set' : 'Set This as My Focus'}
      </Button>
    </div>
  )
}
