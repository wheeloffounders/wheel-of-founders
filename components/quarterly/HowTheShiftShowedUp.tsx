'use client'

import { MrsDeerAvatar } from '@/components/MrsDeerAvatar'
import { InsightPeriodSection } from '@/components/insights/InsightPeriodSection'
import { colors } from '@/lib/design-tokens'
import type { ShiftMonthBlock } from '@/lib/quarterly/buildQuarterlyNarrative'
import type { InsightPeriodAccent } from '@/lib/insights/insight-period-card-styles'

interface HowTheShiftShowedUpProps {
  months: ShiftMonthBlock[]
  accent?: InsightPeriodAccent
}

export function HowTheShiftShowedUp({ months, accent = 'mood' }: HowTheShiftShowedUpProps) {
  if (months.length === 0) {
    return null
  }

  return (
    <InsightPeriodSection title="How the Shift Showed Up" accent={accent}>
      <p className="mb-6 text-sm text-gray-700 dark:text-gray-300">
        Mrs. Deer noticed how your quarter told a story — not just of building, but of becoming.
      </p>
      <div className="mb-6 flex justify-start">
        <MrsDeerAvatar expression="encouraging" size="medium" />
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-700/80">
        {months.map((m) => (
          <section key={m.monthKey} className="space-y-3 py-6 first:pt-0 last:pb-0">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{m.heading}</h4>
            <ul className="list-disc space-y-2 pl-5 text-gray-800 dark:text-gray-200">
              {m.winSamples.map((text, i) => (
                <li key={i}>{text}</li>
              ))}
            </ul>
            <p
              className="border-l-2 pl-3 text-sm leading-relaxed text-gray-700 dark:text-gray-300"
              style={{ borderColor: colors.coral.DEFAULT }}
            >
              {m.revelation}
            </p>
          </section>
        ))}
      </div>
    </InsightPeriodSection>
  )
}
