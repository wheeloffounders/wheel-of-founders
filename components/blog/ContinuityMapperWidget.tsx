'use client'

import { useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import type {
  BlogInteractiveFunnelConfig,
  InteractiveFunnelId,
  LegacyContinuityDependence,
} from '@/lib/blog-interactive-funnels'
import { unlockBlogTrialGiftInSession } from '@/lib/blog-trial-gift-session'

type Phase = 'value' | 'depend' | 'spectrum' | 'summary'

type ContinuityMapperWidgetProps = {
  funnelId: InteractiveFunnelId
  config: BlogInteractiveFunnelConfig
}

const DEPEND_OPTIONS: {
  id: LegacyContinuityDependence
  title: string
  sub: string
}[] = [
  { id: 'crumble', title: 'Crumble completely.', sub: 'The Hero Gap' },
  { id: 'stable_gap', title: 'Stay stable but stop growing.', sub: 'The Guidance Gap' },
  { id: 'thrive', title: 'Continue thriving.', sub: 'The Legacy Goal' },
]

function computeContinuityScore(
  tier: LegacyContinuityDependence | null,
  todayFree: number,
  targetFree: number
): number {
  if (!tier) return 0
  const d = tier === 'crumble' ? 22 : tier === 'stable_gap' ? 52 : 82
  const sysLean = (todayFree + targetFree) / 2
  return Math.min(100, Math.round(d * 0.42 + sysLean * 0.58))
}

function blueprintCopy(
  tier: LegacyContinuityDependence,
  remembered: string
): { resultTitle: string; gapLabel: string; firstMove: string } {
  const v = remembered.trim() || 'your remembered impact'
  if (tier === 'crumble') {
    return {
      resultTitle: 'The Hero Gap',
      gapLabel:
        'You are in a high-dependence stage: the impact still routes through you as the hero. That is honest data—not a verdict.',
      firstMove:
        'Identify one Hero Process only you know how to run. This week, capture it as a Legacy Principle someone else can repeat without you in the room.',
    }
  }
  if (tier === 'stable_gap') {
    return {
      resultTitle: 'The Architect Transition',
      gapLabel: 'You are in the Founder-Guided stage: stable, but growth still waits on your signal.',
      firstMove: `Pick one Hero Process tied to your legacy focus—${v}—and turn it into a documented Legacy Principle the team can execute.`,
    }
  }
  return {
    resultTitle: 'The Legacy Thread',
    gapLabel:
      'You are closest to the Legacy Goal: impact has room to continue even when you step back. The work now is codification, not rescue.',
    firstMove:
      'Name one system that already runs without heroics and one that still secretly needs you—schedule the second for a Legacy Principle pass.',
  }
}

export function ContinuityMapperWidget({ funnelId, config }: ContinuityMapperWidgetProps) {
  const pathname = usePathname()
  const [phase, setPhase] = useState<Phase>('value')
  const [rememberedValue, setRememberedValue] = useState('')
  const [dependence, setDependence] = useState<LegacyContinuityDependence | null>(null)
  const [spectrumToday, setSpectrumToday] = useState(35)
  const [spectrum12m, setSpectrum12m] = useState(55)
  const [claiming, setClaiming] = useState(false)

  const continuityScore = useMemo(
    () => computeContinuityScore(dependence, spectrumToday, spectrum12m),
    [dependence, spectrumToday, spectrum12m]
  )

  const gaugeGradient = useMemo(() => {
    const pct = Math.max(0, Math.min(100, continuityScore))
    return `conic-gradient(from -90deg, #ef725c 0%, #5a9e7d ${pct}%, #e8ded8 ${pct}% 100%)`
  }, [continuityScore])

  const bp = dependence ? blueprintCopy(dependence, rememberedValue) : null

  const handleClaim = () => {
    if (!dependence || typeof window === 'undefined') return
    const rv = rememberedValue.trim()
    if (!rv) return
    setClaiming(true)
    const continuity_map = {
      remembered_value: rv,
      dependence_tier: dependence,
      succession_today: spectrumToday,
      succession_target_12m: spectrum12m,
      continuity_score: continuityScore,
    }
    const items = [
      `Legacy continuity: "${rv}" (${bp?.resultTitle ?? 'map'})`,
      `Succession spectrum: today ~${spectrumToday}% toward founder-free → ${spectrum12m}% goal in 12 months.`,
      `${bp?.firstMove ?? 'First legacy move: document one Legacy Principle this week.'}`,
    ]
    try {
      sessionStorage.setItem(
        'pending_plan',
        JSON.stringify({
          funnelId,
          handoffContext: config.handoffContext,
          continuityMapper: true,
          continuity_map,
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
  const showGauge = phase !== 'value'
  const canValue = rememberedValue.trim().length > 0
  const canDepend = dependence !== null

  return (
    <section className="my-10 rounded-[1.75rem] border border-[#e6d8d2] bg-gradient-to-br from-[#fffdfb] via-[#fdf8f5] to-[#f7f0eb] p-6 shadow-sm sm:p-8">
      <p className="text-xs font-bold uppercase tracking-wide text-[#ef725c]">{microPlannerLabel}</p>
      <h3 className="mt-2 text-xl font-semibold text-[#152b50]">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-[#5b4d46]">{subtitle}</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_160px] lg:items-start">
        <div className="space-y-6">
          {phase === 'value' && (
            <div className="rounded-2xl border border-[#f0dcd4] bg-white/80 p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wide text-[#8a6d62]">Step 1 — Core impact</p>
              <p className="mt-3 text-sm leading-relaxed text-[#4a3d38]">
                <span className="font-medium text-[#8a4a3a]">Mrs. Deer:</span> If your business disappeared tomorrow,
                what is the <strong>one</strong> thing people should miss most?
              </p>
              <textarea
                value={rememberedValue}
                onChange={(e) => setRememberedValue(e.target.value)}
                rows={3}
                placeholder='e.g. "The way we protect founder attention."'
                className="mt-3 w-full resize-y rounded-xl border border-[#e6d8d2] bg-white px-3 py-2.5 text-sm text-[#1e1e1e] outline-none transition focus:border-[#ef725c] focus:ring-2 focus:ring-[#ef725c]/20"
              />
              <button
                type="button"
                disabled={!canValue}
                onClick={() => setPhase('depend')}
                className="mt-4 inline-flex items-center justify-center rounded-xl bg-[#ef725c] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#e8654d] disabled:cursor-not-allowed disabled:opacity-45"
              >
                Continue
              </button>
            </div>
          )}

          {phase === 'depend' && (
            <div className="rounded-2xl border border-[#f0dcd4] bg-white/80 p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wide text-[#8a6d62]">Step 2 — Dependence check</p>
              <p className="mt-3 text-sm leading-relaxed text-[#4a3d38]">
                <span className="font-medium text-[#8a4a3a]">Mrs. Deer:</span> Right now, if you vanished for three
                months, would that impact…
              </p>
              <div className="mt-4 space-y-2" role="radiogroup" aria-label="Dependence if you vanished">
                {DEPEND_OPTIONS.map((o) => (
                  <label
                    key={o.id}
                    className={`flex cursor-pointer flex-col rounded-xl border px-4 py-3 text-left transition ${
                      dependence === o.id
                        ? 'border-[#ef725c] bg-[#fff3ef] ring-2 ring-[#ef725c]/20'
                        : 'border-[#e0cfc6] bg-white hover:border-[#ef725c]/45'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="dependence"
                        checked={dependence === o.id}
                        onChange={() => setDependence(o.id)}
                        className="mt-1 accent-[#ef725c]"
                      />
                      <span>
                        <span className="text-sm font-medium text-[#152b50]">{o.title}</span>
                        <span className="mt-0.5 block text-xs text-[#6a5a52]">{o.sub}</span>
                      </span>
                    </div>
                  </label>
                ))}
              </div>
              {dependence && (
                <p className="mt-4 text-sm leading-relaxed text-[#5b4d46]">
                  <span className="font-medium text-[#8a4a3a]">Mrs. Deer:</span> Noticing this clearly is how we move
                  from drama to design—systems over heroes starts with honest dependence data.
                </p>
              )}
              <button
                type="button"
                disabled={!canDepend}
                onClick={() => setPhase('spectrum')}
                className="mt-4 inline-flex items-center justify-center rounded-xl bg-[#ef725c] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#e8654d] disabled:cursor-not-allowed disabled:opacity-45"
              >
                Continue
              </button>
            </div>
          )}

          {(phase === 'spectrum' || phase === 'summary') && (
            <>
              <div className="rounded-2xl border border-[#f0dcd4] bg-white/80 p-5 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wide text-[#8a6d62]">Step 3 — Succession spectrum</p>
                <p className="mt-3 text-sm leading-relaxed text-[#4a3d38]">
                  <span className="font-medium text-[#8a4a3a]">Mrs. Deer:</span> Slide toward where you are{' '}
                  <em>today</em>—then where you want to be in <em>12 months</em>. Left is 100% founder-led; right is
                  founder-free legacy systems.
                </p>
                <div className="mt-5 space-y-5">
                  <div>
                    <div className="flex justify-between text-xs font-medium text-[#6a5a52]">
                      <span>100% founder-led</span>
                      <span className="text-[#152b50]">Today: {spectrumToday}% toward founder-free</span>
                      <span>Founder-free</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={spectrumToday}
                      onChange={(e) => setSpectrumToday(Number(e.target.value))}
                      className="mt-2 w-full accent-[#ef725c]"
                      aria-valuetext={`Today ${spectrumToday} percent toward founder free`}
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs font-medium text-[#6a5a52]">
                      <span>100% founder-led</span>
                      <span className="text-[#152b50]">12-month aim: {spectrum12m}% toward founder-free</span>
                      <span>Founder-free</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={spectrum12m}
                      onChange={(e) => setSpectrum12m(Number(e.target.value))}
                      className="mt-2 w-full accent-[#4a6fa5]"
                      aria-valuetext={`Twelve month target ${spectrum12m} percent toward founder free`}
                    />
                  </div>
                </div>
                {phase === 'spectrum' && (
                  <button
                    type="button"
                    onClick={() => setPhase('summary')}
                    className="mt-5 inline-flex items-center justify-center rounded-xl bg-[#ef725c] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#e8654d]"
                  >
                    See my continuity blueprint
                  </button>
                )}
              </div>

              {phase === 'summary' && bp && (
                <div className="rounded-2xl border border-[#f0dcd4] bg-[#fff9f6] px-5 py-5 shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-wide text-[#ef725c]">Legacy pillar</p>
                  <p className="mt-3 text-base font-semibold text-[#152b50]">Result: {bp.resultTitle}</p>
                  <p className="mt-2 text-sm leading-relaxed text-[#5b4d46]">
                    <span className="font-medium text-[#4a3d38]">Your legacy focus:</span>{' '}
                    <em>{rememberedValue.trim()}</em>
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-[#5b4d46]">
                    <span className="font-medium text-[#4a3d38]">Current gap:</span> {bp.gapLabel}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-[#5b4d46]">
                    <span className="font-medium text-[#8a4a3a]">First legacy move:</span> {bp.firstMove}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {showGauge && (
          <div className="flex flex-col items-center lg:items-end">
            <p className="mb-2 w-full text-center text-xs font-semibold uppercase tracking-wide text-[#8a6d62] lg:text-right">
              Continuity score
            </p>
            <div
              className="relative h-36 w-36 shrink-0 rounded-full p-[6px] shadow-inner transition-all duration-500"
              style={{ background: gaugeGradient }}
            >
              <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-[#fffdfb] px-3 text-center">
                <span className="text-2xl font-bold tabular-nums text-[#152b50]">{continuityScore}</span>
                <span className="mt-1 text-[10px] font-medium uppercase tracking-wide text-[#6a5a52]">
                  Systems → legacy
                </span>
              </div>
            </div>
            <p className="mt-3 max-w-[11rem] text-center text-[10px] leading-snug text-[#918076] lg:text-right">
              Higher when dependence eases and you slide toward founder-free design.
            </p>
          </div>
        )}
      </div>

      <p className="mt-6 text-xs leading-relaxed text-[#6a5a52]">{strategicSummary}</p>

      {phase === 'summary' && bp && (
        <button
          type="button"
          onClick={handleClaim}
          disabled={claiming}
          className="mt-5 inline-flex min-w-[260px] items-center justify-center rounded-xl bg-[#ef725c] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#e8654d] disabled:cursor-not-allowed disabled:opacity-45"
        >
          {claiming ? 'Saving…' : 'Integrate Legacy into my Daily OS'}
        </button>
      )}
    </section>
  )
}
