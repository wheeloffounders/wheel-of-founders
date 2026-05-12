'use client'

import { useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import type {
  BlogInteractiveFunnelConfig,
  DelegationStressWorstCase,
  InteractiveFunnelId,
} from '@/lib/blog-interactive-funnels'
import { unlockBlogTrialGiftInSession } from '@/lib/blog-trial-gift-session'

type Phase = 'task' | 'worst' | 'vision' | 'summary'

type StressTesterWidgetProps = {
  funnelId: InteractiveFunnelId
  config: BlogInteractiveFunnelConfig
}

function buildDoneChecklist(taskRaw: string): [string, string, string] {
  const t = taskRaw.trim() || 'this task'
  return [
    `Outcome matches your current definition of "done" for ${t}—no mystery criteria.`,
    `Issues or blockers surface in one place you name (not scattered DMs).`,
    `You get a short completion note: what shipped, what changed, what is parked.`,
  ]
}

function riskMeterPercent(worst: DelegationStressWorstCase | null): number {
  if (!worst) return 50
  if (worst === 'baby_fail') return 12
  if (worst === 'limb_client') return 58
  return 88
}

const WORST_OPTIONS: {
  id: DelegationStressWorstCase
  label: string
  sub: string
}[] = [
  { id: 'baby_fail', label: 'The business fails.', sub: 'The "Baby"' },
  { id: 'limb_client', label: 'A client gets annoyed for 5 minutes.', sub: 'The "Limb"' },
  { id: 'limb_typo', label: 'I just have to fix a typo later.', sub: 'The "Limb"' },
]

export function StressTesterWidget({ funnelId, config }: StressTesterWidgetProps) {
  const pathname = usePathname()
  const [phase, setPhase] = useState<Phase>('task')
  const [taskName, setTaskName] = useState('')
  const [worstCase, setWorstCase] = useState<DelegationStressWorstCase | null>(null)
  const [savedTimeActivity, setSavedTimeActivity] = useState('')
  const [claiming, setClaiming] = useState(false)

  const isLimb = worstCase === 'limb_client' || worstCase === 'limb_typo'
  const checklist = useMemo(() => buildDoneChecklist(taskName), [taskName])
  const meterPct = riskMeterPercent(worstCase)

  const handleClaim = () => {
    if (typeof window === 'undefined') return
    const taskTrim = taskName.trim()
    const actTrim = savedTimeActivity.trim()
    if (!taskTrim || !worstCase || !actTrim) return
    setClaiming(true)
    const stress_test = {
      task_name: taskTrim,
      worst_case: worstCase,
      saved_time_activity: actTrim,
      risk_tier: isLimb ? ('low' as const) : ('high' as const),
    }
    const items = [
      `Handoff stress-test: "${taskTrim}" → ${isLimb ? 'Limb (safe handoff candidate)' : 'Baby-tier (smaller limb first)'}`,
      `Time back would go to: ${actTrim}`,
      `Done checklist (draft): ${checklist[0]}`,
    ]
    try {
      sessionStorage.setItem(
        'pending_plan',
        JSON.stringify({
          funnelId,
          handoffContext: config.handoffContext,
          stressTest: true,
          stress_test,
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
  const canAdvanceTask = taskName.trim().length > 0
  const canAdvanceWorst = worstCase !== null
  const canAdvanceVision = savedTimeActivity.trim().length > 0

  return (
    <section className="my-10 rounded-[1.75rem] border border-[#e6d8d2] bg-gradient-to-br from-[#fffdfb] via-[#fdf8f5] to-[#f7f0eb] p-6 shadow-sm sm:p-8">
      <p className="text-xs font-bold uppercase tracking-wide text-[#ef725c]">{microPlannerLabel}</p>
      <h3 className="mt-2 text-xl font-semibold text-[#152b50]">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-[#5b4d46]">{subtitle}</p>

      {(phase === 'worst' || phase === 'vision' || phase === 'summary') && (
        <div className="mt-8 rounded-2xl border border-[#f0dcd4] bg-white/90 p-4 shadow-inner">
          <p className="text-center text-xs font-semibold uppercase tracking-wide text-[#8a6d62]">
            Risk vs. relief meter
          </p>
          <div className="relative mx-auto mt-3 h-3 max-w-xs overflow-hidden rounded-full bg-gradient-to-r from-[#c45c5c] via-[#e8ded8] to-[#5a9e7d]">
            <div
              className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#152b50] shadow-md transition-all duration-500 ease-out"
              style={{ left: `${meterPct}%` }}
              aria-hidden
            />
          </div>
          <p className="mt-2 text-center text-xs text-[#918076]">
            <span className="text-[#9a3d3d]">Baby</span>
            <span className="mx-2 text-zinc-300">·</span>
            <span className="text-[#3d7a5c]">Limb</span>
          </p>
        </div>
      )}

      <div className="mt-8 space-y-6">
        {phase === 'task' && (
          <div className="rounded-2xl border border-[#f0dcd4] bg-white/80 p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-[#8a6d62]">Step 1 — The candidate</p>
            <label htmlFor="stress-task" className="mt-3 block text-sm font-medium text-[#4a3d38]">
              Name one task that makes you sigh.
            </label>
            <input
              id="stress-task"
              type="text"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              placeholder="e.g. Manual invoice entry"
              className="mt-2 w-full rounded-xl border border-[#e6d8d2] bg-white px-3 py-2.5 text-sm text-[#1e1e1e] outline-none transition focus:border-[#ef725c] focus:ring-2 focus:ring-[#ef725c]/20"
            />
            <button
              type="button"
              disabled={!canAdvanceTask}
              onClick={() => setPhase('worst')}
              className="mt-4 inline-flex items-center justify-center rounded-xl bg-[#ef725c] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#e8654d] disabled:cursor-not-allowed disabled:opacity-45"
            >
              Continue
            </button>
          </div>
        )}

        {phase === 'worst' && (
          <div className="rounded-2xl border border-[#f0dcd4] bg-white/80 p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-[#8a6d62]">Step 2 — Worst case</p>
            <p className="mt-3 text-sm leading-relaxed text-[#4a3d38]">
              <span className="font-medium text-[#8a4a3a]">Mrs. Deer:</span> If someone did this ~80% as well as you—or
              slightly differently—what is the absolute worst outcome?
            </p>
            <div className="mt-4 space-y-2" role="radiogroup" aria-label="Worst-case outcome">
              {WORST_OPTIONS.map((o) => (
                <label
                  key={o.id}
                  className={`flex cursor-pointer flex-col rounded-xl border px-4 py-3 text-left transition ${
                    worstCase === o.id
                      ? 'border-[#ef725c] bg-[#fff3ef] ring-2 ring-[#ef725c]/20'
                      : 'border-[#e0cfc6] bg-white hover:border-[#ef725c]/45'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="worst-case"
                      checked={worstCase === o.id}
                      onChange={() => setWorstCase(o.id)}
                      className="mt-1 accent-[#ef725c]"
                    />
                    <span>
                      <span className="text-sm font-medium text-[#152b50]">{o.label}</span>
                      <span className="mt-0.5 block text-xs text-[#6a5a52]">{o.sub}</span>
                    </span>
                  </div>
                </label>
              ))}
            </div>
            {worstCase && (
              <p className="mt-4 text-sm leading-relaxed text-[#5b4d46]">
                <span className="font-medium text-[#8a4a3a]">Mrs. Deer:</span>{' '}
                {isLimb
                  ? 'That is limb-level downside—uncomfortable, not company-ending. Your brain often rounds "different" up to "catastrophic."'
                  : 'If this truly feels company-ending, it may still be a Baby in your system—that is okay. We start with a smaller limb for proof, not shame.'}
              </p>
            )}
            <button
              type="button"
              disabled={!canAdvanceWorst}
              onClick={() => setPhase('vision')}
              className="mt-4 inline-flex items-center justify-center rounded-xl bg-[#ef725c] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#e8654d] disabled:cursor-not-allowed disabled:opacity-45"
            >
              Continue
            </button>
          </div>
        )}

        {phase === 'vision' && (
          <div className="rounded-2xl border border-[#f0dcd4] bg-white/80 p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-[#8a6d62]">Step 3 — Energy opportunity</p>
            <p className="mt-3 text-sm leading-relaxed text-[#4a3d38]">
              <span className="font-medium text-[#8a4a3a]">Mrs. Deer:</span> If you had the hours back that this task
              steals every week, what growth work would you do instead?
            </p>
            <textarea
              value={savedTimeActivity}
              onChange={(e) => setSavedTimeActivity(e.target.value)}
              rows={3}
              placeholder="e.g. I'd finally record that demo video."
              className="mt-3 w-full resize-y rounded-xl border border-[#e6d8d2] bg-white px-3 py-2.5 text-sm text-[#1e1e1e] outline-none transition focus:border-[#ef725c] focus:ring-2 focus:ring-[#ef725c]/20"
            />
            <button
              type="button"
              disabled={!canAdvanceVision}
              onClick={() => setPhase('summary')}
              className="mt-4 inline-flex items-center justify-center rounded-xl bg-[#ef725c] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#e8654d] disabled:cursor-not-allowed disabled:opacity-45"
            >
              See my limb verification
            </button>
          </div>
        )}

        {phase === 'summary' && worstCase && (
          <div className="rounded-2xl border border-[#f0dcd4] bg-[#fff9f6] px-5 py-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-[#ef725c]">Limb verification</p>
            {isLimb ? (
              <>
                <p className="mt-3 text-base font-semibold text-[#152b50]">Result: Safe handoff candidate</p>
                <p className="mt-1 text-sm text-[#5b4d46]">
                  <span className="font-medium text-[#4a3d38]">Status:</span> This is a{' '}
                  <strong className="text-[#3d7a5c]">Limb</strong>, not a <strong className="text-[#9a3d3d]">Baby</strong>
                  .
                </p>
                <p className="mt-2 text-sm text-[#5b4d46]">
                  <span className="font-medium text-[#4a3d38]">Evidence:</span> Risk reads{' '}
                  <strong>low</strong> next to the opportunity cost of staying solo on &quot;{taskName.trim()}&quot;.
                </p>
                <p className="mt-2 text-sm text-[#5b4d46]">
                  <span className="font-medium text-[#4a3d38]">Growth pull:</span>{' '}
                  <em>{savedTimeActivity.trim()}</em>
                </p>
              </>
            ) : (
              <>
                <p className="mt-3 text-base font-semibold text-[#152b50]">Result: Baby-tier sensitivity</p>
                <p className="mt-1 text-sm leading-relaxed text-[#5b4d46]">
                  That worst-case still sounds like a <strong>Baby</strong> to your nervous system—which is valid. For
                  your first Minimum Viable Handoff, pick a smaller limb from the article list, then rerun this test.
                </p>
                <p className="mt-2 text-sm text-[#5b4d46]">
                  <span className="font-medium text-[#4a3d38]">Still worth naming:</span> the growth work you want back—
                  <em> {savedTimeActivity.trim()}</em>—so we can protect that time once a safer limb is on deck.
                </p>
              </>
            )}
            <div className="mt-4 rounded-xl border border-[#e8ded8] bg-white/90 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wide text-[#8a6d62]">Your 3-point Done checklist (draft)</p>
              <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-[#4a3d38]">
                {checklist.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ol>
            </div>
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
          {claiming ? 'Saving…' : 'Claim My Delegation Mirror'}
        </button>
      )}
    </section>
  )
}
