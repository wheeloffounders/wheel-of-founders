'use client'

import { Lightbulb } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { colors } from '@/lib/design-tokens'
import type { SurpriseBlock } from '@/lib/quarterly/buildQuarterlyNarrative'

interface SurpriseTransformationProps {
  surprise: SurpriseBlock
}

export function SurpriseTransformation({ surprise }: SurpriseTransformationProps) {
  return (
    <Card
      className="border-t border-gray-200 dark:border-gray-700"
      highlighted
      style={{ borderLeft: `3px solid ${colors.amber.DEFAULT}` }}
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[#152b50] dark:text-slate-100">
          <Lightbulb className="w-5 h-5" style={{ color: colors.amber.DEFAULT }} />
          The One Thing That Surprised You
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-gray-800 dark:text-gray-200 leading-relaxed">
        <p className="text-sm text-gray-700 dark:text-gray-300">You might not have said it aloud, but something shifted this quarter:</p>
        <p className="font-medium text-gray-900 dark:text-gray-100">{surprise.headline}</p>
        <p>{surprise.body}</p>
        <p className="text-sm text-gray-700 dark:text-gray-300 italic">
          That&apos;s a quieter transformation — but it might be the one that matters most.
        </p>
      </CardContent>
    </Card>
  )
}
