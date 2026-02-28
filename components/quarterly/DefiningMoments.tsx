'use client'

import { Sparkles } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { colors } from '@/lib/design-tokens'

export interface DefiningMoment {
  text: string
  date?: string
}

interface DefiningMomentsProps {
  moments: DefiningMoment[]
  quarterLabel: string
}

export function DefiningMoments({ moments, quarterLabel }: DefiningMomentsProps) {
  if (moments.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-gray-700 dark:text-gray-300">
            Your defining moments will appear here as you add wins and lessons in your evening reviews.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card highlighted style={{ borderLeft: `3px solid ${colors.coral.DEFAULT}` }}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[#152b50] dark:text-slate-200">
          <Sparkles className="w-5 h-5" style={{ color: colors.amber.DEFAULT }} />
          Defining Moments
        </CardTitle>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          Key moments from {quarterLabel}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {moments.map((m, i) => (
          <div
            key={i}
            className="p-4 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700"
          >
            <p className="text-gray-900 dark:text-gray-100">{m.text}</p>
            {m.date && (
              <p className="text-xs mt-2 text-gray-700 dark:text-gray-300">{m.date}</p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
