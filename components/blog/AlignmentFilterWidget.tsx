'use client'

import { useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import type { BlogInteractiveFunnelConfig, InteractiveFunnelId } from '@/lib/blog-interactive-funnels'
import { unlockBlogTrialGiftInSession } from '@/lib/blog-trial-gift-session'
import { useBlogWidgetRadar, useRadarCompleteWhen } from '@/components/blog/useBlogWidgetRadar'

type Phase = 'shiny' | 'sarah' | 'talent' | 'summary'

type SarahAnswer = 'yes' | 'no' | 'kind_of'

type AlignmentFilterWidgetProps = {
  funnelId: InteractiveFunnelId
  config: BlogInteractiveFunnelConfig
}

function scoreFromInputs(sarah: SarahAnswer, talentSlider: number): number {
  const sarahPts =
    sarah === 'yes' ? 45 : sarah === 'kind_of' ? 24 : 8
  const believerSide = (100 - Math.min(100, Math.max(0, talentSlider))) / 100
  const talentPts = Math.round(believerSide * 55)
  return Math.min(100, sarahPts + talentPts)
}

function verdictLabel(score: number): string {
  if (score >= 72) return 'Strong alignment'
  if (score >= 55) return 'On-mission'
  if (score >= 40) return 'Elevated drift risk'
  return 'High Risk of Drift'
}

function MissionCompass({ score }: { score: number }) {
  const rotation = 90 - (Math.min(100, Math.max(0, score)) / 100) * 90
  return (
    <div className="mx-auto mt-2 max-w-[220px]">
      <p className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-[#8a4a3a]">
        Strategic compass
      </p>
      <div className="relative aspect-square rounded-full border-2 border-[#e6d8d2] bg-gradient-to-b from-[#f0f7ff] to-[#fdf8f6] shadow-inner">
        <span className="absolute left-1/2 top-2 -translate-x-1/2 text-[10px] font-bold text-[#152b50]">N</span>
        <span className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[9px] font-medium text-[#8a7d76]">
          Mission
        </span>
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-[#b8a99c]">Drift</span>
        <div
          className="pointer-events-none absolute bottom-1/2 left-1/2 w-1 origin-bottom rounded-full bg-[#152b50] shadow-sm transition-transform duration-500 ease-out"
          style={{
            height: '38%',
            transform: `translateX(-50%) rotate(${rotation}deg)`,
          }}
          aria-hidden
        />
        <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#ef725c] shadow" />
      </div>
      <p className="mt-2 text-center text-xs text-[#5b4d46]">
        Needle toward <strong className="text-[#152b50]">North</strong> = mission; sideways = drift risk.
      </p>
    </div>
  )
}

export function AlignmentFilterWidget({ funnelId, config }: AlignmentFilterWidgetProps) {
  const pathname = usePathname()
  const { onFirstPointer, markComplete } = useBlogWidgetRadar(funnelId)
  const [phase, setPhase] = useState<Phase>('shiny')
  const [opportunity, setOpportunity] = useState('')
  const [corePersona, setCorePersona] = useState('')
  const [sarahTest, setSarahTest] = useState<SarahAnswer | null>(null)
  const [talentSlider, setTalentSlider] = useState(35)
  const [claiming, setClaiming] = useState(false)

  useRadarCompleteWhen(phase === 'summary', markComplete)

  const oppTrim = opportunity.trim()
  const personaTrim = corePersona.trim()

  const alignmentScore = useMemo(() => {
    if (sarahTest === null) return 0
    return scoreFromInputs(sarahTest, talentSlider)
  }, [sarahTest, talentSlider])

  const verdict = verdictLabel(alignmentScore)

  const tradeOff = useMemo(() => {
    if (!personaTrim || !oppTrim) return ''
    if (alignmentScore < 52) {
      return `This might bring in revenue, but it shifts your focus away from ${personaTrim}. You're trading your legacy for a lead.`
    }
    return `This idea pulls toward serving ${personaTrim}—keep scope tight so execution matches that promise, not the loudest shortcut.`
  }, [alignmentScore, personaTrim, oppTrim])

  const canShiny = oppTrim.length > 0
  const canSarah = personaTrim.length > 0 && sarahTest !== null
  const canTalent = canSarah

  const handleClaim = () => {
    if (sarahTest === null || typeof window === 'undefined') return
    const mission_check = {
      opportunity: oppTrim,
      corePersona: personaTrim,
      sarahTest,
      talentSlider,
      alignmentScore,
    }
    const items = [
      `Mission filter: "${oppTrim}" vs serving ${personaTrim} — ${alignmentScore}% (${verdict}).`,
      `Persona fit (${personaTrim}): ${sarahTest === 'yes' ? 'Yes' : sarahTest === 'no' ? 'No' : 'Kind of'}; talent pull: ${talentSlider <= 33 ? 'believers' : talentSlider >= 67 ? 'mercenaries' : 'mixed'}.`,
      `Purpose protection—one needle mover today should clearly serve ${personaTrim}.`,
    ]

    setClaiming(true)
    try {
      sessionStorage.setItem(
        'pending_plan',
        JSON.stringify({
          funnelId,
          handoffContext: config.handoffContext,
          missionDriftFilter: true,
          mission_check,
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

  return (
    <section
      className="my-8 rounded-2xl border border-[#e8dbd5] bg-[#fdf8f6] p-5 shadow-sm sm:p-6"
      onPointerDownCapture={onFirstPointer}
    >
      <p className="text-xs font-bold uppercase tracking-wide text-[#ef725c]">{config.microPlannerLabel}</p>
      <h3 className="mt-2 text-xl font-semibold text-[#152b50]">{config.title}</h3>
      <p className="mt-1 text-sm text-[#5b4d46]">{config.subtitle}</p>

      {phase === 'shiny' && (
        <div className="mt-5 space-y-4">
          <p className="text-sm leading-relaxed text-[#4a3d38]">
            <span className="font-medium text-[#8a4a3a]">Mrs. Deer:</span> What&apos;s the &apos;good idea&apos; or new
            opportunity currently tempting you?
          </p>
          <input
            type="text"
            value={opportunity}
            onChange={(e) => setOpportunity(e.target.value)}
            placeholder='e.g. "Build an enterprise version for agencies"'
            className="w-full rounded-lg border border-[#e6d8d2] bg-white px-3 py-2.5 text-sm text-[#1e1e1e] outline-none transition focus:border-[#ef725c] focus:ring-2 focus:ring-[#ef725c]/20"
          />
          <button
            type="button"
            disabled={!canShiny}
            onClick={() => setPhase('sarah')}
            className="inline-flex min-w-[160px] items-center justify-center rounded-lg bg-[#152b50] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0f1f3d] disabled:cursor-not-allowed disabled:opacity-45"
          >
            Next: Run Alignment Test
          </button>
        </div>
      )}

      {phase === 'sarah' && (
        <div className="mt-5 space-y-4">
          <p className="text-sm leading-relaxed text-[#4a3d38]">
            <span className="font-medium text-[#8a4a3a]">Mrs. Deer:</span> Who is the specific person your mission
            serves?
          </p>
          <input
            type="text"
            value={corePersona}
            onChange={(e) => setCorePersona(e.target.value)}
            placeholder='e.g. "Alex, the solo agency owner"'
            className="w-full rounded-lg border border-[#e6d8d2] bg-white px-3 py-2.5 text-sm text-[#1e1e1e] outline-none transition focus:border-[#ef725c] focus:ring-2 focus:ring-[#ef725c]/20"
          />
          {personaTrim ? (
            <>
              <p className="text-base font-semibold leading-snug text-[#152b50]">
                <span className="font-medium text-[#8a4a3a]">Mrs. Deer:</span> Does this help{' '}
                <span className="text-[#152b50]">{personaTrim}</span>?
              </p>
              <p className="text-sm text-[#5b4d46]">
                In practice: does <strong className="text-[#1e1e1e]">{oppTrim || 'this opportunity'}</strong> help
                them solve their biggest problem?
              </p>
            </>
          ) : (
            <p className="text-sm text-[#6a5a52]">
              Name your core persona above—then we&apos;ll ask whether this idea truly helps them.
            </p>
          )}
          <fieldset disabled={!personaTrim} className="min-w-0 border-0 p-0">
            <legend className="sr-only">Alignment answer for your core persona</legend>
            <div className="flex flex-wrap gap-2">
              {(['yes', 'kind_of', 'no'] as const).map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSarahTest(id)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    sarahTest === id
                      ? 'bg-[#152b50] text-white shadow-sm'
                      : 'bg-white text-[#5b4d46] ring-1 ring-[#e6d8d2] enabled:hover:ring-[#ef725c] disabled:cursor-not-allowed disabled:opacity-40'
                  }`}
                >
                  {id === 'yes' ? 'Yes' : id === 'no' ? 'No' : 'Kind of'}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setPhase('shiny')}
              className="rounded-lg border border-[#e6d8d2] bg-white px-3 py-2 text-sm font-medium text-[#5b4d46] hover:border-[#ef725c]"
            >
              Back
            </button>
            <button
              type="button"
              disabled={!canSarah}
              onClick={() => setPhase('talent')}
              className="inline-flex min-w-[160px] items-center justify-center rounded-lg bg-[#152b50] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0f1f3d] disabled:cursor-not-allowed disabled:opacity-45"
            >
              Next: talent check
            </button>
          </div>
        </div>
      )}

      {phase === 'talent' && (
        <div className="mt-5 space-y-4">
          <p className="text-sm leading-relaxed text-[#4a3d38]">
            <span className="font-medium text-[#8a4a3a]">Mrs. Deer:</span> If you built this, would it attract people
            who care about your &apos;Why,&apos; or just people who want a paycheck?
          </p>
          <div className="rounded-xl border border-[#e6d8d2] bg-white p-4">
            <div className="flex justify-between text-xs font-semibold text-[#5b4d46]">
              <span>Believers</span>
              <span>Mercenaries</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={talentSlider}
              onChange={(e) => setTalentSlider(Number(e.target.value))}
              className="mt-3 w-full accent-[#ef725c]"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={talentSlider}
              aria-label="Believers versus mercenaries hiring signal"
            />
            <p className="mt-2 text-center text-xs text-[#6a5a52]">
              Slide toward <strong>Mercenaries</strong> if this work mostly pulls transactional hires—toward{' '}
              <strong>Believers</strong> if it magnetizes people who share your mission.
            </p>
          </div>
          <MissionCompass score={alignmentScore} />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setPhase('sarah')}
              className="rounded-lg border border-[#e6d8d2] bg-white px-3 py-2 text-sm font-medium text-[#5b4d46] hover:border-[#ef725c]"
            >
              Back
            </button>
            <button
              type="button"
              disabled={!canTalent}
              onClick={() => setPhase('summary')}
              className="inline-flex min-w-[180px] items-center justify-center rounded-lg bg-[#152b50] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0f1f3d] disabled:cursor-not-allowed disabled:opacity-45"
            >
              Show integrity report
            </button>
          </div>
        </div>
      )}

      {phase === 'summary' && sarahTest !== null && (
        <div className="mt-5 space-y-4">
          <MissionCompass score={alignmentScore} />
          <div className="rounded-xl border border-[#e8dbd5] bg-white p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-[#ef725c]">Integrity report</p>
            <h4 className="mt-2 text-lg font-semibold text-[#152b50]">The Verdict: {oppTrim}</h4>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-[#4a3d38]">
              <li>
                <span className="font-semibold text-[#152b50]">Alignment Score:</span> {alignmentScore}% ({verdict})
              </li>
              <li>
                <span className="font-semibold text-[#152b50]">The Trade-off:</span> {tradeOff}
              </li>
            </ul>
            <p className="mt-4 border-l-4 border-[#ef725c] pl-4 text-sm italic leading-relaxed text-[#5b4d46]">
              <span className="font-semibold not-italic text-[#8a4a3a]">Mrs. Deer&apos;s Note:</span> Saying
              &apos;No&apos; to a shiny detour isn&apos;t a failure—it&apos;s a defensive play for your mission.
              I&apos;ve logged this as a &apos;Purpose Protection&apos; event.
            </p>
          </div>
          <p className="text-xs text-[#6a5a52]">{config.strategicSummary}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setPhase('talent')}
              className="rounded-lg border border-[#e6d8d2] bg-white px-3 py-2 text-sm font-medium text-[#5b4d46] hover:border-[#ef725c]"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleClaim}
              disabled={claiming}
              className="inline-flex min-w-[200px] items-center justify-center rounded-lg bg-[#ef725c] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#e8654d] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {claiming ? 'Saving…' : 'Protect My Mission'}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
