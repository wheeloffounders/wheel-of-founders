'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import type { BlogInteractiveFunnelConfig, InteractiveFunnelId, ReframerPattern } from '@/lib/blog-interactive-funnels'
import { matchReframerPattern } from '@/lib/blog-interactive-funnels'
import { unlockBlogTrialGiftInSession } from '@/lib/blog-trial-gift-session'
import { useBlogWidgetRadar, useRadarCompleteWhen } from '@/components/blog/useBlogWidgetRadar'

type GuiltReframerWidgetProps = {
  funnelId: InteractiveFunnelId
  config: BlogInteractiveFunnelConfig
}

export function GuiltReframerWidget({ funnelId, config }: GuiltReframerWidgetProps) {
  const pathname = usePathname()
  const patterns = config.reframerPatterns
  const { onFirstPointer, markComplete } = useBlogWidgetRadar(funnelId)

  const labels = config.reframerLabels ?? {
    guilt: 'I feel guilty when…',
    belief: 'Because I believe…',
  }

  const [guilt, setGuilt] = useState('')
  const [belief, setBelief] = useState('')
  const [mirrorPattern, setMirrorPattern] = useState<ReframerPattern | undefined>(undefined)
  const [claiming, setClaiming] = useState(false)

  useRadarCompleteWhen(Boolean(mirrorPattern), markComplete)

  if (!patterns?.length) return null

  const seedText = useMemo(() => `${guilt}\n${belief}`.trim(), [guilt, belief])

  useEffect(() => {
    if (guilt.trim().length < 12) {
      setMirrorPattern(undefined)
      return
    }
    setMirrorPattern(undefined)
    const id = window.setTimeout(() => {
      const matched = matchReframerPattern(seedText, patterns)
      setMirrorPattern(matched)
    }, 1000)
    return () => window.clearTimeout(id)
  }, [seedText, guilt, patterns])

  const canRelease = Boolean(mirrorPattern) && guilt.trim().length >= 10

  const handleRelease = () => {
    if (!canRelease || !mirrorPattern || typeof window === 'undefined') return
    setClaiming(true)
    const items = [
      guilt.trim(),
      belief.trim() ? belief.trim() : '(belief unnamed)',
      `Pattern: ${mirrorPattern.patternLabel}`,
    ]
    try {
      sessionStorage.setItem(
        'pending_plan',
        JSON.stringify({
          funnelId,
          handoffContext: config.handoffContext,
          reframer: true,
          guiltPatternId: mirrorPattern.id,
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

  const buttonLabel = claiming
    ? 'Saving…'
    : canRelease
      ? 'Release this weight.'
      : guilt.trim().length < 12
        ? 'Begin naming your guilt…'
        : 'Mrs. Deer is reflecting…'

  return (
    <section
      className="my-10 rounded-[1.75rem] border border-[#ead9cf] bg-gradient-to-b from-[#fffdfb] to-[#fdf6f2] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] sm:p-8"
      onPointerDownCapture={onFirstPointer}
    >
      <p className="text-xs font-bold uppercase tracking-wide text-[#ef725c]">{microPlannerLabel}</p>
      <h3 className="mt-2 text-xl font-semibold text-[#152b50]">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-[#5b4d46]">{subtitle}</p>

      <div className="mt-8 space-y-6">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-[#8a6d62]">
            {labels.guilt}
          </label>
          <textarea
            value={guilt}
            onChange={(e) => setGuilt(e.target.value)}
            rows={4}
            placeholder="Say it plainly—this space is private and yours."
            className="mt-2 w-full resize-y rounded-2xl border border-[#e8d5cb] bg-white/90 px-4 py-3 text-sm leading-relaxed text-[#2c241f] shadow-inner outline-none transition placeholder:text-[#a89890] focus:border-[#ef725c]/70 focus:ring-2 focus:ring-[#ef725c]/15"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-[#8a6d62]">
            {labels.belief}
          </label>
          <textarea
            value={belief}
            onChange={(e) => setBelief(e.target.value)}
            rows={3}
            placeholder="Often quieter—and sharper—than the guilt itself."
            className="mt-2 w-full resize-y rounded-2xl border border-[#e8d5cb] bg-white/90 px-4 py-3 text-sm leading-relaxed text-[#2c241f] shadow-inner outline-none transition placeholder:text-[#a89890] focus:border-[#ef725c]/70 focus:ring-2 focus:ring-[#ef725c]/15"
          />
        </div>
      </div>

      <div
        className={`mt-8 rounded-2xl border border-[#f0dcd4] bg-[#fff9f6] px-5 py-5 transition-all duration-300 ${
          mirrorPattern && guilt.trim().length >= 12 ? 'opacity-100' : 'opacity-50'
        }`}
        aria-live="polite"
      >
        <p className="text-xs font-bold uppercase tracking-wide text-[#ef725c]">The mirror</p>
        {mirrorPattern && guilt.trim().length >= 12 ? (
          <>
            <p className="mt-3 text-sm font-semibold text-[#152b50]">{mirrorPattern.patternLabel}</p>
            <p className="mt-3 text-sm leading-relaxed text-[#5b4d46]">
              Mrs. Deer: {mirrorPattern.reframePrompt}
            </p>
          </>
        ) : (
          <p className="mt-3 text-sm italic text-[#8a7a72]">
            {guilt.trim().length >= 12
              ? 'Hold still—your reflection is forming…'
              : 'Keep typing—there is enough weight here to hold gently.'}
          </p>
        )}
      </div>

      <p className="mt-6 text-xs leading-relaxed text-[#6a5a52]">{strategicSummary}</p>

      <button
        type="button"
        onClick={handleRelease}
        disabled={!canRelease || claiming}
        className="mt-6 inline-flex min-w-[220px] items-center justify-center rounded-xl bg-[#ef725c] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#e8654d] disabled:cursor-not-allowed disabled:opacity-45"
      >
        {buttonLabel}
      </button>
    </section>
  )
}
