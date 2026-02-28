'use client'

import { ArrowRight } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { colors } from '@/lib/design-tokens'

export interface TransformationPair {
  start: string
  now: string
}

interface TransformationPairsProps {
  pairs: TransformationPair[]
}

export function TransformationPairs({ pairs }: TransformationPairsProps) {
  if (pairs.length === 0) {
    return (
      <Card highlighted style={{ borderLeft: `3px solid ${colors.coral.DEFAULT}` }}>
        <CardContent className="py-12 text-center">
          <p className="text-gray-700 dark:text-gray-300">
            Add wins and lessons in your evening reviews to see your transformation pairs here.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card highlighted style={{ borderLeft: `3px solid ${colors.coral.DEFAULT}` }}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
          Your Month of Evolution
        </CardTitle>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          From where you started to where you are now
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {pairs.map((pair, i) => (
          <div
            key={i}
            className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
          >
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide mb-1 text-gray-700 dark:text-gray-300">
                Before
              </p>
              <p className="text-gray-900 dark:text-gray-100">{pair.start}</p>
            </div>
            <ArrowRight className="w-5 h-5 flex-shrink-0" style={{ color: colors.coral.DEFAULT }} />
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide mb-1 text-gray-700 dark:text-gray-300">
                Now
              </p>
              <p className="font-medium text-gray-900 dark:text-gray-100">{pair.now}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
