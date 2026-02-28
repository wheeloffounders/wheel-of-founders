'use client'

import { Sparkles } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { MrsDeerAvatar } from '@/components/MrsDeerAvatar'
import { MarkdownText } from '@/components/MarkdownText'
import { colors } from '@/lib/design-tokens'

interface TrajectoryWisdomProps {
  insight: string | null
  quarterLabel: string
  onRefresh?: () => void
  generating?: boolean
  generateError?: string | null
}

export function TrajectoryWisdom({ insight, quarterLabel, onRefresh, generating, generateError }: TrajectoryWisdomProps) {
  if (!insight) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          {generateError ? (
            <>
              <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-left">
                <p className="text-sm font-medium text-red-800 dark:text-red-200">AI insight failed</p>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1 font-mono">{generateError}</p>
              </div>
              {onRefresh && (
                <button
                  type="button"
                  onClick={onRefresh}
                  className="mt-4 text-sm font-medium text-red-600 dark:text-red-400 hover:underline"
                >
                  Try again
                </button>
              )}
            </>
          ) : (
            <>
              <p className="text-gray-900 dark:text-gray-100 dark:text-gray-100 leading-relaxed">
                {generating ? 'Mrs. Deer, your AI companion is reflecting on your quarter...' : 'You showed up this quarter. Every reflection adds to your trajectory. Click Refresh to generate your trajectory insight.'}
              </p>
              <div className="flex justify-center mt-4">
                <MrsDeerAvatar expression="thoughtful" size="large" />
              </div>
              {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={generating}
              aria-label="Refresh insight"
              className="mt-4 text-sm px-3 py-1.5 rounded-lg font-medium transition disabled:opacity-50"
              style={{ backgroundColor: colors.coral.DEFAULT, color: 'white' }}
            >
              {generating ? '…' : '↻ Refresh Insight'}
            </button>
          )}
            </>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card highlighted className="bg-amber-50 dark:bg-amber-900/30" style={{ borderLeft: `3px solid ${colors.coral.DEFAULT}` }}>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100 dark:text-white">
            <Sparkles className="w-6 h-6" style={{ color: colors.amber.DEFAULT }} />
            Mrs. Deer, your AI companion&apos;s Quarterly Reflection
          </CardTitle>
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={generating}
              aria-label="Refresh insight"
              className="text-sm px-3 py-1.5 rounded-lg font-medium transition disabled:opacity-50"
              style={{ backgroundColor: colors.coral.DEFAULT, color: 'white' }}
            >
              {generating ? '…' : '↻ Refresh Insight'}
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <div className="flex justify-start">
            <MrsDeerAvatar expression="thoughtful" size="large" />
          </div>
          <MarkdownText className="leading-relaxed text-gray-900 dark:text-gray-100 dark:text-gray-100">
            {insight}
          </MarkdownText>
        </div>
      </CardContent>
    </Card>
  )
}
