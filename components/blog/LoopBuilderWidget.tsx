'use client'

import { useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import type {
  BlogInteractiveFunnelConfig,
  DisciplineCelebrationId,
  InteractiveFunnelId,
} from '@/lib/blog-interactive-funnels'
import { unlockBlogTrialGiftInSession } from '@/lib/blog-trial-gift-session'

type Phase = 'trigger' | 'habit' | 'reward' | 'summary'

type LoopBuilderWidgetProps = {
  funnelId: InteractiveFunnelId
  config: BlogInteractiveFunnelConfig
}

const CELEBRATIONS: { id: DisciplineCelebrationId; label: string; hint: string }[] = [
  { id: 'stretch', label: 'Physical stretch', hint: 'Body signal' },
  { id: 'shoulder_drop', label: 'Shoulder drop', hint: 'Release tension' },
  { id: 'breath', label: 'A deep, 3-second breath', hint: 'Close the loop' },
]

function celebrationLabel(id: DisciplineCelebrationId): string {
  return CELEBRATIONS.find((c) => c.id === id)?.label ?? id
}

function LoopGraphic(props: { phase: Phase }) {
  const { phase } = props
  const tOn = phase !== 'trigger'
  const hOn = phase === 'habit' || phase === 'reward' || phase === 'summary'
  const rOn = phase === 'reward' || phase === 'summary'

  const node = (on: boolean, label: string) => (
    <div
      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-all duration-500 ${
        on
          ? 'border-[#ef725c] bg-[#fff3ef] text-[#7e3f2f] shadow-md ring-2 ring-[#ef725c]/25'
          : 'border-[#e0cfc6] bg-white/80 text-[#b5a8a0]'
      }`}
    >
      {label.slice(0, 1)}
    </div>
  )

  const line = (on: boolean) => (
    <div
      className={`mx-1 h-1 flex-1 rounded-full transition-all duration-500 ${
        on ? 'bg-[#ef725c]' : 'bg-[#e8ded8]'
      }`}
    />
  )

  return (
    <div className="rounded-2xl border border-[#f0dcd4] bg-white/70 px-4 py-5 shadow-inner">
      <p className="text-center text-xs font-semibold uppercase tracking-wide text-[#8a6d62]">Your loop</p>
      <div className="mt-4 flex items-center justify-between gap-1">
        {node(tOn, 'Trigger')}
        {line(tOn)}
        {node(hOn, 'Habit')}
        {line(rOn)}
        {node(rOn, 'Reward')}
      </div>
      <div className="mt-2 flex justify-between text-[10px] font-medium text-[#6a5a52]">
        <span className={tOn ? 'text-[#152b50]' : ''}>Trigger</span>
        <span className={hOn ? 'text-[#152b50]' : ''}>Tiny habit</span>
        <span className={rOn ? 'text-[#152b50]' : ''}>Reward</span>
      </div>
    </div>
  )
}

export function LoopBuilderWidget({ funnelId, config }: LoopBuilderWidgetProps) {
  const pathname = usePathname()
  const [phase, setPhase] = useState<Phase>('trigger')
  const [trigger, setTrigger] = useState('')
  const [tinyHabit, setTinyHabit] = useState('')
  const [celebration, setCelebration] = useState<DisciplineCelebrationId | null>(null)
  const [claiming, setClaiming] = useState(false)

  const habitTooBig = tinyHabit.length > 50
  const canTrigger = trigger.trim().length > 0
  const canHabit = tinyHabit.trim().length > 0 && !habitTooBig
  const canReward = celebration !== null

  const rewardDisplay = useMemo(
    () => (celebration ? celebrationLabel(celebration) : '—'),
    [celebration]
  )

  const handleClaim = () => {
    if (!celebration || typeof window === 'undefined') return
    const tr = trigger.trim()
    const hb = tinyHabit.trim()
    if (!tr || !hb) return
    setClaiming(true)
    const discipline_loop = {
      trigger: tr,
      tiny_habit: hb,
      celebration,
      celebration_label: celebrationLabel(celebration),
    }
    const items = [
      `Discipline loop: when "${tr}" → "${hb}" → ${celebrationLabel(celebration)}.`,
      `Streak anchor: one rep today—tomorrow Mrs. Deer checks the trigger first, not your biggest goal.`,
      `Keep the habit atomic for seven days before scaling it up.`,
    ]
    try {
      sessionStorage.setItem(
        'pending_plan',
        JSON.stringify({
          funnelId,
          handoffContext: config.handoffContext,
          disciplineLoop: true,
          discipline_loop,
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

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_200px] lg:items-start">
        <div className="space-y-6">
          {phase === 'trigger' && (
            <div className="rounded-2xl border border-[#f0dcd4] bg-white/80 p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wide text-[#8a6d62]">Step 1 — The trigger</p>
              <p className="mt-3 text-sm leading-relaxed text-[#4a3d38]">
                <span className="font-medium text-[#8a4a3a]">Mrs. Deer:</span> What is the <strong>physical cue</strong>{' '}
                that should start your work day?
              </p>
              <p className="mt-2 text-xs italic text-[#918076]">
                Examples: coffee hits the desk · laptop lid opens · son&apos;s nap starts.
              </p>
              <input
                type="text"
                value={trigger}
                onChange={(e) => setTrigger(e.target.value)}
                placeholder='e.g. "First sip of coffee"'
                className="mt-3 w-full rounded-xl border border-[#e6d8d2] bg-white px-3 py-2.5 text-sm text-[#1e1e1e] outline-none transition focus:border-[#ef725c] focus:ring-2 focus:ring-[#ef725c]/20"
              />
              <button
                type="button"
                disabled={!canTrigger}
                onClick={() => setPhase('habit')}
                className="mt-4 inline-flex items-center justify-center rounded-xl bg-[#ef725c] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#e8654d] disabled:cursor-not-allowed disabled:opacity-45"
              >
                Continue
              </button>
            </div>
          )}

          {(phase === 'habit' || phase === 'reward' || phase === 'summary') && (
            <div className="rounded-2xl border border-[#f0dcd4] bg-white/80 p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wide text-[#8a6d62]">Step 2 — The tiny habit</p>
              <p className="mt-3 text-sm leading-relaxed text-[#4a3d38]">
                <span className="font-medium text-[#8a4a3a]">Mrs. Deer:</span> What is a version of your work so small
                it is <strong>impossible to fail</strong>?
              </p>
              <p className="mt-2 text-xs italic text-[#918076]">
                Examples: open the Figma file · write 10 words · reply to one Slack.
              </p>
              <input
                type="text"
                value={tinyHabit}
                onChange={(e) => setTinyHabit(e.target.value)}
                placeholder='e.g. "Open the Next.js repo"'
                disabled={phase !== 'habit'}
                className="mt-3 w-full rounded-xl border border-[#e6d8d2] bg-white px-3 py-2.5 text-sm text-[#1e1e1e] outline-none transition focus:border-[#ef725c] focus:ring-2 focus:ring-[#ef725c]/20 disabled:opacity-60"
              />
              {habitTooBig && (
                <p className="mt-3 text-sm leading-relaxed text-[#5b4d46]">
                  <span className="font-medium text-[#8a4a3a]">Mrs. Deer:</span> That sounds like a project, not a tiny
                  habit. Can we make it smaller—one motion you could do in under two minutes?
                </p>
              )}
              {phase === 'habit' && (
                <button
                  type="button"
                  disabled={!canHabit}
                  onClick={() => setPhase('reward')}
                  className="mt-4 inline-flex items-center justify-center rounded-xl bg-[#ef725c] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#e8654d] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  Continue
                </button>
              )}
            </div>
          )}

          {(phase === 'reward' || phase === 'summary') && (
            <div
              className={`rounded-2xl border border-[#f0dcd4] bg-white/80 p-5 shadow-sm ${
                phase === 'summary' ? 'pointer-events-none opacity-90' : ''
              }`}
            >
              <p className="text-xs font-bold uppercase tracking-wide text-[#8a6d62]">Step 3 — Celebration</p>
              <p className="mt-3 text-sm leading-relaxed text-[#4a3d38]">
                <span className="font-medium text-[#8a4a3a]">Mrs. Deer:</span> The next time you complete Phase 1,
                let&apos;s celebrate! Pick one below to reset your system:
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Celebration">
                {CELEBRATIONS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    disabled={phase === 'summary'}
                    onClick={() => setCelebration(c.id)}
                    className={`rounded-xl border px-3 py-3 text-left text-sm transition ${
                      celebration === c.id
                        ? 'border-[#ef725c] bg-[#fff3ef] font-medium text-[#7e3f2f] ring-2 ring-[#ef725c]/20'
                        : 'border-[#e0cfc6] bg-white text-[#4a3d38] hover:border-[#ef725c]/45'
                    }`}
                  >
                    <span className="block font-semibold text-[#152b50]">{c.label}</span>
                    <span className="mt-1 block text-[10px] text-[#918076]">{c.hint}</span>
                  </button>
                ))}
              </div>
              {phase === 'reward' && celebration && (
                <button
                  type="button"
                  onClick={() => setPhase('summary')}
                  className="mt-5 inline-flex items-center justify-center rounded-xl bg-[#ef725c] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#e8654d]"
                >
                  Preview my loop
                </button>
              )}
            </div>
          )}

          {phase === 'summary' && celebration && (
            <div className="rounded-2xl border border-[#f0dcd4] bg-[#fff9f6] px-5 py-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wide text-[#ef725c]">Discipline blueprint</p>
              <p className="mt-3 text-base font-semibold text-[#152b50]">Your loop is active</p>
              <ul className="mt-3 space-y-2 text-sm leading-relaxed text-[#5b4d46]">
                <li>
                  <span className="font-medium text-[#4a3d38]">The trigger:</span> {trigger.trim()}
                </li>
                <li>
                  <span className="font-medium text-[#4a3d38]">The habit:</span> {tinyHabit.trim()}
                </li>
                <li>
                  <span className="font-medium text-[#4a3d38]">The reward:</span> {rewardDisplay}
                </li>
              </ul>
              <blockquote className="mt-4 border-l-4 border-[#ef725c] pl-4 text-sm italic leading-relaxed text-[#5b4d46]">
                <span className="font-semibold not-italic text-[#8a4a3a]">Mrs. Deer&apos;s Coaching Plan:</span>{' '}
                I&apos;ve added this loop to your Morning Canvas. Tomorrow, we focus on the Trigger first. We build the
                streak, then we build the business.
              </blockquote>
            </div>
          )}
        </div>

        <div className="lg:pt-2">
          <LoopGraphic phase={phase} />
        </div>
      </div>

      <p className="mt-6 text-xs leading-relaxed text-[#6a5a52]">{strategicSummary}</p>

      {phase === 'summary' && celebration && (
        <button
          type="button"
          onClick={handleClaim}
          disabled={claiming}
          className="mt-5 inline-flex min-w-[240px] items-center justify-center rounded-xl bg-[#ef725c] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#e8654d] disabled:cursor-not-allowed disabled:opacity-45"
        >
          {claiming ? 'Saving…' : 'Claim My Discipline Coach'}
        </button>
      )}
    </section>
  )
}
