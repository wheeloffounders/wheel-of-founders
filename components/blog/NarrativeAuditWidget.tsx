'use client'

import { useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import type { BlogInteractiveFunnelConfig, InteractiveFunnelId } from '@/lib/blog-interactive-funnels'
import { unlockBlogTrialGiftInSession } from '@/lib/blog-trial-gift-session'

type UiPhase =
  | 'step1_pick'
  | 'step1_deer'
  | 'step2_pick'
  | 'step2_deer'
  | 'step3_pick'
  | 'step3_deer'
  | 'summary'

type DecisionWeight = 'heavy' | 'okay'
type GrowthMode = 'pure_maintenance' | 'some_growth'

const SLIDER_MIN = 16 * 60 // 4:00 PM
const SLIDER_MAX = 23 * 60 + 30 // 11:30 PM
const SLIDER_STEP = 30

function formatTime12h(totalMins: number): string {
  const h24 = Math.floor(totalMins / 60) % 24
  const m = totalMins % 60
  const period = h24 >= 12 ? 'PM' : 'AM'
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  return `${h12}:${m.toString().padStart(2, '0')} ${period}`
}

type NarrativeAuditWidgetProps = {
  funnelId: InteractiveFunnelId
  config: BlogInteractiveFunnelConfig
}

export function NarrativeAuditWidget({ funnelId, config }: NarrativeAuditWidgetProps) {
  const pathname = usePathname()
  const [phase, setPhase] = useState<UiPhase>('step1_pick')
  const [switchFlipMins, setSwitchFlipMins] = useState(18 * 60 + 30) // 6:30 PM default
  const [decisionWeight, setDecisionWeight] = useState<DecisionWeight | null>(null)
  const [growthMode, setGrowthMode] = useState<GrowthMode | null>(null)
  const [claiming, setClaiming] = useState(false)

  const switchLabel = useMemo(() => formatTime12h(switchFlipMins), [switchFlipMins])

  const riskProfile = useMemo(() => {
    if (!decisionWeight || !growthMode) return null
    const highWhisper = decisionWeight === 'heavy' || growthMode === 'pure_maintenance'
    const level = highWhisper ? 'High' : 'Medium'
    const stage = 'Whisper Stage'
    const primary = `Creeping Fatigue (${switchLabel})`
    const blocker =
      decisionWeight === 'heavy'
        ? 'Decision Residue'
        : growthMode === 'pure_maintenance'
          ? 'Maintenance Trap'
          : 'Hidden load'
    const firstMove =
      'Tomorrow, use a Laptop Shield for 30 minutes before checking Slack—protect your RAM before the inbox pulls you under.'
    return { level, stage, primary, blocker, firstMove }
  }, [decisionWeight, growthMode, switchLabel])

  const handleClaim = () => {
    if (!riskProfile || typeof window === 'undefined') return
    setClaiming(true)
    const audit_results = {
      switch_flip_label: switchLabel,
      switch_flip_minutes: switchFlipMins,
      decision_weight: decisionWeight,
      growth_vs_maintenance: growthMode,
    }
    const items = [
      `Early warning scan: switch flip ~${switchLabel} (creeping fatigue signal)`,
      decisionWeight === 'heavy'
        ? 'Decision weight: simple replies felt heavy (decision residue).'
        : 'Decision weight: inbox felt manageable today.',
      growthMode === 'pure_maintenance'
        ? 'Growth vs maintenance: mostly maintenance (maintenance trap).'
        : 'Growth vs maintenance: some real growth work mixed in.',
      `First move: Laptop Shield — 30 minutes before Slack tomorrow (${switchLabel} ritual anchor).`,
    ]
    try {
      sessionStorage.setItem(
        'pending_plan',
        JSON.stringify({
          funnelId,
          handoffContext: config.handoffContext,
          narrativeAudit: true,
          audit_results,
          items,
          capturedAt: new Date().toISOString(),
          source: pathname || '/blog',
        })
      )
      unlockBlogTrialGiftInSession()
      if (pathname?.startsWith('/blog')) {
        sessionStorage.setItem('last_blog_post', pathname)
      }
    } catch {
      // best effort
    }
    const q = new URLSearchParams()
    q.set('context', config.handoffContext)
    q.set('funnel', funnelId)
    window.location.assign(`/auth/signup?${q.toString()}`)
  }

  const { microPlannerLabel, title, subtitle, strategicSummary } = config

  return (
    <section className="my-10 rounded-[1.75rem] border border-[#e6d8d2] bg-gradient-to-br from-[#fffdfb] via-[#fdf8f5] to-[#f7f0eb] p-6 shadow-sm sm:p-8">
      <p className="text-xs font-bold uppercase tracking-wide text-[#ef725c]">{microPlannerLabel}</p>
      <h3 className="mt-2 text-xl font-semibold text-[#152b50]">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-[#5b4d46]">{subtitle}</p>

      <div className="mt-8 space-y-6">
        {(phase === 'step1_pick' || phase === 'step1_deer') && (
          <div className="rounded-2xl border border-[#f0dcd4] bg-white/80 p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-[#8a6d62]">Mrs. Deer</p>
            <p className="mt-3 text-sm leading-relaxed text-[#4a3d38]">
              Think about your last 7 days. What time does your &quot;Switch Flip&quot; hit—when motivation just
              disappears?
            </p>
            {phase === 'step1_pick' && (
              <>
                <div className="mt-5">
                  <div className="flex items-baseline justify-between gap-2 text-sm text-[#5b4d46]">
                    <span>Earlier day</span>
                    <span className="font-semibold text-[#152b50]">Around {switchLabel}</span>
                    <span>Late night</span>
                  </div>
                  <input
                    type="range"
                    min={SLIDER_MIN}
                    max={SLIDER_MAX}
                    step={SLIDER_STEP}
                    value={switchFlipMins}
                    onChange={(e) => setSwitchFlipMins(Number(e.target.value))}
                    className="mt-3 w-full accent-[#ef725c]"
                    aria-valuetext={`Switch flip around ${switchLabel}`}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setPhase('step1_deer')}
                  className="mt-5 inline-flex items-center justify-center rounded-xl bg-[#ef725c] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#e8654d]"
                >
                  Lock this time
                </button>
              </>
            )}
            {phase === 'step1_deer' && (
              <>
                <p className="mt-4 text-sm leading-relaxed text-[#5b4d46]">
                  <span className="font-medium text-[#8a4a3a]">Mrs. Deer:</span> That is earlier than many founders
                  admit out loud. It is usually a sign of <strong>decision residue</strong> building—not just sleep
                  hunger.
                </p>
                <button
                  type="button"
                  onClick={() => setPhase('step2_pick')}
                  className="mt-5 inline-flex items-center justify-center rounded-xl border border-[#e0cfc6] bg-white px-4 py-2.5 text-sm font-semibold text-[#4a3d38] transition hover:border-[#ef725c]/45"
                >
                  Continue
                </button>
              </>
            )}
          </div>
        )}

        {(phase === 'step2_pick' || phase === 'step2_deer') && (
          <div className="rounded-2xl border border-[#f0dcd4] bg-white/80 p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-[#8a6d62]">Mrs. Deer</p>
            <p className="mt-3 text-sm leading-relaxed text-[#4a3d38]">
              When you looked at your inbox today, did a simple Yes/No reply feel like lifting a twenty-pound weight?
            </p>
            {phase === 'step2_pick' && (
              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => {
                    setDecisionWeight('heavy')
                    setPhase('step2_deer')
                  }}
                  className="flex-1 rounded-xl border border-[#e0cfc6] bg-[#fff3ef] px-4 py-3 text-left text-sm font-medium text-[#7e3f2f] transition hover:border-[#ef725c]"
                >
                  Yes, it was heavy
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDecisionWeight('okay')
                    setPhase('step2_deer')
                  }}
                  className="flex-1 rounded-xl border border-[#e0cfc6] bg-white px-4 py-3 text-left text-sm font-medium text-[#4a3d38] transition hover:border-[#ef725c]/45"
                >
                  No, I am okay
                </button>
              </div>
            )}
            {phase === 'step2_deer' && decisionWeight && (
              <>
                <p className="mt-4 text-sm leading-relaxed text-[#5b4d46]">
                  <span className="font-medium text-[#8a4a3a]">Mrs. Deer:</span>{' '}
                  {decisionWeight === 'heavy' ? (
                    <>
                      That is the <strong>decision residue</strong> I write about in the article—your mental RAM is
                      full before the &quot;real&quot; work even starts.
                    </>
                  ) : (
                    <>
                      Good sign that light replies still feel light. We will still watch your{' '}
                      <strong>switch flip</strong>—fatigue can arrive before the inbox feels hard.
                    </>
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => setPhase('step3_pick')}
                  className="mt-5 inline-flex items-center justify-center rounded-xl border border-[#e0cfc6] bg-white px-4 py-2.5 text-sm font-semibold text-[#4a3d38] transition hover:border-[#ef725c]/45"
                >
                  Continue
                </button>
              </>
            )}
          </div>
        )}

        {(phase === 'step3_pick' || phase === 'step3_deer') && (
          <div className="rounded-2xl border border-[#f0dcd4] bg-white/80 p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-[#8a6d62]">Mrs. Deer</p>
            <p className="mt-3 text-sm leading-relaxed text-[#4a3d38]">
              Last one: did you actually <em>grow</em> the business today, or did you just keep it from breaking?
            </p>
            {phase === 'step3_pick' && (
              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => {
                    setGrowthMode('pure_maintenance')
                    setPhase('step3_deer')
                  }}
                  className="flex-1 rounded-xl border border-[#e0cfc6] bg-[#fff3ef] px-4 py-3 text-left text-sm font-medium text-[#7e3f2f] transition hover:border-[#ef725c]"
                >
                  Pure maintenance
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setGrowthMode('some_growth')
                    setPhase('step3_deer')
                  }}
                  className="flex-1 rounded-xl border border-[#e0cfc6] bg-white px-4 py-3 text-left text-sm font-medium text-[#4a3d38] transition hover:border-[#ef725c]/45"
                >
                  Some growth
                </button>
              </div>
            )}
            {phase === 'step3_deer' && growthMode && (
              <>
                <p className="mt-4 text-sm leading-relaxed text-[#5b4d46]">
                  <span className="font-medium text-[#8a4a3a]">Mrs. Deer:</span>{' '}
                  {growthMode === 'pure_maintenance' ? (
                    <>
                      <strong>Signal locked.</strong> You are in a <strong>Maintenance Trap</strong>—the system is
                      running to stand still. That is not a character flaw; it is a load problem.
                    </>
                  ) : (
                    <>
                      <strong>Signal noted.</strong> Even a little growth amid chaos counts. We will protect that
                      thread so maintenance does not swallow it tomorrow.
                    </>
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => setPhase('summary')}
                  className="mt-5 inline-flex items-center justify-center rounded-xl border border-[#e0cfc6] bg-white px-4 py-2.5 text-sm font-semibold text-[#4a3d38] transition hover:border-[#ef725c]/45"
                >
                  View my warning report
                </button>
              </>
            )}
          </div>
        )}

        {phase === 'summary' && riskProfile && (
          <div className="rounded-2xl border border-[#f0dcd4] bg-[#fff9f6] px-5 py-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-[#ef725c]">Personalized warning report</p>
            <p className="mt-3 text-base font-semibold text-[#152b50]">
              Your burnout risk:{' '}
              <span className="text-[#ef725c]">
                {riskProfile.level} ({riskProfile.stage})
              </span>
            </p>
            <ul className="mt-4 space-y-2 text-sm leading-relaxed text-[#5b4d46]">
              <li>
                <span className="font-medium text-[#4a3d38]">Primary signal:</span> {riskProfile.primary}
              </li>
              <li>
                <span className="font-medium text-[#4a3d38]">Blocker:</span> {riskProfile.blocker}
              </li>
              <li>
                <span className="font-medium text-[#4a3d38]">First move:</span> {riskProfile.firstMove}
              </li>
            </ul>
          </div>
        )}
      </div>

      <p className="mt-6 text-xs leading-relaxed text-[#6a5a52]">{strategicSummary}</p>

      {phase === 'summary' && (
        <button
          type="button"
          onClick={handleClaim}
          disabled={claiming}
          className="mt-5 inline-flex min-w-[240px] items-center justify-center rounded-xl bg-[#ef725c] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#e8654d] disabled:cursor-not-allowed disabled:opacity-45"
        >
          {claiming ? 'Saving…' : 'Claim My Early Warning Plan'}
        </button>
      )}
    </section>
  )
}
