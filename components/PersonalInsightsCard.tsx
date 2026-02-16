'use client'

import { Sparkles, RefreshCw } from 'lucide-react'
import { useState } from 'react'

interface PersonalInsight {
  insight_text: string
  insight_type: string
  data_based_on: string
}

interface PersonalInsightsCardProps {
  insights: PersonalInsight[]
  title?: string
  subtitle?: string
  refreshable?: boolean
  onRefresh?: () => void
}

export function PersonalInsightsCard({
  insights,
  title = "Mrs. Deer's Personal Observations",
  subtitle = "Based on your unique patterns",
  refreshable = true,
  onRefresh,
}: PersonalInsightsCardProps) {
  const [refreshing, setRefreshing] = useState(false)

  const typeEmoji: Record<string, string> = {
    pattern: '📊',
    archetype: '🎯',
    nudge: '💡',
    prevention: '🛡️',
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
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-[#1A202C] dark:to-[#1A202C] rounded-xl shadow-lg p-6 mb-8 border border-amber-200 dark:border-amber-500/40">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-[#E2E8F0] flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-amber-600 dark:text-amber-300" />
            {title}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{subtitle}</p>
        </div>
        {refreshable && onRefresh && (
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-amber-600 dark:text-amber-300 hover:text-amber-700 dark:hover:text-amber-200 hover:bg-amber-100/70 dark:hover:bg-amber-500/10 rounded-lg transition disabled:opacity-50"
            title="Refresh insights"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        )}
      </div>

      {insights.length > 0 ? (
        <div className="space-y-4">
          {insights.map((insight, idx) => (
            <div
              key={idx}
              className="bg-white dark:bg-[#0F1419] rounded-lg p-5 border-l-4 border-amber-500 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5 text-2xl">
                  {typeEmoji[insight.insight_type] || '💡'}
                </div>
                <div className="flex-1">
                  <p className="text-gray-800 dark:text-[#E2E8F0] leading-relaxed mb-2">
                    {insight.insight_text}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                    {insight.data_based_on}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-[#0F1419] rounded-lg p-6 text-center border-2 border-dashed border-amber-300 dark:border-amber-500/50">
          <Sparkles className="w-12 h-12 text-amber-400 dark:text-amber-300 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-300 mb-2">
            Your personalized insights will appear tomorrow at 2 AM
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Mrs. Deer analyzes YOUR unique patterns and delivers personalized coaching just for you
          </p>
        </div>
      )}
    </div>
  )
}
