'use client'

import { useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import type { BlogInteractiveFunnelConfig, InteractiveFunnelId } from '@/lib/blog-interactive-funnels'
import { unlockBlogTrialGiftInSession } from '@/lib/blog-trial-gift-session'

type Phase = 'topic' | 'fork' | 'reasoning' | 'summary'

type PathKey = 'a' | 'b'

type DecisionLoggerWidgetProps = {
  funnelId: InteractiveFunnelId
  config: BlogInteractiveFunnelConfig
}

function defaultReviewIso(): string {
  const d = new Date()
  d.setDate(d.getDate() + 30)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatReceiptDate(iso: string): string {
  const raw = iso.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  const [y, m, d] = raw.split('-').map((x) => Number(x))
  try {
    return new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(
      new Date(y, m - 1, d)
    )
  } catch {
    return raw
  }
}

function SplitPathGraphic({
  topicShort,
  pathA,
  pathB,
  chosen,
}: {
  topicShort: string
  pathA: string
  pathB: string
  chosen: PathKey | null
}) {
  const aActive = chosen === 'a'
  const bActive = chosen === 'b'
  return (
    <div className="mt-4 rounded-xl border border-[#e6d8d2] bg-white p-4">
      <p className="text-center text-xs font-semibold uppercase tracking-wide text-[#8a4a3a]">Split path</p>
      <div className="relative mx-auto mt-3 max-w-md">
        <svg viewBox="0 0 320 120" className="h-28 w-full text-[#152b50]" aria-hidden="true">
          <path
            d="M160 8 L160 38"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="opacity-40"
          />
          <path
            d="M160 38 L80 78"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className={aActive ? 'text-[#ef725c]' : 'opacity-35'}
          />
          <path
            d="M160 38 L240 78"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className={bActive ? 'text-[#ef725c]' : 'opacity-35'}
          />
          <path
            d="M80 78 L80 108 L160 108"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className={aActive ? 'text-[#ef725c]' : 'opacity-25'}
          />
          <path
            d="M240 78 L240 108 L160 108"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className={bActive ? 'text-[#ef725c]' : 'opacity-25'}
          />
          <circle cx="160" cy="8" r="5" className="fill-[#152b50]" />
          <circle cx="80" cy="78" r="4" className={aActive ? 'fill-[#ef725c]' : 'fill-[#b8a99c]'} />
          <circle cx="240" cy="78" r="4" className={bActive ? 'fill-[#ef725c]' : 'fill-[#b8a99c]'} />
          <circle cx="160" cy="108" r="5" className={chosen ? 'fill-[#ef725c]' : 'fill-[#c9bfb8]'} />
        </svg>
        <p className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1 max-w-[200px] truncate text-center text-[10px] font-medium text-[#5b4d46]">
          {topicShort || 'Decision'}
        </p>
        <p className="absolute left-[10%] top-[52%] max-w-[90px] truncate text-[10px] text-[#5b4d46]">A</p>
        <p className="absolute right-[10%] top-[52%] max-w-[90px] truncate text-right text-[10px] text-[#5b4d46]">B</p>
        <p className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1 text-[10px] font-semibold text-[#152b50]">
          {chosen ? 'Chosen path' : 'Merge'}
        </p>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-[#4a3d38]">
        <p className="rounded border border-[#f0e6e1] bg-[#fdf8f6] p-2 leading-snug">
          <span className="font-semibold text-[#152b50]">A:</span> {pathA || '—'}
        </p>
        <p className="rounded border border-[#f0e6e1] bg-[#fdf8f6] p-2 leading-snug">
          <span className="font-semibold text-[#152b50]">B:</span> {pathB || '—'}
        </p>
      </div>
    </div>
  )
}

export function DecisionLoggerWidget({ funnelId, config }: DecisionLoggerWidgetProps) {
  const pathname = usePathname()
  const [phase, setPhase] = useState<Phase>('topic')
  const [topic, setTopic] = useState('')
  const [optionA, setOptionA] = useState('')
  const [optionB, setOptionB] = useState('')
  const [lean, setLean] = useState<PathKey | null>(null)
  const [reasoning, setReasoning] = useState('')
  const [reviewDate, setReviewDate] = useState(defaultReviewIso)
  const [claiming, setClaiming] = useState(false)

  const topicTrim = topic.trim()
  const optATrim = optionA.trim()
  const optBTrim = optionB.trim()
  const reasoningTrim = reasoning.trim()

  const chosenPathLabel = useMemo(() => {
    if (lean === 'a') return `Path A: ${optATrim}`
    if (lean === 'b') return `Path B: ${optBTrim}`
    return ''
  }, [lean, optATrim, optBTrim])

  const topicShort = useMemo(() => {
    const t = topicTrim
    return t.length > 36 ? `${t.slice(0, 33)}…` : t
  }, [topicTrim])

  const canTopic = topicTrim.length > 0
  const canFork = optATrim.length > 0 && optBTrim.length > 0
  const canReason = lean !== null && reasoningTrim.length > 0 && reviewDate.length > 0

  const handleClaim = () => {
    if (!canReason || lean === null || typeof window === 'undefined') return
    const decision_log = {
      decisionTopic: topicTrim,
      optionA: optATrim,
      optionB: optBTrim,
      chosen_path: lean,
      chosenPath: chosenPathLabel,
      reasoning: reasoningTrim,
      reviewDate,
    }
    const reasonLine =
      reasoningTrim.length > 140 ? `${reasoningTrim.slice(0, 137)}…` : reasoningTrim
    const items = [
      `Decision logged: ${topicTrim} → ${chosenPathLabel}`,
      `Why: ${reasonLine}`,
      `Review on ${formatReceiptDate(reviewDate)}—check results, adjust once.`,
    ]

    setClaiming(true)
    try {
      sessionStorage.setItem(
        'pending_plan',
        JSON.stringify({
          funnelId,
          handoffContext: config.handoffContext,
          decisionLogger: true,
          decision_log,
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
    <section className="my-8 rounded-2xl border border-[#e8dbd5] bg-[#fdf8f6] p-5 shadow-sm sm:p-6">
      <p className="text-xs font-bold uppercase tracking-wide text-[#ef725c]">{config.microPlannerLabel}</p>
      <h3 className="mt-2 text-xl font-semibold text-[#152b50]">{config.title}</h3>
      <p className="mt-1 text-sm text-[#5b4d46]">{config.subtitle}</p>

      {phase === 'topic' && (
        <div className="mt-5 space-y-4">
          <p className="text-sm leading-relaxed text-[#4a3d38]">
            <span className="font-medium text-[#8a4a3a]">Mrs. Deer:</span> What&apos;s the one decision currently
            living rent-free in your head?
          </p>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder='e.g. "Raising prices"'
            className="w-full rounded-lg border border-[#e6d8d2] bg-white px-3 py-2.5 text-sm text-[#1e1e1e] outline-none transition focus:border-[#ef725c] focus:ring-2 focus:ring-[#ef725c]/20"
          />
          <button
            type="button"
            disabled={!canTopic}
            onClick={() => setPhase('fork')}
            className="inline-flex min-w-[160px] items-center justify-center rounded-lg bg-[#152b50] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0f1f3d] disabled:cursor-not-allowed disabled:opacity-45"
          >
            Next
          </button>
        </div>
      )}

      {phase === 'fork' && (
        <div className="mt-5 space-y-4">
          <p className="text-sm leading-relaxed text-[#4a3d38]">
            <span className="font-medium text-[#8a4a3a]">Mrs. Deer:</span> What are the two most likely paths?
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-[#5b4d46]">Path A</span>
              <input
                type="text"
                value={optionA}
                onChange={(e) => setOptionA(e.target.value)}
                placeholder="First fork…"
                className="w-full rounded-lg border border-[#e6d8d2] bg-white px-3 py-2 text-sm text-[#1e1e1e] outline-none transition focus:border-[#ef725c] focus:ring-2 focus:ring-[#ef725c]/20"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-[#5b4d46]">Path B</span>
              <input
                type="text"
                value={optionB}
                onChange={(e) => setOptionB(e.target.value)}
                placeholder="Second fork…"
                className="w-full rounded-lg border border-[#e6d8d2] bg-white px-3 py-2 text-sm text-[#1e1e1e] outline-none transition focus:border-[#ef725c] focus:ring-2 focus:ring-[#ef725c]/20"
              />
            </label>
          </div>
          <SplitPathGraphic topicShort={topicShort} pathA={optATrim} pathB={optBTrim} chosen={null} />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setPhase('topic')}
              className="rounded-lg border border-[#e6d8d2] bg-white px-3 py-2 text-sm font-medium text-[#5b4d46] hover:border-[#ef725c]"
            >
              Back
            </button>
            <button
              type="button"
              disabled={!canFork}
              onClick={() => setPhase('reasoning')}
              className="inline-flex min-w-[160px] items-center justify-center rounded-lg bg-[#152b50] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0f1f3d] disabled:cursor-not-allowed disabled:opacity-45"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {phase === 'reasoning' && (
        <div className="mt-5 space-y-4">
          <p className="text-sm leading-relaxed text-[#4a3d38]">
            <span className="font-medium text-[#8a4a3a]">Mrs. Deer:</span> Which way are you leaning—and why?
          </p>
          <SplitPathGraphic topicShort={topicShort} pathA={optATrim} pathB={optBTrim} chosen={lean} />
          <fieldset className="space-y-2">
            <legend className="text-xs font-semibold uppercase tracking-wide text-[#5b4d46]">
              I&apos;m leaning toward
            </legend>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => setLean('a')}
                className={`flex-1 rounded-xl border px-3 py-3 text-left text-sm transition ${
                  lean === 'a'
                    ? 'border-[#ef725c] bg-[#fff3ef] ring-2 ring-[#ef725c]/25'
                    : 'border-[#e6d8d2] bg-white hover:border-[#c9a227]/50'
                }`}
              >
                <span className="font-semibold text-[#152b50]">Path A</span>
                <span className="mt-1 block text-[#4a3d38]">{optATrim || '—'}</span>
              </button>
              <button
                type="button"
                onClick={() => setLean('b')}
                className={`flex-1 rounded-xl border px-3 py-3 text-left text-sm transition ${
                  lean === 'b'
                    ? 'border-[#ef725c] bg-[#fff3ef] ring-2 ring-[#ef725c]/25'
                    : 'border-[#e6d8d2] bg-white hover:border-[#c9a227]/50'
                }`}
              >
                <span className="font-semibold text-[#152b50]">Path B</span>
                <span className="mt-1 block text-[#4a3d38]">{optBTrim || '—'}</span>
              </button>
            </div>
          </fieldset>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-[#5b4d46]">
              Why are you leaning this way?{' '}
              {lean ? (
                <span className="font-normal normal-case text-[#8a4a3a]">({lean === 'a' ? 'Path A' : 'Path B'})</span>
              ) : null}
            </span>
            <textarea
              value={reasoning}
              onChange={(e) => setReasoning(e.target.value)}
              rows={3}
              placeholder="e.g. Lower friction for new signups…"
              className="w-full resize-y rounded-lg border border-[#e6d8d2] bg-white px-3 py-2 text-sm text-[#1e1e1e] outline-none transition focus:border-[#ef725c] focus:ring-2 focus:ring-[#ef725c]/20"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-[#5b4d46]">Review date</span>
            <input
              type="date"
              value={reviewDate}
              onChange={(e) => setReviewDate(e.target.value)}
              className="w-full max-w-xs rounded-lg border border-[#e6d8d2] bg-white px-3 py-2 text-sm text-[#1e1e1e] outline-none transition focus:border-[#ef725c] focus:ring-2 focus:ring-[#ef725c]/20"
            />
            <span className="text-xs text-[#6a5a52]">Defaults to 30 days out—adjust if you want a different check-in.</span>
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setPhase('fork')}
              className="rounded-lg border border-[#e6d8d2] bg-white px-3 py-2 text-sm font-medium text-[#5b4d46] hover:border-[#ef725c]"
            >
              Back
            </button>
            <button
              type="button"
              disabled={!canReason}
              onClick={() => setPhase('summary')}
              className="inline-flex min-w-[180px] items-center justify-center rounded-lg bg-[#152b50] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0f1f3d] disabled:cursor-not-allowed disabled:opacity-45"
            >
              Show Decision Receipt
            </button>
          </div>
        </div>
      )}

      {phase === 'summary' && lean !== null && (
        <div className="mt-5 space-y-4">
          <SplitPathGraphic topicShort={topicShort} pathA={optATrim} pathB={optBTrim} chosen={lean} />
          <div className="rounded-xl border border-[#e8dbd5] bg-white p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-[#ef725c]">Decision Receipt</p>
            <h4 className="mt-2 text-lg font-semibold text-[#152b50]">Decision Logged: {topicTrim}</h4>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-[#4a3d38]">
              <li>
                <span className="font-semibold text-[#152b50]">Chosen Path:</span> {chosenPathLabel}
              </li>
              <li>
                <span className="font-semibold text-[#152b50]">Primary Reason:</span> {reasoningTrim}
              </li>
              <li>
                <span className="font-semibold text-[#152b50]">Review Date:</span> {formatReceiptDate(reviewDate)}
              </li>
            </ul>
            <p className="mt-4 border-l-4 border-[#ef725c] pl-4 text-sm italic leading-relaxed text-[#5b4d46]">
              <span className="font-semibold not-italic text-[#8a4a3a]">Mrs. Deer&apos;s Note:</span> This loop is now
              closed. Your brain can stop holding the &apos;What-if&apos; weight. I&apos;ll remind you to check the
              results on {formatReceiptDate(reviewDate)}.
            </p>
          </div>
          <p className="text-xs text-[#6a5a52]">{config.strategicSummary}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setPhase('reasoning')}
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
              {claiming ? 'Saving…' : 'Offload My Next Decision'}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
