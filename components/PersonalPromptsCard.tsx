'use client'

import { Sparkles, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { format } from 'date-fns'
import { toNaturalStage } from '@/lib/mrs-deer'
import { MarkdownText } from './MarkdownText'

interface PersonalPrompt {
  prompt_text: string
  prompt_type: 'morning' | 'post_morning' | 'post_evening' | 'weekly' | 'monthly'
  stage_context: string | null
  generated_at: string
}

interface PersonalPromptsCardProps {
  prompts: PersonalPrompt[]
  refreshable?: boolean
  onRefresh?: () => void
}

export function PersonalPromptsCard({
  prompts,
  refreshable = true,
  onRefresh,
}: PersonalPromptsCardProps) {
  const [refreshing, setRefreshing] = useState(false)

  const promptIcons: Record<string, string> = {
    morning: '🌅',
    post_morning: '📋',
    post_evening: '🌙',
    weekly: '📊',
    monthly: '🎯',
  }

  const promptTitles: Record<string, string> = {
    morning: 'Morning Reflection',
    post_morning: 'Plan Insight',
    post_evening: 'Evening Reflection',
    weekly: 'Weekly Insights',
    monthly: 'Monthly Review',
  }

  const handleRefresh = async () => {
    if (!onRefresh) return
    setRefreshing(true)
    try {
      await onRefresh()
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-[#1A202C] dark:to-[#1A202C] rounded-xl shadow-lg p-6 mb-8 border border-purple-200 dark:border-purple-500/40">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-[#E2E8F0] flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-600 dark:text-purple-300" />
            Personal Coaching
            <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-200 rounded-full font-medium">
              PRO+
            </span>
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
            Mrs. Deer's personalized insights just for you
          </p>
        </div>
        {refreshable && onRefresh && (
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-purple-600 dark:text-purple-300 hover:text-purple-700 dark:hover:text-purple-200 hover:bg-purple-100/70 dark:hover:bg-purple-500/10 rounded-lg transition disabled:opacity-50"
            title="Refresh prompts"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        )}
      </div>

      {prompts.length > 0 ? (
        <div className="space-y-4">
          {prompts.map((prompt, idx) => (
            <div
              key={idx}
              className="bg-white dark:bg-[#0F1419] rounded-lg p-5 border-l-4 border-purple-500 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5 text-2xl">
                  {promptIcons[prompt.prompt_type] || '💡'}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-gray-900 dark:text-[#E2E8F0]">
                      {promptTitles[prompt.prompt_type]}
                    </h3>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {format(new Date(prompt.generated_at), 'MMM d')}
                    </span>
                  </div>
                  <MarkdownText className="text-gray-800 dark:text-[#E2E8F0] leading-relaxed mb-2">
                    {prompt.prompt_text}
                  </MarkdownText>
                  {prompt.stage_context && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                      Stage: {toNaturalStage(prompt.stage_context)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-[#0F1419] rounded-lg p-6 text-center border-2 border-dashed border-purple-300 dark:border-purple-500/50">
          <Sparkles className="w-12 h-12 text-purple-400 dark:text-purple-300 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-300 mb-2">Your personal prompts will appear here</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Pro+ includes: 3 daily prompts + weekly insights + monthly reviews
          </p>
        </div>
      )}
    </div>
  )
}
