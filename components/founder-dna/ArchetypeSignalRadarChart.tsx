'use client'

import { cn } from '@/components/ui/utils'

export type ArchetypeRadarAxis = {
  name: string
  value: number
}

type ArchetypeSignalRadarChartProps = {
  axes: ArchetypeRadarAxis[]
  /** Freemium: faint polygon silhouette + blur veil over labels. */
  locked?: boolean
  className?: string
}

const SIZE = 240
const CX = SIZE / 2
const CY = SIZE / 2
const MAX_R = 88
const GRID_LEVELS = [0.25, 0.5, 0.75, 1]

function polarPoint(angleIndex: number, count: number, radius: number): { x: number; y: number } {
  const angleDeg = (360 / count) * angleIndex
  const angleRad = ((angleDeg - 90) * Math.PI) / 180
  return {
    x: CX + radius * Math.cos(angleRad),
    y: CY + radius * Math.sin(angleRad),
  }
}

function polygonPoints(values: number[], count: number): string {
  return values
    .map((v, i) => {
      const r = (Math.max(0, Math.min(100, v)) / 100) * MAX_R
      const { x, y } = polarPoint(i, count, r)
      return `${x},${y}`
    })
    .join(' ')
}

/**
 * Founder DNA signal radar — polygon silhouette teased under freemium blur.
 */
export function ArchetypeSignalRadarChart({ axes, locked = false, className }: ArchetypeSignalRadarChartProps) {
  const count = Math.max(axes.length, 3)
  const padded = [...axes]
  while (padded.length < count) {
    padded.push({ name: '', value: 0 })
  }

  const values = padded.map((a) => a.value)
  const dataPoints = polygonPoints(values, count)
  const gridPolygons = GRID_LEVELS.map((level) =>
    polygonPoints(
      padded.map(() => level * 100),
      count
    )
  )

  return (
    <div className={cn('relative mx-auto w-full max-w-[280px]', className)}>
      <div className="relative aspect-square w-full">
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="h-full w-full overflow-visible"
          role="img"
          aria-label={locked ? 'Archetype signal shape preview' : 'Archetype signal radar chart'}
        >
          {gridPolygons.map((pts, i) => (
            <polygon
              key={`grid-${i}`}
              points={pts}
              fill="none"
              stroke="currentColor"
              strokeWidth={1}
              className={cn(
                'text-slate-200/90 dark:text-slate-600/80',
                locked && 'opacity-30'
              )}
            />
          ))}
          {padded.map((_, i) => {
            const outer = polarPoint(i, count, MAX_R)
            return (
              <line
                key={`axis-${i}`}
                x1={CX}
                y1={CY}
                x2={outer.x}
                y2={outer.y}
                stroke="currentColor"
                strokeWidth={1}
                className={cn(
                  'text-slate-200/90 dark:text-slate-600/80',
                  locked && 'opacity-30'
                )}
              />
            )
          })}
          <polygon
            points={dataPoints}
            fill="currentColor"
            fillOpacity={locked ? 0.35 : 0.2}
            stroke="currentColor"
            strokeWidth={2}
            strokeLinejoin="round"
            className={cn(
              'text-[#152b50]/80 dark:text-sky-300/90',
              locked && 'opacity-30'
            )}
          />
        </svg>

        <div
          className={cn(
            'pointer-events-none absolute inset-0',
            locked && 'opacity-0'
          )}
        >
          {padded.map((axis, i) => {
            if (!axis.name) return <span key={`lbl-${i}`} />
            const labelR = MAX_R + 22
            const { x, y } = polarPoint(i, count, labelR)
            const leftPct = (x / SIZE) * 100
            const topPct = (y / SIZE) * 100
            return (
              <span
                key={`${axis.name}-${i}`}
                className="absolute max-w-[5.5rem] -translate-x-1/2 -translate-y-1/2 text-center text-[10px] font-medium leading-tight text-slate-600 dark:text-slate-300"
                style={{ left: `${leftPct}%`, top: `${topPct}%` }}
              >
                <span className="block truncate">{axis.name}</span>
                {!locked ? (
                  <span className="text-[9px] font-normal text-slate-400 dark:text-slate-500">{axis.value}%</span>
                ) : null}
              </span>
            )
          })}
        </div>
      </div>

      {locked ? (
        <div
          className="pointer-events-none absolute inset-0 rounded-2xl backdrop-blur-[4px] bg-white/40 dark:bg-gray-900/35"
          aria-hidden
        />
      ) : null}
    </div>
  )
}
