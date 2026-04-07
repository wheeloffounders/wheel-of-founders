'use client'

import type { ReactNode } from 'react'
import { format, parseISO } from 'date-fns'
import { Flame, Mountain, Shield, Target } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { colors, spacing } from '@/lib/design-tokens'
import { EmptyEvening } from '@/components/evening/EmptyEvening'
import { EVENING_STACK_SCROLL_FADE } from '@/lib/evening/evening-card-scroll'
import type { DraftSaveStatus } from '@/lib/hooks/useDebouncedAutoSave'

const SAGE = '#5A7D66'
const HOT_SEV = '#FF4D4D'
const WARM_SEV = '#FFBF00'

export type EveningEmergencyRow = {
  id: string
  description: string
  severity: 'hot' | 'warm' | 'contained'
  resolved: boolean
}

function severityStyle(sev: EveningEmergencyRow['severity']) {
  if (sev === 'hot') return { color: HOT_SEV, bg: 'bg-red-50/80 dark:bg-red-950/30' }
  if (sev === 'warm') return { color: WARM_SEV, bg: 'bg-amber-50/50 dark:bg-amber-950/20' }
  return { color: SAGE, bg: 'bg-emerald-50/50 dark:bg-emerald-950/20' }
}

type Props = {
  isMobile: boolean
  reviewDate: string
  draftSaveStatus: DraftSaveStatus
  eveningCrisisContext: { resolvedCount: number; tomorrowDebt: number }
  loopStrainTip: boolean
  hasPlanRealityData: boolean
  taskRows: ReactNode
  emergencies: EveningEmergencyRow[]
}

export function EveningPlanVsReality({
  isMobile,
  reviewDate,
  draftSaveStatus,
  eveningCrisisContext,
  loopStrainTip,
  hasPlanRealityData,
  taskRows,
  emergencies,
}: Props) {
  const auditDateLabel = format(parseISO(`${reviewDate}T12:00:00`), 'MMMM d, yyyy')
  const auditTitle = `Daily Audit: ${auditDateLabel} — Extracting the Gold`
  const auditSubtitle = "Intent meets reality. Let's capture the progress and the pivots."

  const emergencyBlock = (
    <>
      {emergencies.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">No fires logged for this day.</p>
      ) : (
        <ul className="space-y-3" role="list">
          {emergencies.map((e) => {
            const st = severityStyle(e.severity)
            return (
              <li
                key={e.id}
                className={`min-w-0 max-w-full rounded-xl border border-gray-200/90 px-3 py-3 dark:border-gray-600 ${st.bg}`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="text-[11px] font-bold uppercase tracking-wide"
                    style={{ color: st.color }}
                  >
                    {e.severity}
                  </span>
                  {e.resolved ? (
                    <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                      Contained
                    </span>
                  ) : (
                    <span className="text-[11px] font-medium text-gray-600 dark:text-gray-300">
                      Open
                    </span>
                  )}
                </div>
                <p className="mt-1.5 min-w-0 break-words text-sm leading-snug text-gray-900 dark:text-gray-100">
                  {e.description}
                </p>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )

  const crisisBanner =
    eveningCrisisContext.resolvedCount > 0 ? (
      <div className="mt-2 flex flex-col gap-2 rounded-xl border border-emerald-200/90 bg-emerald-50/50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/30">
        <div className="flex flex-wrap items-center gap-2">
          <Shield className="h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-300" aria-hidden />
          <span className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">Crisis handled</span>
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200">
            {eveningCrisisContext.resolvedCount} contained
          </span>
        </div>
        <p className="text-sm leading-relaxed text-emerald-900/90 dark:text-emerald-100/90">
          You moved through an active fire today. Take a breath—this reflection is where the nervous system settles
          back into normal mode.
        </p>
        {eveningCrisisContext.tomorrowDebt > 0 ? (
          <p className="text-xs text-emerald-800/85 dark:text-emerald-200/85">
            {eveningCrisisContext.tomorrowDebt} task{eveningCrisisContext.tomorrowDebt === 1 ? '' : 's'} from this day
            are waiting on tomorrow&apos;s plan (sidelines during the fire). Mrs. Deer may ask if you want to tackle
            those first in the morning.
          </p>
        ) : null}
      </div>
    ) : null

  const headerIntro = (
    <>
      <CardTitle className="flex flex-wrap items-center gap-2 text-gray-900 dark:text-white">
        <Mountain className="w-5 h-5" style={{ color: colors.emerald.DEFAULT }} />
        {auditTitle}
        {draftSaveStatus === 'syncing' ? (
          <span className="text-xs font-normal text-gray-500 dark:text-gray-400">Syncing…</span>
        ) : null}
        {draftSaveStatus === 'saved' ? (
          <span className="text-xs font-normal text-emerald-600 dark:text-emerald-400">Draft saved</span>
        ) : null}
        {draftSaveStatus === 'error' ? (
          <span className="text-xs font-normal text-amber-600 dark:text-amber-400">
            Could not sync — check connection
          </span>
        ) : null}
      </CardTitle>
      <p className="text-sm mt-1.5 text-gray-600 dark:text-gray-300">{auditSubtitle}</p>
      {crisisBanner}
    </>
  )

  if (!hasPlanRealityData) {
    return (
      <Card
        id="evening-form"
        highlighted
        className="mb-8"
        style={{ marginBottom: spacing['2xl'], borderLeft: `3px solid ${colors.navy.DEFAULT}` }}
      >
        <CardHeader
          style={{
            paddingLeft: spacing.lg,
            paddingRight: spacing.lg,
            paddingTop: spacing.md,
            paddingBottom: spacing.lg,
          }}
        >
          {headerIntro}
        </CardHeader>
        <CardContent style={{ padding: spacing['xl'] }}>
          <EmptyEvening />
        </CardContent>
      </Card>
    )
  }

  if (isMobile) {
    return (
      <Card
        id="evening-form"
        highlighted
        className="mb-8"
        style={{ marginBottom: spacing['2xl'], borderLeft: `3px solid ${colors.navy.DEFAULT}` }}
      >
        <CardHeader
          style={{
            paddingLeft: spacing.lg,
            paddingRight: spacing.lg,
            paddingTop: spacing.md,
            paddingBottom: spacing.lg,
          }}
        >
          {headerIntro}
        </CardHeader>
        <CardContent className="flex flex-col gap-0" style={{ padding: spacing['xl'] }}>
          {loopStrainTip ? (
            <div
              className="mb-2 flex gap-3 rounded-xl border border-red-200/90 bg-red-50/90 p-4 dark:border-red-900/50 dark:bg-red-950/25"
              role="status"
            >
              <Target className="h-5 w-5 shrink-0 text-red-700 dark:text-red-300" aria-hidden />
              <p className="text-sm font-medium leading-relaxed text-red-900 dark:text-red-100">
                🎯 A major shift occurred today. Let&apos;s account for that in tomorrow&apos;s plan.
              </p>
            </div>
          ) : null}

          <div className="rounded-xl border border-gray-200/80 bg-white/50 dark:border-gray-700 dark:bg-gray-900/40">
            <div className="border-b border-gray-200/80 px-4 py-3 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-[#152B50] dark:text-sky-200">Today&apos;s history</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Your plan and what actually happened</p>
            </div>
            <div className="min-w-0 space-y-6 p-4">
              <section aria-labelledby="evening-intent-m" className="min-w-0">
                <div className="mb-3 flex items-center gap-2">
                  <Mountain className="h-4 w-4" style={{ color: colors.navy.DEFAULT }} aria-hidden />
                  <h4 id="evening-intent-m" className="text-sm font-semibold text-gray-900 dark:text-white">
                    The intent
                  </h4>
                </div>
                {taskRows}
              </section>
              <div className="border-t border-dashed border-gray-300 dark:border-gray-600" />
              <section aria-labelledby="evening-friction-m" className="min-w-0">
                <div className="mb-3 flex items-center gap-2">
                  <Flame className="h-4 w-4" style={{ color: colors.coral.DEFAULT }} aria-hidden />
                  <h4 id="evening-friction-m" className="text-sm font-semibold text-gray-900 dark:text-white">
                    The friction
                  </h4>
                </div>
                <div className={EVENING_STACK_SCROLL_FADE}>{emergencyBlock}</div>
              </section>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      id="evening-form"
      highlighted
      className="mb-8"
      style={{ marginBottom: spacing['2xl'], borderLeft: `3px solid ${colors.navy.DEFAULT}` }}
    >
      <CardHeader
        style={{
          paddingLeft: spacing.lg,
          paddingRight: spacing.lg,
          paddingTop: spacing.md,
          paddingBottom: spacing.lg,
        }}
      >
        {headerIntro}
      </CardHeader>
      <CardContent style={{ padding: spacing['xl'] }}>
        {loopStrainTip ? (
          <div
            className="mb-2 flex gap-3 rounded-xl border border-red-200/90 bg-red-50/90 p-4 dark:border-red-900/50 dark:bg-red-950/25"
            role="status"
          >
            <Target className="h-5 w-5 shrink-0 text-red-700 dark:text-red-300" aria-hidden />
            <p className="text-sm font-medium leading-relaxed text-red-900 dark:text-red-100">
              🎯 A major shift occurred today. Let&apos;s account for that in tomorrow&apos;s plan.
            </p>
          </div>
        ) : null}

        <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
          <Card
            className="min-w-0 border border-gray-200/90 bg-white/70 shadow-sm dark:border-gray-700 dark:bg-gray-900/50"
            style={{ borderLeft: `4px solid ${colors.navy.DEFAULT}` }}
          >
            <CardHeader className="pb-2" style={{ padding: spacing.lg }}>
              <CardTitle className="flex items-center gap-2 text-base text-gray-900 dark:text-white">
                <Mountain className="h-5 w-5 shrink-0" style={{ color: colors.navy.DEFAULT }} />
                The intent
              </CardTitle>
              <p className="text-xs text-gray-500 dark:text-gray-400">Today&apos;s tasks</p>
            </CardHeader>
            <CardContent className="min-w-0 overflow-x-hidden" style={{ padding: spacing.lg, paddingTop: 0 }}>
              {taskRows}
            </CardContent>
          </Card>

          <Card
            className="min-w-0 border border-gray-200/90 bg-white/70 shadow-sm dark:border-gray-700 dark:bg-gray-900/50"
            style={{ borderLeft: `4px solid ${SAGE}` }}
          >
            <CardHeader className="pb-2" style={{ padding: spacing.lg }}>
              <CardTitle className="flex items-center gap-2 text-base text-gray-900 dark:text-white">
                <Flame className="h-5 w-5 shrink-0" style={{ color: colors.coral.DEFAULT }} />
                The friction
              </CardTitle>
              <p className="text-xs text-gray-500 dark:text-gray-400">Today&apos;s emergency logs</p>
            </CardHeader>
            <CardContent className="min-w-0 overflow-x-hidden" style={{ padding: spacing.lg, paddingTop: 0 }}>
              <div className={EVENING_STACK_SCROLL_FADE}>{emergencyBlock}</div>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  )
}
