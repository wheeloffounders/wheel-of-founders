'use client'

import { useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import type {
  BlogInteractiveFunnelConfig,
  FulfillmentHeavyFactor,
  InteractiveFunnelId,
} from '@/lib/blog-interactive-funnels'
import { unlockBlogTrialGiftInSession } from '@/lib/blog-trial-gift-session'

type Phase = 'external' | 'internal' | 'heavy' | 'summary'

type GapAnalyzerWidgetProps = {
  funnelId: InteractiveFunnelId
  config: BlogInteractiveFunnelConfig
}

const HEAVY_OPTIONS: { id: FulfillmentHeavyFactor; label: string }[] = [
  { id: 'small_decisions', label: 'Endless small decisions.' },
  { id: 'maintenance_firefighting', label: 'Maintenance / firefighting.' },
  { id: 'seven_pm_crash', label: 'The 7 PM motivation crash.' },
]

function diagnosisFromHeavy(h: FulfillmentHeavyFactor): { name: string; firstMove: string } {
  switch (h) {
    case 'small_decisions':
      return {
        name: 'Decision residue',
        firstMove:
          'Use one daytime capture for a heavy micro-decision, then run a short Evening Closure Ritual tonight so open loops do not compound.',
      }
    case 'maintenance_firefighting':
      return {
        name: 'Maintenance grind',
        firstMove:
          "Tomorrow morning, name one forward move (not maintenance) for the first protected block—then keep tonight's closure ritual to starve the grind.",
      }
    case 'seven_pm_crash':
    default:
      return {
        name: 'Evening energy collapse',
        firstMove:
          'Tonight, run the Evening Closure Ritual from the article—review captures, name one pattern, pick one insight for tomorrow—to prevent the 7 PM flip.',
      }
  }
}

function paradoxHeadline(ext: number, inn: number, gap: number): string {
  if (gap >= 5 && ext > inn) return 'High-growth / High-drain'
  if (gap >= 5 && inn > ext) return 'High-fulfillment / Scoreboard lag'
  if (gap <= 2) return 'Tight alignment'
  return 'The fulfillment gap'
}

export function GapAnalyzerWidget({ funnelId, config }: GapAnalyzerWidgetProps) {
  const pathname = usePathname()
  const [phase, setPhase] = useState<Phase>('external')
  const [externalScore, setExternalScore] = useState(7)
  const [internalScore, setInternalScore] = useState(5)
  const [heavyFactor, setHeavyFactor] = useState<FulfillmentHeavyFactor | null>(null)
  const [claiming, setClaiming] = useState(false)

  const gap = Math.abs(externalScore - internalScore)
  const paradoxDetected = gap > 4

  const diag = heavyFactor ? diagnosisFromHeavy(heavyFactor) : null
  const headline = useMemo(
    () => paradoxHeadline(externalScore, internalScore, gap),
    [externalScore, internalScore, gap]
  )

  const showChart = phase !== 'external'

  const handleClaim = () => {
    if (!heavyFactor || typeof window === 'undefined') return
    setClaiming(true)
    const fulfillment_gap = {
      external_score: externalScore,
      internal_score: internalScore,
      gap,
      heavy_factor: heavyFactor,
    }
    const items = [
      `Fulfillment gap: scoreboard ${externalScore}/10 vs battery ${internalScore}/10 (gap ${gap}).`,
      `Heavy factor: ${HEAVY_OPTIONS.find((o) => o.id === heavyFactor)?.label ?? heavyFactor} → ${diag?.name ?? 'pattern'}.`,
      `${diag?.firstMove ?? 'First move: Evening Closure Ritual tonight.'}`,
    ]
    try {
      sessionStorage.setItem(
        'pending_plan',
        JSON.stringify({
          funnelId,
          handoffContext: config.handoffContext,
          fulfillmentGap: true,
          fulfillment_gap,
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

  const bar = (score: number, color: string) => (
    <div className="flex h-44 flex-1 flex-col items-center justify-end px-2">
      <div className="w-full max-w-[4.5rem] rounded-t-lg bg-zinc-100 dark:bg-zinc-800">
        <div
          className="min-h-[6px] w-full rounded-t-lg transition-all duration-300"
          style={{
            height: `${(score / 10) * 100}%`,
            backgroundColor: color,
          }}
        />
      </div>
      <p className="mt-2 text-center text-xs font-semibold text-[#6a5a52]">{score}/10</p>
    </div>
  )

  return (
    <section className="my-10 rounded-[1.75rem] border border-[#e6d8d2] bg-gradient-to-br from-[#fffdfb] via-[#fdf8f5] to-[#f7f0eb] p-6 shadow-sm sm:p-8">
      <p className="text-xs font-bold uppercase tracking-wide text-[#ef725c]">{microPlannerLabel}</p>
      <h3 className="mt-2 text-xl font-semibold text-[#152b50]">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-[#5b4d46]">{subtitle}</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_220px] lg:items-start">
        <div className="space-y-6">
          {phase === 'external' && (
            <div className="rounded-2xl border border-[#f0dcd4] bg-white/80 p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wide text-[#8a6d62]">Step 1 — Scoreboard (external)</p>
              <p className="mt-3 text-sm leading-relaxed text-[#4a3d38]">
                <span className="font-medium text-[#8a4a3a]">Mrs. Deer:</span> On a scale of 1–10, how is the{' '}
                <strong>business</strong> performing right now? (Revenue, growth, metrics.)
              </p>
              <div className="mt-4">
                <div className="flex justify-between text-xs font-medium text-[#6a5a52]">
                  <span>Struggling</span>
                  <span className="text-[#152b50]">{externalScore}</span>
                  <span>Crushing it</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={externalScore}
                  onChange={(e) => setExternalScore(Number(e.target.value))}
                  className="mt-2 w-full accent-[#4a6fa5]"
                />
              </div>
              <button
                type="button"
                onClick={() => setPhase('internal')}
                className="mt-5 inline-flex items-center justify-center rounded-xl bg-[#ef725c] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#e8654d]"
              >
                Continue
              </button>
            </div>
          )}

          {phase === 'internal' && (
            <div className="rounded-2xl border border-[#f0dcd4] bg-white/80 p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wide text-[#8a6d62]">Step 2 — Battery (internal)</p>
              <p className="mt-3 text-sm leading-relaxed text-[#4a3d38]">
                <span className="font-medium text-[#8a4a3a]">Mrs. Deer:</span> Now 1–10: how is the{' '}
                <strong>founder</strong> doing? (Energy, meaning, joy.)
              </p>
              <div className="mt-4">
                <div className="flex justify-between text-xs font-medium text-[#6a5a52]">
                  <span>Empty</span>
                  <span className="text-[#152b50]">{internalScore}</span>
                  <span>Lit up</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={internalScore}
                  onChange={(e) => setInternalScore(Number(e.target.value))}
                  className="mt-2 w-full accent-[#ef725c]"
                />
              </div>
              <div className="mt-4 flex items-center justify-between gap-2 rounded-xl bg-[#fdf8f6] px-3 py-2 text-xs text-[#5b4d46]">
                <span>
                  Gap score: <strong className="text-[#152b50]">{gap}</strong>
                </span>
                {paradoxDetected ? (
                  <span className="font-semibold text-[#b45309]">Success Paradox detected</span>
                ) : (
                  <span className="text-[#6a5a52]">Gap under control</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setPhase('heavy')}
                className="mt-5 inline-flex items-center justify-center rounded-xl bg-[#ef725c] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#e8654d]"
              >
                Continue
              </button>
            </div>
          )}

          {(phase === 'heavy' || phase === 'summary') && (
            <div className="rounded-2xl border border-[#f0dcd4] bg-[#fdf8f6]/80 p-4 text-sm text-[#5b4d46] shadow-sm">
              <span className="font-semibold text-[#152b50]">Your snapshot:</span> scoreboard{' '}
              <strong>{externalScore}/10</strong> · battery <strong>{internalScore}/10</strong> · gap{' '}
              <strong>{gap}</strong>
              {paradoxDetected ? (
                <span className="ml-2 font-semibold text-[#b45309]">· Success Paradox</span>
              ) : null}
            </div>
          )}

          {(phase === 'heavy' || phase === 'summary') && (
            <div
              className={`rounded-2xl border border-[#f0dcd4] bg-white/80 p-5 shadow-sm ${
                phase === 'summary' ? 'pointer-events-none opacity-90' : ''
              }`}
            >
              <p className="text-xs font-bold uppercase tracking-wide text-[#8a6d62]">Step 3 — The heavy factor</p>
              <p className="mt-3 text-sm leading-relaxed text-[#4a3d38]">
                <span className="font-medium text-[#8a4a3a]">Mrs. Deer:</span> Which part of your day currently feels
                like lifting weights?
              </p>
              <div className="mt-4 space-y-2" role="radiogroup" aria-label="Heaviest part of day">
                {HEAVY_OPTIONS.map((o) => (
                  <label
                    key={o.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition ${
                      heavyFactor === o.id
                        ? 'border-[#ef725c] bg-[#fff3ef] ring-2 ring-[#ef725c]/20'
                        : 'border-[#e0cfc6] bg-white hover:border-[#ef725c]/45'
                    }`}
                  >
                    <input
                      type="radio"
                      name="heavy"
                      checked={heavyFactor === o.id}
                      onChange={() => setHeavyFactor(o.id)}
                      className="accent-[#ef725c]"
                      disabled={phase === 'summary'}
                    />
                    {o.label}
                  </label>
                ))}
              </div>
              {phase === 'heavy' && heavyFactor && (
                <button
                  type="button"
                  onClick={() => setPhase('summary')}
                  className="mt-5 inline-flex items-center justify-center rounded-xl bg-[#ef725c] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#e8654d]"
                >
                  See paradox map
                </button>
              )}
            </div>
          )}

          {phase === 'summary' && diag && (
            <div className="rounded-2xl border border-[#f0dcd4] bg-[#fff9f6] px-5 py-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wide text-[#ef725c]">Paradox map</p>
              <p className="mt-3 text-base font-semibold text-[#152b50]">The result: {headline}</p>
              <p className="mt-2 text-sm leading-relaxed text-[#5b4d46]">
                <span className="font-medium text-[#4a3d38]">The gap:</span> Your business reads like a{' '}
                <strong>{externalScore}/10</strong>, but your battery is at a <strong>{internalScore}/10</strong>.
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[#5b4d46]">
                <span className="font-medium text-[#4a3d38]">The diagnosis:</span> {diag.name}
                {paradoxDetected
                  ? ' — external wins are being taxed by how your days actually feel.'
                  : ' — still worth addressing before the gap widens.'}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-[#5b4d46]">
                <span className="font-medium text-[#8a4a3a]">First move:</span> {diag.firstMove}
              </p>
            </div>
          )}
        </div>

        {showChart && (
          <div className="flex flex-col items-center lg:items-end">
            <p className="mb-2 w-full text-center text-xs font-semibold uppercase tracking-wide text-[#8a6d62] lg:text-right">
              External vs internal
            </p>
            <div className="flex w-full max-w-[220px] items-end justify-center gap-3 rounded-2xl border border-[#f0dcd4] bg-white/90 px-4 py-4 shadow-inner">
              {bar(externalScore, '#4a6fa5')}
              {bar(internalScore, '#ef725c')}
            </div>
            <p className="mt-2 text-center text-[10px] text-[#918076] lg:text-right">Blue = scoreboard · Coral = you</p>
          </div>
        )}
      </div>

      <p className="mt-6 text-xs leading-relaxed text-[#6a5a52]">{strategicSummary}</p>

      {phase === 'summary' && heavyFactor && (
        <button
          type="button"
          onClick={handleClaim}
          disabled={claiming}
          className="mt-5 inline-flex min-w-[240px] items-center justify-center rounded-xl bg-[#ef725c] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#e8654d] disabled:cursor-not-allowed disabled:opacity-45"
        >
          {claiming ? 'Saving…' : 'Close My Fulfillment Gap'}
        </button>
      )}
    </section>
  )
}
