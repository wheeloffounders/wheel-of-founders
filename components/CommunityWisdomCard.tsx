'use client'

import { Users, RefreshCw } from 'lucide-react'
import { useState } from 'react'

interface CommunityInsight {
  insight_text: string
  stage: string
  pattern_type: string
  user_count: number
  confidence_score: number
  generated_at: string
}

interface CommunityWisdomCardProps {
  insights: CommunityInsight[]
  refreshable?: boolean
  onRefresh?: () => void
}

export function CommunityWisdomCard({
  insights,
  refreshable = true,
  onRefresh,
}: CommunityWisdomCardProps) {
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    if (!onRefresh) return
    setRefreshing(true)
    try {
      await onRefresh()
    } finally {
      setRefreshing(false)
    }
  }

  const formatStage = (stage: string): string => {
    return stage
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (l) => l.toUpperCase())
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-lg p-6 mb-8 border border-blue-200">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" />
            Community Wisdom
            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
              PRO
            </span>
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Insights from founders in similar stages—anonymized and aggregated
          </p>
        </div>
        {refreshable && onRefresh && (
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-100 rounded-lg transition disabled:opacity-50"
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
              className="bg-white rounded-lg p-5 border-l-4 border-blue-500 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5 text-2xl">👥</div>
                <div className="flex-1">
                  <p className="text-gray-800 leading-relaxed mb-2">{insight.insight_text}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded">
                      {formatStage(insight.stage)}
                    </span>
                    <span>Based on patterns from many founders</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg p-6 text-center border-2 border-dashed border-blue-300">
          <Users className="w-12 h-12 text-blue-400 mx-auto mb-3" />
          <p className="text-gray-600 mb-2">Community insights will appear after analysis</p>
          <p className="text-sm text-gray-500">
            Patterns are analyzed daily at 2-5 AM your local time
          </p>
        </div>
      )}
    </div>
  )
}
