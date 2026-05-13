'use client'

import Link from 'next/link'
import type { PartialMealMetrics } from '@/lib/analysis-engine'
import { viewProPlansCtaClassName } from '@/lib/ui/view-pro-plans-cta'

type TrialPartialMealCardProps = {
  metrics: PartialMealMetrics | null
  loading?: boolean
}

/**
 * Day-7 style "partial meal": real counts only; interpretation stays behind the paywall.
 */
export function TrialPartialMealCard({ metrics, loading }: TrialPartialMealCardProps) {
  const decisions = metrics?.decisionLogsCount ?? 0
  const completedNm = metrics?.needleMoversCompleted ?? 0
  const presence = metrics?.presencePermitCount ?? 0
  const rate = metrics?.completionRatePercent ?? 0

  return (
    <div className="mb-8 rounded-2xl border border-[#152b50]/20 bg-gradient-to-br from-[#152b50] to-[#1e3a5f] p-6 text-white shadow-lg">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#fbbf77]">Trial summary</p>
      <h2 className="mt-2 text-xl font-bold leading-snug">Your week in volume and velocity</h2>
      {loading ? (
        <p className="mt-4 text-sm text-white/80">Pulling your signals…</p>
      ) : (
        <>
          <p className="mt-4 text-sm leading-relaxed text-white/90">
            You parked <span className="font-bold text-white">{decisions}</span> decisions in your log and completed{' '}
            <span className="font-bold text-white">{completedNm}</span> needle movers this week.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-white/85">
            Presence permits logged: <span className="font-semibold text-white">{presence}</span>
            {rate > 0 ? (
              <>
                {' '}
                · Needle-mover completion rate:{' '}
                <span className="font-semibold text-white">{rate}%</span>
              </>
            ) : null}
          </p>
          <p className="mt-5 rounded-lg border border-white/15 bg-white/10 px-4 py-3 text-sm leading-relaxed text-white/95">
            <span className="font-semibold text-[#fed7aa]">Status:</span> Your data shows a &apos;Context
            Whiplash&apos; pattern forming.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-white/85">
            You have a high execution-to-presence ratio, but your decision-to-action lag is increasing. Subscribe to
            see the specific 3 patterns causing this friction.
          </p>
          <Link href="/pricing" className={`mt-5 inline-flex w-full sm:w-auto ${viewProPlansCtaClassName} px-5 py-3`}>
            Subscribe to unlock the Full Analysis &amp; Pattern Radar
          </Link>
        </>
      )}
    </div>
  )
}
