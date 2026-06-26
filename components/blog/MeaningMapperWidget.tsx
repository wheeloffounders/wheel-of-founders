'use client'

import { useId, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import type { BlogInteractiveFunnelConfig, InteractiveFunnelId } from '@/lib/blog-interactive-funnels'
import { unlockBlogTrialGiftInSession } from '@/lib/blog-trial-gift-session'
import { useBlogWidgetRadar, useRadarCompleteWhen } from '@/components/blog/useBlogWidgetRadar'

type Phase = 'win' | 'values' | 'experiment' | 'summary'

type ValueId = 'impact' | 'teaching' | 'freedom' | 'creativity' | 'depth'

const OLD_VALUES = ['Survival', 'Proving', 'Growth'] as const

const EVOLVING: { id: ValueId; label: string; hint: string }[] = [
  { id: 'impact', label: 'Impact', hint: 'Outcomes that matter beyond metrics' },
  { id: 'teaching', label: 'Teaching', hint: 'Passing the ladder down' },
  { id: 'freedom', label: 'Freedom', hint: 'Agency and breathing room' },
  { id: 'creativity', label: 'Creativity', hint: 'Making again, not only managing' },
  { id: 'depth', label: 'Depth', hint: 'Craft, mastery, fewer tabs' },
]

const MIN_VALUES = 2
const MAX_VALUES = 3

type MeaningMapperWidgetProps = {
  funnelId: InteractiveFunnelId
  config: BlogInteractiveFunnelConfig
}

function MeaningCup({ fillPct }: { fillPct: number }) {
  const h = Math.min(100, Math.max(4, fillPct))
  return (
    <div className="mx-auto flex max-w-[200px] flex-col items-center">
      <p className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-[#8a4a3a]">Goal–identity gap</p>
      <div className="relative h-36 w-28">
        <div
          className="absolute inset-x-1 bottom-0 top-6 rounded-b-3xl border-x-[10px] border-b-[10px] border-[#d4c4bc] bg-[#faf6f4]"
          aria-hidden
        />
        <div className="absolute bottom-[10px] left-[18px] right-[18px] top-[38px]">
          <div
            className="absolute bottom-0 left-0 right-0 min-h-[6px] rounded-b-2xl bg-gradient-to-t from-amber-600 via-orange-400 to-amber-300 transition-all duration-700 ease-out"
            style={{ height: `${h}%` }}
            aria-hidden
          />
        </div>
        <div className="absolute left-0 right-0 top-5 mx-auto h-2 w-[85%] rounded-full bg-[#d4c4bc]" aria-hidden />
        <div className="absolute left-1/2 top-2 -translate-x-1/2 text-lg" aria-hidden>
          ✦
        </div>
      </div>
      <p className="mt-2 text-center text-[11px] text-[#6a5a52]">The cup fills as you name what still feels alive.</p>
    </div>
  )
}

export function MeaningMapperWidget({ funnelId, config }: MeaningMapperWidgetProps) {
  const suggestionListId = useId()
  const pathname = usePathname()
  const { onFirstPointer, markComplete } = useBlogWidgetRadar(funnelId)
  const [phase, setPhase] = useState<Phase>('win')
  const [achievement, setAchievement] = useState('')
  const [selected, setSelected] = useState<ValueId[]>([])
  const [experiment, setExperiment] = useState('')
  const [claiming, setClaiming] = useState(false)

  useRadarCompleteWhen(phase === 'summary', markComplete)

  const achTrim = achievement.trim()
  const expTrim = experiment.trim()

  const fillPct = useMemo(() => {
    let p = 0
    if (achTrim) p += 22
    p += (selected.length / MAX_VALUES) * 38
    if (expTrim) p += 40
    return Math.round(Math.min(100, p))
  }, [achTrim, selected.length, expTrim])

  const evolvingLabels = useMemo(
    () => selected.map((id) => EVOLVING.find((v) => v.id === id)?.label ?? id),
    [selected]
  )

  const toggleValue = (id: ValueId) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= MAX_VALUES) return prev
      return [...prev, id]
    })
  }

  const canWin = achTrim.length > 0
  const canValues = selected.length >= MIN_VALUES && selected.length <= MAX_VALUES
  const canExperiment = expTrim.length > 0

  const handleClaim = () => {
    if (!canExperiment || typeof window === 'undefined') return
    const meaning_lab = {
      achievement: achTrim,
      evolvingValues: evolvingLabels,
      experiment: expTrim,
    }
    const valuesLine = evolvingLabels.join(', ')
    const items = [
      `Post-success compass: "${achTrim}" → evolving north stars: ${valuesLine}.`,
      `Meaning experiment (this week): ${expTrim}`,
      `Block 10 minutes for significance today—scoreboard second. Notice energy, not output.`,
    ]

    setClaiming(true)
    try {
      sessionStorage.setItem(
        'pending_plan',
        JSON.stringify({
          funnelId,
          handoffContext: config.handoffContext,
          meaningLab: true,
          meaning_lab: meaning_lab,
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

      <MeaningCup fillPct={fillPct} />

      {phase === 'win' && (
        <div className="mt-5 space-y-4">
          <p className="text-sm leading-relaxed text-[#4a3d38]">
            <span className="font-medium text-[#8a4a3a]">Mrs. Deer:</span> What was your most recent &apos;Big
            Win&apos; that left you feeling a bit hollow?
          </p>
          <textarea
            value={achievement}
            onChange={(e) => setAchievement(e.target.value)}
            rows={3}
            placeholder="e.g. Closed the biggest deal of the year—and went to bed feeling nothing."
            className="w-full resize-y rounded-lg border border-[#e6d8d2] bg-white px-3 py-2.5 text-sm text-[#1e1e1e] outline-none transition focus:border-[#ef725c] focus:ring-2 focus:ring-[#ef725c]/20"
          />
          <button
            type="button"
            disabled={!canWin}
            onClick={() => setPhase('values')}
            className="inline-flex min-w-[160px] items-center justify-center rounded-lg bg-[#152b50] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0f1f3d] disabled:cursor-not-allowed disabled:opacity-45"
          >
            Next: values pivot
          </button>
        </div>
      )}

      {phase === 'values' && (
        <div className="mt-5 space-y-4">
          <p className="text-sm leading-relaxed text-[#4a3d38]">
            <span className="font-medium text-[#8a4a3a]">Mrs. Deer:</span> Your old operating system may still be
            running on:
          </p>
          <ul className="flex flex-wrap gap-2">
            {OLD_VALUES.map((v) => (
              <li
                key={v}
                className="rounded-full bg-[#f0ebe8] px-3 py-1 text-xs font-medium text-[#6a5a52] ring-1 ring-[#e0d5cf]"
              >
                {v}
              </li>
            ))}
          </ul>
          <p className="text-sm text-[#4a3d38]">
            Choose <strong className="text-[#152b50]">{MIN_VALUES}–{MAX_VALUES}</strong> values that feel alive for
            who you are <em>now</em> (not who you had to be to survive the climb).
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {EVOLVING.map((v) => {
              const on = selected.includes(v.id)
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => toggleValue(v.id)}
                  className={`rounded-xl border px-3 py-3 text-left text-sm transition ${
                    on
                      ? 'border-amber-400 bg-amber-50 ring-2 ring-amber-200'
                      : 'border-[#e6d8d2] bg-white hover:border-[#c9a227]/50'
                  }`}
                >
                  <span className="font-semibold text-[#152b50]">{v.label}</span>
                  <span className="mt-1 block text-xs leading-snug text-[#5b4d46]">{v.hint}</span>
                </button>
              )
            })}
          </div>
          <p className="text-xs text-[#6a5a52]">
            Selected: {selected.length}/{MAX_VALUES}
            {selected.length < MIN_VALUES ? ` — pick at least ${MIN_VALUES}.` : ''}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setPhase('win')}
              className="rounded-lg border border-[#e6d8d2] bg-white px-3 py-2 text-sm font-medium text-[#5b4d46] hover:border-[#ef725c]"
            >
              Back
            </button>
            <button
              type="button"
              disabled={!canValues}
              onClick={() => setPhase('experiment')}
              className="inline-flex min-w-[160px] items-center justify-center rounded-lg bg-[#152b50] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0f1f3d] disabled:cursor-not-allowed disabled:opacity-45"
            >
              Next: meaning experiment
            </button>
          </div>
        </div>
      )}

      {phase === 'experiment' && (
        <div className="mt-5 space-y-4">
          <p className="text-sm leading-relaxed text-[#4a3d38]">
            <span className="font-medium text-[#8a4a3a]">Mrs. Deer:</span> Pick one <strong>low-stakes</strong>{' '}
            experiment to run this week to feed: {evolvingLabels.join(', ')}.
          </p>
          <input
            type="text"
            list={suggestionListId}
            value={experiment}
            onChange={(e) => setExperiment(e.target.value)}
            placeholder="Type your experiment—or pick a suggestion from the list"
            className="w-full rounded-lg border border-[#e6d8d2] bg-white px-3 py-2.5 text-sm text-[#1e1e1e] outline-none transition focus:border-[#ef725c] focus:ring-2 focus:ring-[#ef725c]/20"
          />
          <datalist id={suggestionListId}>
            <option value="Mentor one early-stage founder for 30 minutes" />
            <option value="Write one short lesson-learned post (no growth KPI)" />
            <option value="Volunteer one hour of expertise to a nonprofit" />
            <option value="Spend one evening on a passion project with zero revenue goal" />
          </datalist>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setPhase('values')}
              className="rounded-lg border border-[#e6d8d2] bg-white px-3 py-2 text-sm font-medium text-[#5b4d46] hover:border-[#ef725c]"
            >
              Back
            </button>
            <button
              type="button"
              disabled={!canExperiment}
              onClick={() => setPhase('summary')}
              className="inline-flex min-w-[180px] items-center justify-center rounded-lg bg-[#152b50] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0f1f3d] disabled:cursor-not-allowed disabled:opacity-45"
            >
              Show Post-Success Compass
            </button>
          </div>
        </div>
      )}

      {phase === 'summary' && (
        <div className="mt-5 space-y-4">
          <div className="rounded-xl border border-[#e8dbd5] bg-white p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-[#ef725c]">Post-Success Compass</p>
            <h4 className="mt-2 text-lg font-semibold text-[#152b50]">From Success to Significance</h4>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-[#4a3d38]">
              <li>
                <span className="font-semibold text-[#152b50]">The Platform:</span> {achTrim}
              </li>
              <li>
                <span className="font-semibold text-[#152b50]">The New North Star:</span> {evolvingLabels.join(' · ')}
              </li>
              <li>
                <span className="font-semibold text-[#152b50]">The First Step:</span> {expTrim}
              </li>
            </ul>
            <p className="mt-4 border-l-4 border-[#ef725c] pl-4 text-sm italic leading-relaxed text-[#5b4d46]">
              <span className="font-semibold not-italic text-[#8a4a3a]">Mrs. Deer&apos;s Note:</span> The emptiness
              you feel is just unused space. We aren&apos;t deleting your success; we&apos;re building meaning on top
              of it. I&apos;ll help you track the energy of this experiment.
            </p>
          </div>
          <p className="text-xs text-[#6a5a52]">{config.strategicSummary}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setPhase('experiment')}
              className="rounded-lg border border-[#e6d8d2] bg-white px-3 py-2 text-sm font-medium text-[#5b4d46] hover:border-[#ef725c]"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleClaim}
              disabled={claiming}
              className="inline-flex min-w-[220px] items-center justify-center rounded-lg bg-[#ef725c] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#e8654d] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {claiming ? 'Saving…' : 'Start My Meaning Experiment'}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
