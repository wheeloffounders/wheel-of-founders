'use client'

import { InsightPeriodSection } from '@/components/insights/InsightPeriodSection'
import type { CarriedStrength } from '@/lib/quarterly/buildQuarterlyNarrative'
import type { InsightPeriodAccent } from '@/lib/insights/insight-period-card-styles'

interface WhatYouCarriedForwardProps {
  strengths: CarriedStrength[]
  primaryGoalText?: string | null
  accent?: InsightPeriodAccent
}

export function WhatYouCarriedForward({ strengths, primaryGoalText, accent = 'reflection' }: WhatYouCarriedForwardProps) {
  const g = primaryGoalText?.trim()
  const lead = g
    ? `This quarter didn't just give you progress on "${g.slice(0, 80)}${g.length > 80 ? '…' : ''}." It gave you new ways of being:`
    : "This quarter didn't just give you output. It gave you new ways of being:"

  return (
    <InsightPeriodSection title="What You Carried Forward" accent={accent}>
      <p className="mb-6 leading-relaxed text-gray-800 dark:text-gray-200">{lead}</p>
      <ul className="divide-y divide-slate-100 dark:divide-slate-700/80">
        {strengths.map((s, i) => (
          <li key={i} className="space-y-2 py-4 first:pt-0 last:pb-0">
            <p className="font-semibold text-gray-900 dark:text-gray-100">You learned to {s.title}.</p>
            <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">{s.detail}</p>
          </li>
        ))}
      </ul>
      <p className="mt-6 border-t border-slate-100 pt-4 text-sm text-gray-700 dark:text-gray-300 dark:border-slate-700/80">
        These aren&apos;t just skills. They&apos;re how you&apos;ll build the next 90 days differently.
      </p>
    </InsightPeriodSection>
  )
}
