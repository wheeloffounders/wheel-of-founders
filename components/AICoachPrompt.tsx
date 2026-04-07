'use client'

import { useState, useEffect, type ReactNode } from 'react'
import { Sparkles, WifiOff } from 'lucide-react'
import { MarkdownText } from './MarkdownText'
import { MrsDeerMessageBubble } from './MrsDeerMessageBubble'
import {
  filterInsightLabels,
  scrubGenericSynthesisTransitions,
  stripRedundantLeadingHeadings,
} from '@/lib/insight-utils'
import {
  emphasizeTomorrowDebtInGoodnight,
  splitEveningCoachMessage,
} from '@/lib/evening/evening-coach-message'
import { NextStepPrompt } from './NextStepPrompt'
import { InsightFeedback } from './InsightFeedback'
import { CalibrationRow } from './CalibrationRow'

interface AICoachPromptProps {
  message: string
  onClose: () => void
  trigger: 'morning_before' | 'morning_after' | 'evening_after' | 'profile' | 'emergency'
  /** Optional: when provided, shows NextStepPrompt and InsightFeedback */
  insightId?: string
  /** Rendered inside the morning “spark / audit” card above the message (e.g. streaming loader). */
  topSlot?: ReactNode
  /** Post-morning audit only: hide calibration while the audit is still streaming. */
  auditStreaming?: boolean
  /** Freemium: disable tone tweak while keeping Plan Review copy visible. */
  toneAdjustLocked?: boolean
  /** Post-evening: hot fires still open — bolds “tomorrow debt” lines in the goodnight block when count is positive. */
  eveningHotUnresolvedCount?: number
  /** While Mrs. Deer is still streaming, keep one block (split goodnight after stream ends). */
  eveningCoachStreaming?: boolean
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
  /** Same green next-step strip as post-morning plan review. */
  emergency: 'post-morning',
}

const TRIGGER_TO_INSIGHT_TYPE: Record<string, string> = {
  morning_after: 'post-morning',
  evening_after: 'evening',
  emergency: 'emergency',
}

const MORNING_INSIGHT_SURFACE =
  'rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50/30 p-6 dark:border-amber-900/50 dark:bg-amber-950/10'

export function AICoachPrompt({
  message,
  onClose,
  trigger,
  insightId,
  topSlot,
  auditStreaming = false,
  toneAdjustLocked = false,
  eveningHotUnresolvedCount = 0,
  eveningCoachStreaming = false,
}: AICoachPromptProps) {
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
  const morningSparkSurface =
    trigger === 'morning_before' || trigger === 'morning_after' || trigger === 'emergency'

  const insightTypeForFeedback = TRIGGER_TO_INSIGHT_TYPE[trigger]

  const rawFiltered = scrubGenericSynthesisTransitions(
    stripRedundantLeadingHeadings(filterInsightLabels(message ?? ''))
  )
  const eveningSplit =
    trigger === 'evening_after' && !eveningCoachStreaming
      ? splitEveningCoachMessage(rawFiltered)
      : { body: rawFiltered, goodnight: null as string | null }

  const body = (
    <div className="space-y-3">
      {topSlot ? <div className="pb-1">{topSlot}</div> : null}
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5 flex-shrink-0" style={{ color: '#FBBF24' }} />
        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 font-medium">
          {CONTEXT_LABELS[trigger]}
        </span>
      </div>
      {trigger === 'evening_after' && eveningSplit.goodnight ? (
        <>
          <MarkdownText className="text-gray-900 dark:text-gray-100 leading-relaxed [&_p]:mb-2 [&_p:last-child]:mb-0 [&_p]:leading-relaxed">
            {eveningSplit.body}
          </MarkdownText>
          <MarkdownText className="italic text-gray-600 dark:text-gray-400 leading-relaxed [&_p]:mb-2 [&_p:last-child]:mb-0 [&_p]:leading-relaxed [&_strong]:font-semibold [&_strong]:text-gray-800 dark:[&_strong]:text-gray-200">
            {emphasizeTomorrowDebtInGoodnight(eveningSplit.goodnight, eveningHotUnresolvedCount)}
          </MarkdownText>
        </>
      ) : (
        <MarkdownText className="text-gray-900 dark:text-gray-100 leading-relaxed [&_p]:mb-2 [&_p:last-child]:mb-0 [&_p]:leading-relaxed">
          {rawFiltered}
        </MarkdownText>
      )}
    </div>
  )

  const calibrationInsideCard =
    (trigger === 'morning_after' || trigger === 'emergency') &&
    insightId &&
    insightTypeForFeedback &&
    !auditStreaming ? (
      <CalibrationRow
        insightId={insightId}
        insightType={insightTypeForFeedback}
        toneAdjustLocked={toneAdjustLocked}
      />
    ) : null

  return (
    <div className="w-full mb-8">
      {!isOnline && (
        <div className="mb-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-[#f8f4f0] dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 text-sm">
          <WifiOff className="w-4 h-4 flex-shrink-0" />
          AI insights require internet connection
        </div>
      )}
      {morningSparkSurface ? (
        <div className={MORNING_INSIGHT_SURFACE}>
          {body}
          {calibrationInsideCard}
        </div>
      ) : (
        <MrsDeerMessageBubble expression={expression} variant={variant}>
          {body}
        </MrsDeerMessageBubble>
      )}
      {TRIGGER_TO_NEXT_STEP[trigger] && (
        <NextStepPrompt type={TRIGGER_TO_NEXT_STEP[trigger]} />
      )}
      {!morningSparkSurface && insightId && insightTypeForFeedback ? (
        <InsightFeedback insightId={insightId} insightType={insightTypeForFeedback} />
      ) : null}
    </div>
  )
}
