'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { ArchetypeSignalRadarChart } from '@/components/founder-dna/ArchetypeSignalRadarChart'
import { FounderDnaMatrixStaggerTeaser } from '@/components/founder-dna/FounderDnaMatrixStaggerTeaser'
import { FounderDnaTraitSliderRow } from '@/components/founder-dna/FounderDnaTraitSliderRow'
import { ArchetypeDiagnosisSummary } from '@/components/founder-dna/ArchetypeDiagnosisSummary'
import { cn } from '@/components/ui/utils'

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
  /** Freemium: teased radar + staggered signal rows (not flat lock overlay). */
  analyticsLocked?: boolean
  onUpgradeClick?: () => void
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

function influenceLabel(contribution: number): string {
  if (contribution >= 70) return 'Strong influence'
  if (contribution >= 40) return 'Steady influence'
  return 'Developing influence'
}

const BREAKDOWN_SHELL_CLASS =
  'bg-white p-6 rounded-xl shadow-md border border-slate-100/50 relative mt-6 w-full max-w-none dark:bg-gray-900/40 dark:border-slate-700/50'

function SignalRow({
  signal,
  thumbLocked,
  hideProStrategyCopy,
}: {
  signal: ArchetypeBreakdownProps['breakdown']['signals'][number]
  thumbLocked: boolean
  hideProStrategyCopy: boolean
}) {
  const contribution = signal.contribution ?? 0
  return (
    <div className="space-y-2 border-b border-gray-100 dark:border-gray-800 pb-4 last:border-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-2 gap-y-1">
        <span className="font-medium text-gray-900 dark:text-white">{signal.name || 'Signal'}</span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
          {influenceLabel(contribution)} · {signal.archetypeBoost ?? ''}
        </span>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{signal.description ?? ''}</p>
      <FounderDnaTraitSliderRow
        label="Signal weight"
        value={contribution}
        thumbLocked={thumbLocked}
        className="[&_span:first-child]:sr-only"
      />
      {signal.details && !hideProStrategyCopy ? (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{signal.details}</p>
      ) : null}
    </div>
  )
}

export function ArchetypeBreakdown({
  breakdown,
  primaryArchetype,
  mode = 'full',
  analyticsLocked = false,
  onUpgradeClick,
}: ArchetypeBreakdownProps) {
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

  const radarAxes = signals.map((s) => ({
    name: s.name || 'Signal',
    value: s.contribution ?? 0,
  }))

  const strongestSignal =
    signals.length > 0
      ? [...signals].sort((a, b) => (b.contribution ?? 0) - (a.contribution ?? 0))[0]
      : null

  const signalRows = signals.map((signal, i) => (
    <SignalRow
      key={`${signal.name}-${i}`}
      signal={signal}
      thumbLocked={analyticsLocked && i > 0}
      hideProStrategyCopy={analyticsLocked}
    />
  ))

  const content = (
    <Card
      className={cn(
        'w-full max-w-none border-0 shadow-none',
        isPreview ? 'opacity-95 border-dashed border-amber-200/80 dark:border-amber-900/40' : '',
        analyticsLocked ? 'bg-transparent' : 'mt-6'
      )}
    >
      <CardHeader className={analyticsLocked ? 'px-0 pt-0' : undefined}>
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
      <CardContent className={cn('space-y-5 w-full max-w-3xl', analyticsLocked ? 'px-0 pb-0' : undefined)}>
        <ArchetypeDiagnosisSummary
          explanation={breakdown?.explanation ?? ''}
          primaryLabel={primaryArchetype.label}
          strongestSignalName={strongestSignal?.name ?? null}
          locked={analyticsLocked}
          onUpgradeClick={onUpgradeClick}
        />

        {radarAxes.length > 0 ? (
          <div className="relative py-2">
            <ArchetypeSignalRadarChart axes={radarAxes} locked={analyticsLocked} />
          </div>
        ) : null}

        <FounderDnaMatrixStaggerTeaser
          locked={analyticsLocked}
          rows={signalRows}
          onUpgradeClick={onUpgradeClick}
          ctaLabel="Unlock Your Full Founder Identity Map"
        />

        <div
          className={cn(
            'mt-4 pt-3 border-t border-gray-200 dark:border-gray-700',
            analyticsLocked && 'pointer-events-none select-none blur-[2px] opacity-80'
          )}
        >
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Pattern strength</span>
            <span className="text-sm text-gray-600 dark:text-gray-300">{confidencePhrase}</span>
          </div>
          <Progress value={breakdown?.totalConfidence ?? 0} max={100} className="h-2 mt-1" />
        </div>
      </CardContent>
    </Card>
  )

  if (!analyticsLocked) return content

  return <div className={BREAKDOWN_SHELL_CLASS}>{content}</div>
}
