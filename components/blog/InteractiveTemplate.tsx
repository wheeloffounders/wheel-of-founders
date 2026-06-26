'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import {
  type InteractiveFunnelId,
  getBlogInteractiveFunnel,
} from '@/lib/blog-interactive-funnels'
import { RoadmapVoteWidget } from '@/components/blog/RoadmapVoteWidget'
import { GuiltReframerWidget } from '@/components/blog/GuiltReframerWidget'
import { BurnoutDiagnosticWidget } from '@/components/blog/BurnoutDiagnosticWidget'
import { NarrativeAuditWidget } from '@/components/blog/NarrativeAuditWidget'
import { StressTesterWidget } from '@/components/blog/StressTesterWidget'
import { ContinuityMapperWidget } from '@/components/blog/ContinuityMapperWidget'
import { GapAnalyzerWidget } from '@/components/blog/GapAnalyzerWidget'
import { LoopBuilderWidget } from '@/components/blog/LoopBuilderWidget'
import { DistillerWidget } from '@/components/blog/DistillerWidget'
import { DecisionLoggerWidget } from '@/components/blog/DecisionLoggerWidget'
import { AlignmentFilterWidget } from '@/components/blog/AlignmentFilterWidget'
import { MeaningMapperWidget } from '@/components/blog/MeaningMapperWidget'
import { VisionBridgeWidget } from '@/components/blog/VisionBridgeWidget'
import { ShutdownWidget } from '@/components/blog/ShutdownWidget'
import { unlockBlogTrialGiftInSession } from '@/lib/blog-trial-gift-session'
import { trackRadarEvent, type RadarSource } from '@/lib/radar'

type InteractiveTemplateProps = {
  /** Registry key; extends to new slugs in `lib/blog-interactive-funnels.ts`. */
  context: InteractiveFunnelId
  placeholders?: [string, string, string]
  /** Optional one-off copy overrides (MDX experiments). */
  title?: string
  subtitle?: string
}

const ACTION_VERBS = ['finish', 'call', 'ship', 'send']

function getFeedback(text: string): string {
  const t = text.trim()
  if (!t) return ''
  const words = t.split(/\s+/).filter(Boolean)
  if (words.length < 3) return 'Keep going... add a bit more detail to make this actionable.'
  if (ACTION_VERBS.some((verb) => new RegExp(`\\b${verb}\\b`, 'i').test(t))) {
    return "That's a high-leverage move. Mrs. Deer is ready to track it."
  }
  if (t.length > 120) return 'Sounds big. Should we break this into two smaller moves?'
  if (t.length > 15) return 'Strong intention. This will move the needle today.'
  return ''
}

export function InteractiveTemplate({
  context: funnelId,
  placeholders: placeholdersOverride,
  title: titleOverride,
  subtitle: subtitleOverride,
}: InteractiveTemplateProps) {
  const pathname = usePathname()
  const radarSource: RadarSource = pathname?.startsWith('/blog') ? 'blog' : 'home'
  const radarStartRef = useRef(false)
  const markRadarStart = () => {
    if (radarStartRef.current) return
    radarStartRef.current = true
    trackRadarEvent(funnelId, 'start', radarSource)
  }
  const config = getBlogInteractiveFunnel(funnelId)

  const placeholders = placeholdersOverride ?? config?.placeholders ?? ['', '', '']
  const title = titleOverride ?? config?.title ?? 'Sketch your three Needle Movers'
  const subtitle =
    subtitleOverride ??
    config?.subtitle ??
    'Start here. Mrs. Deer will carry this into your morning plan after signup.'
  const microLabel = config?.microPlannerLabel ?? 'Micro-Planner'
  const strategicSummary =
    config?.strategicSummary ??
    'Mrs. Deer will carry this into your morning plan after signup.'

  const handoffContext = config?.handoffContext ?? funnelId

  const [inputs, setInputs] = useState<string[]>(['', '', ''])
  const [claiming, setClaiming] = useState(false)
  const [feedback, setFeedback] = useState('')

  const filledCount = useMemo(
    () => inputs.filter((s) => s.trim().length > 0).length,
    [inputs]
  )
  const feedbackSeedText = useMemo(
    () => inputs.find((s) => s.trim().length > 0) ?? '',
    [inputs]
  )

  useEffect(() => {
    if (typeof window === 'undefined') return
    const timer = window.setTimeout(() => {
      setFeedback(getFeedback(feedbackSeedText))
    }, 1000)
    return () => window.clearTimeout(timer)
  }, [feedbackSeedText])

  const handleInputChange = (idx: number, value: string) => {
    setInputs((prev) => prev.map((item, i) => (i === idx ? value : item)))
  }

  const handleClaimPlan = () => {
    if (typeof window === 'undefined') return
    const items = inputs.map((s) => s.trim()).filter((s) => s.length > 0)
    if (items.length === 0) return
    setClaiming(true)
    try {
      trackRadarEvent(funnelId, 'complete', radarSource)
      sessionStorage.setItem(
        'pending_plan',
        JSON.stringify({
          funnelId,
          handoffContext,
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
    q.set('context', handoffContext)
    q.set('funnel', funnelId)
    window.location.assign(`/auth/signup?${q.toString()}`)
  }

  if (!config) {
    return null
  }

  if (config.widgetType === 'roadmap_vote' && config.roadmapVoteOptions?.length) {
    return <RoadmapVoteWidget funnelId={funnelId} config={config} />
  }

  if (config.widgetType === 'reframer' && config.reframerPatterns?.length) {
    return <GuiltReframerWidget funnelId={funnelId} config={config} />
  }

  if (config.widgetType === 'diagnostic' && config.diagnosticSymptoms?.length && config.diagnosticArchetypes) {
    return <BurnoutDiagnosticWidget funnelId={funnelId} config={config} />
  }

  if (config.widgetType === 'narrative_audit') {
    return <NarrativeAuditWidget funnelId={funnelId} config={config} />
  }

  if (config.widgetType === 'stress_tester') {
    return <StressTesterWidget funnelId={funnelId} config={config} />
  }

  if (config.widgetType === 'continuity_mapper') {
    return <ContinuityMapperWidget funnelId={funnelId} config={config} />
  }

  if (config.widgetType === 'gap_analyzer') {
    return <GapAnalyzerWidget funnelId={funnelId} config={config} />
  }

  if (config.widgetType === 'loop_builder') {
    return <LoopBuilderWidget funnelId={funnelId} config={config} />
  }

  if (config.widgetType === 'distiller') {
    return <DistillerWidget funnelId={funnelId} config={config} />
  }

  if (config.widgetType === 'decision_logger') {
    return <DecisionLoggerWidget funnelId={funnelId} config={config} />
  }

  if (config.widgetType === 'alignment_check') {
    return <AlignmentFilterWidget funnelId={funnelId} config={config} />
  }

  if (config.widgetType === 'meaning_mapper') {
    return <MeaningMapperWidget funnelId={funnelId} config={config} />
  }

  if (config.widgetType === 'bridge_engineer') {
    return <VisionBridgeWidget funnelId={funnelId} config={config} />
  }

  if (config.widgetType === 'shutdown_ritual') {
    return <ShutdownWidget funnelId={funnelId} config={config} />
  }

  return (
    <section
      className="my-8 rounded-2xl border border-[#e8dbd5] bg-[#fdf8f6] p-5 shadow-sm sm:p-6"
      onPointerDownCapture={markRadarStart}
    >
      <p className="text-xs font-bold uppercase tracking-wide text-[#ef725c]">{microLabel}</p>
      <h3 className="mt-2 text-xl font-semibold text-[#152b50]">{title}</h3>
      <p className="mt-1 text-sm text-[#5b4d46]">{subtitle}</p>

      <div className="mt-4 space-y-3">
        {inputs.map((value, idx) => (
          <input
            key={idx}
            value={value}
            onFocus={markRadarStart}
            onChange={(e) => handleInputChange(idx, e.target.value)}
            placeholder={placeholders[idx]}
            className="w-full rounded-lg border border-[#e6d8d2] bg-white px-3 py-2 text-sm text-[#1e1e1e] outline-none transition focus:border-[#ef725c] focus:ring-2 focus:ring-[#ef725c]/20"
          />
        ))}
      </div>

      <p
        className={`mt-3 text-sm font-medium text-[#8a4a3a] transition-opacity duration-300 ${
          feedback ? 'opacity-100' : 'opacity-0'
        }`}
        aria-live="polite"
      >
        {feedback ? `Mrs. Deer: ${feedback}` : 'Mrs. Deer is listening...'}
      </p>

      <p className="mt-2 text-xs text-[#6a5a52]">{strategicSummary}</p>

      <button
        type="button"
        onClick={handleClaimPlan}
        disabled={filledCount === 0 || claiming}
        className="mt-4 inline-flex min-w-[146px] items-center justify-center rounded-lg bg-[#ef725c] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#e8654d] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {claiming ? 'Saving your plan...' : 'Claim My Plan'}
      </button>
    </section>
  )
}
