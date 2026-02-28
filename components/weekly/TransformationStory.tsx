'use client'

import { ArrowRight } from 'lucide-react'
import { colors } from '@/lib/design-tokens'

interface TransformationPair {
  start: string
  now: string
}

interface TransformationStoryProps {
  pairs: TransformationPair[]
  insight?: string
}

export function TransformationStory({ pairs, insight }: TransformationStoryProps) {
  if (pairs.length === 0) return null

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        {pairs.map((pair, i) => (
          <div
            key={i}
            className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-4 border-2"
            style={{ borderColor: colors.navy.DEFAULT }}
          >
            <div className="flex-1">
              <p className="text-xs font-medium mb-1 text-gray-600 dark:text-gray-300">
                START
              </p>
              <p className="text-gray-900 dark:text-white">&quot;{pair.start}&quot;</p>
            </div>
            <ArrowRight className="w-5 h-5 shrink-0" style={{ color: colors.coral.DEFAULT }} />
            <div className="flex-1">
              <p className="text-xs font-medium mb-1 text-gray-600 dark:text-gray-300">
                NOW
              </p>
              <p className="text-gray-900 dark:text-white">&quot;{pair.now}&quot;</p>
            </div>
          </div>
        ))}
      </div>
      {insight && (
        <div className="p-4 border-l-4" style={{ borderColor: colors.coral.DEFAULT, backgroundColor: colors.amber.soft }}>
          <p className="text-sm italic text-gray-900 dark:text-white">
            {insight}
          </p>
        </div>
      )}
    </div>
  )
}
