'use client'

import { Wrench } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { colors } from '@/lib/design-tokens'
import type { CarriedStrength } from '@/lib/quarterly/buildQuarterlyNarrative'

interface WhatYouCarriedForwardProps {
  strengths: CarriedStrength[]
  primaryGoalText?: string | null
}

export function WhatYouCarriedForward({ strengths, primaryGoalText }: WhatYouCarriedForwardProps) {
  const g = primaryGoalText?.trim()
  const lead = g
    ? `This quarter didn’t just give you progress on “${g.slice(0, 80)}${g.length > 80 ? '…' : ''}.” It gave you new ways of being:`
    : 'This quarter didn’t just give you output. It gave you new ways of being:'

  return (
    <Card
      className="border-t border-gray-200 dark:border-gray-700"
      highlighted
      style={{ borderLeft: `3px solid ${colors.coral.DEFAULT}` }}
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[#152b50] dark:text-slate-100">
          <Wrench className="w-5 h-5" style={{ color: colors.emerald.DEFAULT }} />
          What You Carried Forward
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-gray-800 dark:text-gray-200 leading-relaxed">{lead}</p>
        {strengths.map((s, i) => (
          <div key={i} className="space-y-2">
            <p className="font-semibold text-gray-900 dark:text-gray-100">
              You learned to {s.title}.
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{s.detail}</p>
          </div>
        ))}
        <p className="text-sm text-gray-700 dark:text-gray-300 pt-2 border-t border-gray-200 dark:border-gray-700">
          These aren&apos;t just skills. They&apos;re how you&apos;ll build the next 90 days differently.
        </p>
      </CardContent>
    </Card>
  )
}
