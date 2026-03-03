'use client'

import { useState, useEffect } from 'react'
import { Sparkles, WifiOff } from 'lucide-react'
import { MarkdownText } from './MarkdownText'
import { MrsDeerMessageBubble } from './MrsDeerMessageBubble'
import { filterInsightLabels } from '@/lib/insight-utils'
import { NextStepPrompt } from './NextStepPrompt'
import { InsightFeedback } from './InsightFeedback'

interface AICoachPromptProps {
  message: string
  onClose: () => void
  trigger: 'morning_before' | 'morning_after' | 'evening_after' | 'profile' | 'emergency'
  /** Optional: when provided, shows NextStepPrompt and InsightFeedback */
  insightId?: string
}

const CONTEXT_LABELS: Record<AICoachPromptProps['trigger'], string> = {
  morning_before: 'Morning',
  morning_after: 'Plan Review',
  evening_after: 'Evening Reflection',
  profile: 'Profile Insight',
  emergency: 'Firefighter Mode',
}

const TRIGGER_TO_NEXT_STEP: Record<string, 'post-morning' | 'evening' | 'emergency'> = {
  morning_after: 'post-morning',
  evening_after: 'evening',
  emergency: 'emergency',
}

const TRIGGER_TO_INSIGHT_TYPE: Record<string, string> = {
  morning_after: 'post-morning',
  evening_after: 'evening',
  emergency: 'emergency',
}

export function AICoachPrompt({ message, onClose, trigger, insightId }: AICoachPromptProps) {
  const [isOnline, setIsOnline] = useState(true)
  useEffect(() => {
    console.log('[AICoachPrompt] Rendered with trigger:', trigger, 'message length:', message?.length ?? 0)
  }, [trigger, message])
  useEffect(() => {
    setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true)
    const handler = () => setIsOnline(navigator.onLine)
    window.addEventListener('online', handler)
    window.addEventListener('offline', handler)
    return () => {
      window.removeEventListener('online', handler)
      window.removeEventListener('offline', handler)
    }
  }, [])

  const expression = trigger === 'evening_after' ? 'encouraging' : trigger === 'emergency' ? 'empathetic' : 'thoughtful'
  const variant = trigger === 'emergency' ? 'emergency' : 'default'

  return (
    <div className="w-full mb-8">
      {!isOnline && (
        <div className="mb-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 text-sm">
          <WifiOff className="w-4 h-4 flex-shrink-0" />
          AI insights require internet connection
        </div>
      )}
      <MrsDeerMessageBubble expression={expression} variant={variant}>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 flex-shrink-0" style={{ color: '#FBBF24' }} />
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 font-medium">
              {CONTEXT_LABELS[trigger]}
            </span>
          </div>
          <MarkdownText className="text-gray-900 dark:text-gray-100 leading-relaxed [&_p]:mb-2 [&_p:last-child]:mb-0">
            {filterInsightLabels(message ?? '')}
          </MarkdownText>
        </div>
      </MrsDeerMessageBubble>
      {TRIGGER_TO_NEXT_STEP[trigger] && (
        <NextStepPrompt type={TRIGGER_TO_NEXT_STEP[trigger]} />
      )}
      {insightId && TRIGGER_TO_INSIGHT_TYPE[trigger] && (
        <InsightFeedback
          insightId={insightId}
          insightType={TRIGGER_TO_INSIGHT_TYPE[trigger]}
        />
      )}
    </div>
  )
}
