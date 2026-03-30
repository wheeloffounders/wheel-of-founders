'use client'

import { Sparkles } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { MrsDeerAvatar } from '@/components/MrsDeerAvatar'
import { colors } from '@/lib/design-tokens'
import type { ShiftMonthBlock } from '@/lib/quarterly/buildQuarterlyNarrative'

interface HowTheShiftShowedUpProps {
  months: ShiftMonthBlock[]
}

export function HowTheShiftShowedUp({ months }: HowTheShiftShowedUpProps) {
  if (months.length === 0) {
    return null
  }

  return (
    <Card
      className="border-t border-gray-200 dark:border-gray-700"
      highlighted
      style={{ borderLeft: `3px solid ${colors.emerald.DEFAULT}` }}
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[#152b50] dark:text-slate-100">
          <Sparkles className="w-5 h-5" style={{ color: colors.amber.DEFAULT }} />
          How the Shift Showed Up
        </CardTitle>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          Mrs. Deer noticed how your quarter told a story — not just of building, but of becoming.
        </p>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="flex justify-start">
          <MrsDeerAvatar expression="encouraging" size="medium" />
        </div>
        {months.map((m) => (
          <section key={m.monthKey} className="space-y-3 border-t border-gray-200 dark:border-gray-700 pt-6 first:border-t-0 first:pt-0">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{m.heading}</h4>
            <ul className="list-disc pl-5 space-y-2 text-gray-800 dark:text-gray-200">
              {m.winSamples.map((text, i) => (
                <li key={i}>{text}</li>
              ))}
            </ul>
            <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300 border-l-2 pl-3" style={{ borderColor: colors.coral.DEFAULT }}>
              {m.revelation}
            </p>
          </section>
        ))}
      </CardContent>
    </Card>
  )
}
