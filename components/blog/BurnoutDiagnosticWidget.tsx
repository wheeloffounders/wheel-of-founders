'use client'

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { usePathname } from 'next/navigation'
import type {
  BlogInteractiveFunnelConfig,
  BurnoutArchetypeId,
  DiagnosticSymptom,
  InteractiveFunnelId,
} from '@/lib/blog-interactive-funnels'
import { unlockBlogTrialGiftInSession } from '@/lib/blog-trial-gift-session'
import { useBlogWidgetRadar, useRadarCompleteWhen } from '@/components/blog/useBlogWidgetRadar'

const ORDER: BurnoutArchetypeId[] = ['firefighter', 'winner', 'architect']

type BurnoutDiagnosticWidgetProps = {
  funnelId: InteractiveFunnelId
  config: BlogInteractiveFunnelConfig
}

function scoreSelection(
  selected: Set<string>,
  symptoms: DiagnosticSymptom[]
): Record<BurnoutArchetypeId, number> {
  const base: Record<BurnoutArchetypeId, number> = {
    firefighter: 0,
    winner: 0,
    architect: 0,
  }
  for (const id of selected) {
    const s = symptoms.find((x) => x.id === id)
    if (s) base[s.archetype] += 1
  }
  return base
}

function dominantArchetype(
  scores: Record<BurnoutArchetypeId, number>
): { id: BurnoutArchetypeId; pct: number; total: number } {
  const total = ORDER.reduce((n, k) => n + scores[k], 0)
  if (total === 0) return { id: 'firefighter', pct: 0, total: 0 }
  let best: BurnoutArchetypeId = 'firefighter'
  let bestN = -1
  for (const k of ORDER) {
    if (scores[k] > bestN) {
      bestN = scores[k]
      best = k
    }
  }
  return { id: best, pct: Math.round((bestN / total) * 100), total }
}

export function BurnoutDiagnosticWidget({ funnelId, config }: BurnoutDiagnosticWidgetProps) {
  const pathname = usePathname()
  const symptoms = config.diagnosticSymptoms ?? []
  const archetypes = config.diagnosticArchetypes
  const { onFirstPointer, markComplete } = useBlogWidgetRadar(funnelId)

  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [claiming, setClaiming] = useState(false)
  const [ringPulseActive, setRingPulseActive] = useState(false)
  const prevSelectionCount = useRef(0)

  const scores = useMemo(() => scoreSelection(selected, symptoms), [selected, symptoms])
  const totalSel = selected.size
  const dom = useMemo(() => dominantArchetype(scores), [scores])
  const showBlueprint = totalSel >= 3
  const profile = archetypes && dom.total > 0 ? archetypes[dom.id] : null

  useRadarCompleteWhen(showBlueprint, markComplete)

  const pulseGlowColor = useMemo(
    () =>
      !archetypes
        ? '#e8ded8'
        : dom.total > 0
          ? archetypes[dom.id].ringColor
          : archetypes.firefighter.ringColor,
    [dom.total, dom.id, archetypes]
  )

  useEffect(() => {
    if (totalSel >= 3 && prevSelectionCount.current < 3) {
      setRingPulseActive(true)
    }
    prevSelectionCount.current = totalSel
  }, [totalSel])

  useEffect(() => {
    if (!ringPulseActive) return
    const id = window.setTimeout(() => setRingPulseActive(false), 900)
    return () => window.clearTimeout(id)
  }, [ringPulseActive])

  const ringGradient = useMemo(() => {
    if (!archetypes) {
      return 'conic-gradient(from 0deg, #e8ded8 0%, #f4ede9 100%)'
    }
    const t = dom.total
    if (t === 0) {
      return 'conic-gradient(from 0deg, #e8ded8 0%, #f4ede9 100%)'
    }
    const f = (scores.firefighter / t) * 100
    const w = (scores.winner / t) * 100
    const a = (scores.architect / t) * 100
    const cF = archetypes.firefighter.ringColor
    const cW = archetypes.winner.ringColor
    const cA = archetypes.architect.ringColor
    let start = 0
    const seg = (pct: number, color: string) => {
      const from = start
      start += pct
      return `${color} ${from}% ${start}%`
    }
    return `conic-gradient(from -90deg, ${seg(f, cF)}, ${seg(w, cW)}, ${seg(a, cA)})`
  }, [scores, dom.total, archetypes])

  if (!symptoms.length || !archetypes) return null

  const { microPlannerLabel, title, subtitle, strategicSummary } = config

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleCta = () => {
    if (!showBlueprint || !profile || typeof window === 'undefined') return
    setClaiming(true)
    const items = [
      `Burnout scan: ${profile.displayName} (${dom.pct}% signal in your picks)`,
      profile.firstRecoveryMove,
      `Symptoms selected: ${Array.from(selected).join(', ')}`,
    ]
    try {
      sessionStorage.setItem('wof_burnout_diagnosis_id', dom.id)
      sessionStorage.setItem(
        'pending_plan',
        JSON.stringify({
          funnelId,
          handoffContext: config.handoffContext,
          diagnosisId: dom.id,
          diagnosisLabel: profile.displayName,
          symptomIds: Array.from(selected),
          diagnostic: true,
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
      className="my-10 rounded-[1.75rem] border border-[#e6d8d2] bg-gradient-to-br from-[#fffdfb] via-[#fdf8f5] to-[#f7f0eb] p-6 shadow-sm sm:p-8"
      onPointerDownCapture={onFirstPointer}
    >
      <p className="text-xs font-bold uppercase tracking-wide text-[#ef725c]">{microPlannerLabel}</p>
      <h3 className="mt-2 text-xl font-semibold text-[#152b50]">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-[#5b4d46]">{subtitle}</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_280px] lg:items-start">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#8a6d62]">Pulse — tap what is true</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {symptoms.map((s) => {
              const on = selected.has(s.id)
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggle(s.id)}
                  className={`rounded-full border px-3 py-2 text-left text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ef725c]/35 active:scale-[0.98] ${
                    on
                      ? 'border-[#ef725c] bg-[#fff3ef] font-medium text-[#7e3f2f] shadow-sm ring-2 ring-[#ef725c]/20'
                      : 'border-[#e0cfc6] bg-white/90 text-[#4a3d38] hover:border-[#ef725c]/45'
                  }`}
                >
                  {s.label}
                </button>
              )
            })}
          </div>
          <p className="mt-3 text-xs text-[#918076]" aria-live="polite">
            {totalSel >= 3
              ? 'Signal locked. View your recovery blueprint.'
              : 'Scanning for patterns...'}
          </p>
        </div>

        <div className="flex flex-col items-center lg:items-end">
          <p className="mb-3 w-full text-center text-xs font-semibold uppercase tracking-wide text-[#8a6d62] lg:text-right">
            Analysis ring
          </p>
          <div
            className={`relative h-40 w-40 shrink-0 rounded-full p-[6px] shadow-inner transition-all duration-500 ${
              ringPulseActive ? 'burnout-diagnostic-ring-pulse-once' : ''
            }`}
            style={
              {
                background: ringGradient,
                ['--burnout-ring-glow' as string]: `color-mix(in srgb, ${pulseGlowColor} 38%, transparent)`,
              } as CSSProperties
            }
          >
            <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-[#fffdfb] px-4 text-center">
              {dom.total > 0 ? (
                <>
                  <span className="text-2xl font-bold tabular-nums text-[#152b50]">{dom.pct}%</span>
                  <span className="mt-1 text-xs font-medium text-[#6a5a52]">
                    {profile?.shortLabel ?? '…'} signal
                  </span>
                </>
              ) : (
                <span className="text-xs text-[#9a8a82]">Tap symptoms to begin</span>
              )}
            </div>
          </div>
          {dom.total > 0 && (
            <ul className="mt-4 w-full space-y-1 text-xs text-[#6a5a52]">
              {ORDER.map((k) => (
                <li key={k} className="flex justify-between gap-2">
                  <span>{archetypes[k].shortLabel}</span>
                  <span className="tabular-nums">{scores[k]}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {showBlueprint && profile ? (
        <div className="mt-8 rounded-2xl border border-[#f0dcd4] bg-[#fff9f6] px-5 py-5">
          <p className="text-xs font-bold uppercase tracking-wide text-[#ef725c]">Recovery blueprint</p>
          <p className="mt-2 text-sm font-semibold text-[#152b50]">
            You are showing strong <span className="text-[#ef725c]">{profile.displayName}</span> signal (
            {dom.pct}% of your selections).
          </p>
          <p className="mt-3 text-sm leading-relaxed text-[#5b4d46]">
            <span className="font-medium text-[#8a4a3a]">Mrs. Deer:</span> {profile.firstRecoveryMove}
          </p>
        </div>
      ) : (
        <div className="mt-8 rounded-2xl border border-dashed border-[#e0cfc6] bg-white/50 px-5 py-6 text-center text-sm italic text-[#9a8a82]">
          Add three or more symptoms to reveal your recovery blueprint.
        </div>
      )}

      <p className="mt-6 text-xs leading-relaxed text-[#6a5a52]">{strategicSummary}</p>

      <button
        type="button"
        onClick={handleCta}
        disabled={!showBlueprint || claiming}
        className="mt-5 inline-flex min-w-[240px] items-center justify-center rounded-xl bg-[#ef725c] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#e8654d] disabled:cursor-not-allowed disabled:opacity-45"
      >
        {claiming ? 'Saving…' : 'See my full recovery pattern'}
      </button>
    </section>
  )
}
