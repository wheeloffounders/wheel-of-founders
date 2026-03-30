'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

export type ArchetypeBreakdownProps = {
  breakdown: {
    signals: Array<{
      name: string
      contribution: number
      description: string
      archetypeBoost: string
      details?: string
    }>
    totalConfidence: number
    explanation: string
  }
  primaryArchetype: {
    label: string
    icon: string
  }
  /** `preview`: 21–29d — top signals only, softer framing. `full`: 30+ days. */
  mode?: 'full' | 'preview'
}

function normalizeSignals(
  raw: ArchetypeBreakdownProps['breakdown']['signals'] | null | undefined
): ArchetypeBreakdownProps['breakdown']['signals'] {
  if (!Array.isArray(raw)) return []
  return raw.filter(
    (s): s is NonNullable<typeof s> =>
      s != null && typeof s === 'object' && typeof (s as { name?: unknown }).name === 'string'
  ) as ArchetypeBreakdownProps['breakdown']['signals']
}

export function ArchetypeBreakdown({ breakdown, mode = 'full' }: ArchetypeBreakdownProps) {
  const isPreview = mode === 'preview'
  const signalsList = normalizeSignals(breakdown?.signals)
  const signals = isPreview ? signalsList.slice(0, 2) : signalsList

  const totalConf = breakdown?.totalConfidence ?? 0
  const confidencePhrase =
    totalConf >= 80
      ? 'Pattern is emerging clearly'
      : totalConf >= 45
        ? 'Your pattern is taking shape'
        : 'The signal is still forming'

  return (
    <Card
      className={`mt-6 w-full max-w-none ${isPreview ? 'opacity-95 border-dashed border-amber-200/80 dark:border-amber-900/40' : ''}`}
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2 flex-wrap">
          <span>🔍</span>
          <span>{isPreview ? 'Dominant tendencies (preview)' : 'Your Archetype Was Determined By'}</span>
          {isPreview ? (
            <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-100">
              Emerging
            </span>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 w-full max-w-3xl">
        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          {breakdown?.explanation ?? ''}
        </p>

        <div className="space-y-4">
          {signals.map((signal, i) => (
            <div
              key={`${signal.name}-${i}`}
              className="space-y-2 border-b border-gray-100 dark:border-gray-800 pb-4 last:border-0 last:pb-0"
            >
              <div className="flex flex-wrap items-center gap-2 gap-y-1">
                <span className="font-medium text-gray-900 dark:text-white">{signal.name || 'Signal'}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
                  {(signal.contribution ?? 0) >= 70
                    ? 'Strong influence'
                    : (signal.contribution ?? 0) >= 40
                      ? 'Steady influence'
                      : 'Developing influence'}{' '}
                  · {signal.archetypeBoost ?? ''}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                {signal.description ?? ''}
              </p>
              <Progress value={signal.contribution ?? 0} max={100} className="h-1.5" />
              {signal.details ? (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{signal.details}</p>
              ) : null}
            </div>
          ))}
        </div>

        <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Pattern strength</span>
            <span className="text-sm text-gray-600 dark:text-gray-300">{confidencePhrase}</span>
          </div>
          <Progress value={breakdown?.totalConfidence ?? 0} max={100} className="h-2 mt-1" />
        </div>
      </CardContent>
    </Card>
  )
}

