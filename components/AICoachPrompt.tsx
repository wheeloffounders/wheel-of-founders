'use client'

import { Sparkles } from 'lucide-react'
import Image from 'next/image'
import { MarkdownText } from './MarkdownText'

interface AICoachPromptProps {
  message: string
  onClose: () => void
  trigger: 'morning_before' | 'morning_after' | 'evening_after' | 'profile'
}

const TRIGGER_TITLES = {
  morning_before: 'Morning',
  morning_after: 'Plan Review',
  evening_after: 'Evening',
  profile: 'Profile',
}

const CONTEXT_LABELS: Record<AICoachPromptProps['trigger'], string> = {
  morning_before: 'Morning',
  morning_after: 'Plan Review',
  evening_after: 'Evening Reflection',
  profile: 'Profile Insight',
}

export function AICoachPrompt({ message, onClose, trigger }: AICoachPromptProps) {
  // Insights are permanent - no close functionality needed
  // The onClose prop is kept for component compatibility but does nothing

  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-[#1A202C] dark:to-[#1A202C] rounded-xl shadow-lg p-6 mb-8 border border-amber-200 dark:border-amber-500/40">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-[#E2E8F0] flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-amber-600 dark:text-amber-300" />
            {trigger === 'profile' ? "Mrs. Deer's Reflection" : "Founder's Lens: Today's Perspective"}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
            {trigger === 'profile' ? 'Based on your profile' : "Mrs. Deer's personalized insights just for you"}
          </p>
        </div>
        {/* Close button removed - insights are permanent */}
      </div>
      <div className="bg-white dark:bg-[#0F1419] rounded-lg p-5 border-l-4 border-amber-500 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-amber-50 dark:bg-[#0F1419] flex items-center justify-center overflow-hidden flex-shrink-0">
            <Image
              src="/mrs-deer.png"
              alt="Mrs. Deer"
              width={36}
              height={36}
              className="w-9 h-9 object-contain"
            />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 font-medium">
                {CONTEXT_LABELS[trigger]}
              </span>
            </div>
            <MarkdownText className="text-gray-800 dark:text-[#E2E8F0] leading-relaxed [&_p]:mb-2 [&_p:last-child]:mb-0">
              {message}
            </MarkdownText>
          </div>
        </div>
      </div>
    </div>
  )
}
