'use client'

import { AlertTriangle } from 'lucide-react'
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts'
import type { FlowPathStep } from '@/lib/admin/flow-path-tags'
import { flowTagClass, formatDwellSeconds, formatMinutesToFirstMorning } from '@/lib/admin/flow-path-tags'
import type { ShadowArchetypeName } from '@/lib/admin/tracking'

const SHADOW_HEX: Record<ShadowArchetypeName, string> = {
  visionary: '#6366f1',
  builder: '#10b981',
  hustler: '#ef725c',
  strategist: '#152b50',
  hybrid: '#a855f7',
}

function shadowArchetypeTitle(shadow: ShadowArchetypeName): string {
  const map: Record<ShadowArchetypeName, string> = {
    visionary: 'Visionary',
    builder: 'Builder',
    hustler: 'Hustler',
    strategist: 'Strategist',
    hybrid: 'Hybrid',
  }
  return map[shadow] ?? shadow
}

/** First 3 letters of email local-part, or initials, for small-cohort dot labels. */
export function pulseDotLabelForChart(p: UserPulsePoint): string {
  const email = p.email?.trim()
  if (email && email.includes('@')) {
    const local = email.split('@')[0] ?? ''
    const lettersOnly = local.replace(/[^a-zA-Z]/g, '')
    if (lettersOnly.length >= 3) return lettersOnly.slice(0, 3).toUpperCase()
    const parts = local.split(/[._-]+/).filter((s) => s.length > 0)
    if (parts.length >= 2) {
      const a = parts[0]![0]
      const b = parts[1]![0]
      if (a && b) return `${a}${b}`.toUpperCase()
    }
    if (lettersOnly.length >= 1) return lettersOnly.slice(0, 3).toUpperCase()
  }
  return p.userId.replace(/-/g, '').slice(0, 3).toUpperCase()
}

export type UserPulsePoint = {
  userId: string
  email: string | null
  shadow: ShadowArchetypeName
  daysSinceSignup: number
  engagementScore: number
  lastAction?: string
  recentPath?: FlowPathStep[]
  calendarHook?: boolean
  /** Google OAuth only; distinct from ICS hook. */
  googleCalendarLinked?: boolean
  minutesToFirstMorningSave?: number | null
  lastDevice?: string
  profileTimezone?: string
  userLocalTime?: string
  signupBornLocal?: string
  firstMorningStartedLocal?: string
  signupLocalHour?: number | null
  firstMorningCommittedAt?: string | null
  profileCreatedAt?: string
}

type Props = {
  points: UserPulsePoint[]
  title?: string
  subtitle?: string
}

export function UserPulseChart({
  points,
  title = 'User pulse',
  subtitle = 'Engagement score vs days since signup — color = shadow archetype (early signal).',
}: Props) {
  const showHeader = Boolean(title) || Boolean(subtitle)
  const showDotLabels = points.length > 0 && points.length < 10
  const data = points.map((p) => ({
    ...p,
    fill: SHADOW_HEX[p.shadow] ?? SHADOW_HEX.hybrid,
    dotLabel: pulseDotLabelForChart(p),
  }))

  return (
    <div className="w-full">
      {showHeader ? (
        <>
          {title ? (
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{title}</h2>
          ) : null}
          {subtitle ? (
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">{subtitle}</p>
          ) : null}
        </>
      ) : null}
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart
            margin={{
              top: showDotLabels ? 28 : 16,
              right: 16,
              bottom: 8,
              left: 8,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" className="opacity-40" />
            <XAxis
              type="number"
              dataKey="daysSinceSignup"
              name="Days since signup"
              domain={['dataMin - 1', 'dataMax + 1']}
            />
            <YAxis type="number" dataKey="engagementScore" name="Engagement" domain={[0, 100]} />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const p = payload[0]?.payload as UserPulsePoint & { fill?: string }
                const archetype = shadowArchetypeTitle(p.shadow)
                return (
                  <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm shadow-lg max-w-[320px]">
                    <div className="font-medium truncate">{p.email ?? p.userId.slice(0, 8)}</div>
                    <div className="mt-1 font-semibold text-gray-900 dark:text-white">
                      Shadow archetype: <span className="text-[#152b50] dark:text-sky-300">{archetype}</span>
                    </div>
                    <div className="text-gray-700 dark:text-gray-200 mt-0.5">
                      Engagement score: <span className="font-medium">{p.engagementScore}</span>
                      <span className="text-gray-500 dark:text-gray-400"> / 100</span>
                    </div>
                    <div className="text-gray-600 dark:text-gray-300 text-xs mt-1">
                      Day {p.daysSinceSignup} since signup
                    </div>
                    {p.lastAction ? (
                      <div className="text-gray-500 dark:text-gray-400 text-xs mt-1 border-t border-gray-100 dark:border-gray-700 pt-1">
                        {p.lastAction}
                      </div>
                    ) : null}
                    {p.recentPath && p.recentPath.length > 0 ? (
                      <div className="text-gray-500 dark:text-gray-400 text-xs mt-1 border-t border-gray-100 dark:border-gray-700 pt-1">
                        <span className="font-medium text-gray-600 dark:text-gray-300">Recent path: </span>
                        <span className="inline-flex flex-wrap items-center gap-0.5 align-middle">
                          {p.recentPath.map((step, i) => (
                            <span key={`${p.userId}-tt-${i}`} className="inline-flex items-center">
                              {i > 0 ? <span className="mx-0.5 text-gray-400">→</span> : null}
                              <span
                                className={`inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] font-medium ${
                                  step.bypassed ? 'ring-1 ring-red-400/70' : ''
                                } ${flowTagClass(step.tag)}`}
                              >
                                {step.tag}
                                {formatDwellSeconds(step.dwellSeconds) ? (
                                  <span className="font-normal opacity-80">
                                    ({formatDwellSeconds(step.dwellSeconds)})
                                  </span>
                                ) : null}
                                {step.bypassed ? (
                                  <AlertTriangle className="h-2.5 w-2.5 text-red-500" aria-hidden />
                                ) : null}
                              </span>
                            </span>
                          ))}
                        </span>
                      </div>
                    ) : null}
                    {p.calendarHook ? (
                      <div className="text-xs mt-1 text-gray-600 dark:text-gray-300" aria-label="Calendar hook">
                        📅 Calendar hook
                      </div>
                    ) : null}
                    {p.minutesToFirstMorningSave != null ? (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Velocity: {formatMinutesToFirstMorning(p.minutesToFirstMorningSave)}
                      </div>
                    ) : null}
                  </div>
                )
              }}
            />
            <Scatter name="Users" data={data}>
              {showDotLabels ? (
                <LabelList
                  dataKey="dotLabel"
                  position="top"
                  offset={12}
                  content={(props: {
                    x?: number | string
                    y?: number | string
                    value?: unknown
                  }) => {
                    const x = typeof props.x === 'number' ? props.x : Number(props.x)
                    const y = typeof props.y === 'number' ? props.y : Number(props.y)
                    if (!Number.isFinite(x) || !Number.isFinite(y)) return <g />
                    const text = props.value == null ? '' : String(props.value)
                    return (
                      <text
                        x={x}
                        y={y}
                        dy={-14}
                        textAnchor="middle"
                        fontSize={10}
                        fontWeight={600}
                        className="fill-gray-800 dark:fill-gray-100"
                        style={{ pointerEvents: 'none' }}
                      >
                        {text}
                      </text>
                    )
                  }}
                />
              ) : null}
              {data.map((entry, i) => (
                <Cell key={`${entry.userId}-${i}`} fill={entry.fill} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <div
        className="mt-4 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50/80 dark:bg-gray-900/50 px-3 py-3"
        role="group"
        aria-label="Shadow archetype colors"
      >
        <div className="text-xs font-semibold text-gray-700 dark:text-gray-200 mb-2">
          Shadow archetype (dot color)
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {(Object.keys(SHADOW_HEX) as ShadowArchetypeName[]).map((k) => (
            <span
              key={k}
              className="inline-flex items-center gap-2 text-xs font-medium text-gray-800 dark:text-gray-200"
            >
              <span
                className="w-3.5 h-3.5 shrink-0 rounded-full ring-2 ring-white dark:ring-gray-800 shadow-sm"
                style={{ backgroundColor: SHADOW_HEX[k] }}
              />
              <span className="capitalize">{shadowArchetypeTitle(k)}</span>
              <span className="text-gray-500 dark:text-gray-400 font-normal">({k})</span>
            </span>
          ))}
        </div>
        {showDotLabels ? (
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
            Labels show email initials / first 3 letters (small cohort mode).
          </p>
        ) : null}
      </div>
    </div>
  )
}
