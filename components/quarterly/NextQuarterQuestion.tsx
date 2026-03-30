'use client'

import { HelpCircle } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { colors } from '@/lib/design-tokens'
import type { GuidingQuestionBlock } from '@/lib/quarterly/buildQuarterlyNarrative'

interface NextQuarterQuestionProps {
  block: GuidingQuestionBlock
}

export function NextQuarterQuestion({ block }: NextQuarterQuestionProps) {
  return (
    <Card
      className="border-t border-gray-200 dark:border-gray-700"
      highlighted
      style={{ borderLeft: `3px solid ${colors.emerald.DEFAULT}` }}
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[#152b50] dark:text-slate-100">
          <HelpCircle className="w-5 h-5" style={{ color: colors.coral.DEFAULT }} />
          A Question for Next Quarter
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-gray-800 dark:text-gray-200 leading-relaxed">
        <p className="text-sm text-gray-700 dark:text-gray-300">The next 90 days, hold this question close:</p>
        <p className="text-lg font-semibold text-[#152b50] dark:text-amber-100/90">{block.question}</p>
        <p className="text-sm">{block.explain}</p>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          Let this question guide you when you&apos;re deciding what deserves your energy, what to say no to, and what to celebrate.
        </p>
      </CardContent>
    </Card>
  )
}
