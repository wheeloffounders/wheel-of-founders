'use client'

import { useState, useEffect, type ReactNode } from 'react'
import Link from 'next/link'
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
import { viewProPlansCtaClassName } from '@/lib/ui/view-pro-plans-cta'
import { PRO_GATE_BADGE_SURFACE_CLASS } from '@/lib/morning/pro-gate-badge-styles'
import { MORNING_INSIGHT_SURFACE } from '@/lib/morning/morning-insight-surface'
import { showDebugTools } from '@/lib/env'
import { cn } from '@/components/ui/utils'
import { InsightTeaserBlur } from '@/components/insights/InsightTeaserBlur'
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
  /** Freemium: blur AI body and show upgrade CTA (morning / post-morning / evening insights). */
  insightFreemiumLocked?: boolean
  /**
   * Soft teaser: blurred markdown only (no indigo “vault” card). Use for morning / plan-review
   * upgrade nudges; keep `insightFreemiumLocked` for the hard vault (e.g. evening) when not teasing.
   */
  isTeaser?: boolean
  /**
   * When true, never apply soft teaser blur (aligns with trial UX / toast when props disagree with entitlement).
   */
  suppressInsightTeaserBlur?: boolean
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
  insightFreemiumLocked = false,
  isTeaser = false,
  suppressInsightTeaserBlur = false,
}: AICoachPromptProps) {
  const [isOnline, setIsOnline] = useState(true)
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
    trigger === 'morning_before' ||
    trigger === 'morning_after' ||
    trigger === 'emergency' ||
    trigger === 'profile'

  const insightTypeForFeedback = TRIGGER_TO_INSIGHT_TYPE[trigger]

  const rawFiltered = scrubGenericSynthesisTransitions(
    stripRedundantLeadingHeadings(filterInsightLabels(message ?? ''))
  )
  const eveningSplit =
    trigger === 'evening_after' && !eveningCoachStreaming
      ? splitEveningCoachMessage(rawFiltered)
      : { body: rawFiltered, goodnight: null as string | null }

  const teaserMorningTriggers = trigger === 'morning_before' || trigger === 'morning_after'
  const vaultEligible =
    insightFreemiumLocked &&
    !isTeaser &&
    !auditStreaming &&
    !eveningCoachStreaming &&
    (trigger === 'morning_before' || trigger === 'morning_after' || trigger === 'evening_after')

  const teaserEligible =
    !suppressInsightTeaserBlur &&
    isTeaser &&
    insightFreemiumLocked &&
    teaserMorningTriggers &&
    !auditStreaming &&
    !eveningCoachStreaming

  const markdownBlock =
    trigger === 'evening_after' && eveningSplit.goodnight ? (
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
    )

  const insightLockedBody = vaultEligible ? (
      <div className="relative isolate min-h-[150px] overflow-visible">
        <div className="pointer-events-none select-none opacity-40 blur-[8px]" aria-hidden>
          {markdownBlock}
        </div>
        <div className="absolute inset-0 z-[50] flex min-h-[150px] flex-col items-center justify-center gap-3 rounded-lg border border-slate-200/80 bg-gradient-to-br from-indigo-950/95 via-indigo-900/92 to-slate-950/95 px-4 py-5 text-center shadow-inner backdrop-blur-[2px] dark:border-slate-600/70">
          <p className="max-w-sm text-sm font-semibold leading-snug text-white">
            Mrs. Deer has a strategic insight for you. Upgrade to Pro to unlock.
          </p>
          <Link href="/pricing" className={viewProPlansCtaClassName}>
            View Pro plans
          </Link>
        </div>
      </div>
    ) : teaserEligible ? (
      <InsightTeaserBlur message={rawFiltered} markdownRemainder />
    ) : (
      markdownBlock
    )

  const body = (
    <div className={cn('space-y-3', (vaultEligible || teaserEligible) && 'min-h-[80px]')}>
      {topSlot ? <div className="pb-1">{topSlot}</div> : null}
      <div className="flex flex-wrap items-center gap-2">
        <Sparkles className="w-5 h-5 flex-shrink-0" style={{ color: '#FBBF24' }} />
        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 font-medium">
          {CONTEXT_LABELS[trigger]}
        </span>
        {teaserEligible ? (
          <Link
            href="/pricing"
            className={cn(
              'cursor-pointer transition hover:scale-105 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-950',
              PRO_GATE_BADGE_SURFACE_CLASS,
            )}
            title="Preview — upgrade for the full strategic review"
            aria-label="Upgrade to Pro — view plans"
          >
            Pro
          </Link>
        ) : null}
      </div>
      {insightLockedBody}
    </div>
  )

  const calibrationInsideCard =
    (trigger === 'morning_after' || trigger === 'emergency') &&
    insightId &&
    insightTypeForFeedback &&
    !auditStreaming &&
    !insightFreemiumLocked &&
    !isTeaser ? (
      <CalibrationRow
        insightId={insightId}
        insightType={insightTypeForFeedback}
        toneAdjustLocked={toneAdjustLocked}
      />
    ) : null

  const morningSparkCardClass = cn(
    MORNING_INSIGHT_SURFACE,
    (vaultEligible || teaserEligible) && 'min-h-[150px] opacity-100',
    showDebugTools && vaultEligible && 'ring-2 ring-red-500 ring-offset-2 ring-offset-amber-50 dark:ring-offset-amber-950/30',
  )

  return (
    <div
      className={cn(
        'relative w-full mb-8 overflow-visible',
        morningSparkSurface && 'min-h-[150px]',
        vaultEligible ? 'z-[1] isolate opacity-100' : teaserEligible ? 'z-[1] isolate' : 'z-0',
        showDebugTools && vaultEligible && 'ring-4 ring-fuchsia-500 ring-offset-4 ring-offset-white dark:ring-offset-gray-950',
      )}
    >
      {!isOnline && (
        <div className="mb-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-[#f8f4f0] dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 text-sm">
          <WifiOff className="w-4 h-4 flex-shrink-0" />
          AI insights require internet connection
        </div>
      )}
      {morningSparkSurface ? (
        <div className={morningSparkCardClass}>
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
