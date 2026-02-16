'use client'

import { useState } from 'react'
import Image from 'next/image'

export type AdaptivePattern = {
  kind: 'behavior' | 'coaching'
  patternType: string
  message: string
  suggestedAction: string
  ctaLabel?: string
  context?: string
}

interface MrsDeerAdaptivePromptProps {
  pattern: AdaptivePattern
  onDismiss: () => void
  onRecordShown: (patternType: string) => Promise<void>
}

/**
 * Mrs. Deer adaptive prompt: observes behavior/journal patterns and offers help or a tip.
 * No feedback form—either adapt the experience (e.g. Light Mode) or give a coaching tip.
 */
export function MrsDeerAdaptivePrompt({ pattern, onDismiss, onRecordShown }: MrsDeerAdaptivePromptProps) {
  const [acknowledged, setAcknowledged] = useState(false)

  const handleCta = async () => {
    if (pattern.suggestedAction === 'offer_light_mode') {
      // Store preference and redirect to morning with light mode (or set preference for next visit)
      await fetch('/api/user-preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planning_mode: 'light' }),
      }).catch(() => {})
      // User can go to morning to see 2-task template
    }
    await onRecordShown(pattern.patternType)
    setAcknowledged(true)
    setTimeout(onDismiss, 800)
  }

  const handleMaybeLater = async () => {
    await onRecordShown(pattern.patternType)
    onDismiss()
  }

  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-[#1A202C] dark:to-[#1A202C] rounded-xl shadow-lg p-6 mb-6 border border-amber-200 dark:border-amber-500/40">
      <div className="flex gap-4">
        <div className="flex-shrink-0">
          <Image
            src="/mrs-deer.png"
            alt="Mrs. Deer"
            width={48}
            height={48}
            className="w-12 h-12 object-contain rounded-full"
          />
        </div>
        <div className="flex-1 min-w-0">
          {acknowledged ? (
            <p className="text-gray-700 dark:text-gray-300">Got it. We’ll keep it in mind.</p>
          ) : (
            <>
              <p className="text-gray-800 dark:text-[#E2E8F0] leading-relaxed mb-4">
                {pattern.message}
              </p>
              <div className="flex flex-wrap gap-2">
                {(pattern.ctaLabel || pattern.suggestedAction === 'ack_only') && (
                  <button
                    type="button"
                    onClick={handleCta}
                    className="rounded-lg bg-[#152b50] px-4 py-2 text-sm font-medium text-white hover:bg-[#1a3a6b] dark:bg-[#ef725c] dark:hover:bg-[#f0886c]"
                  >
                    {pattern.ctaLabel || 'Got it'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleMaybeLater}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Maybe later
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
