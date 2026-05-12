'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Activity, ArrowLeft, ListTodo, Scale } from 'lucide-react'
import { getBlogInteractiveFunnel, type InteractiveFunnelId } from '@/lib/blog-interactive-funnels'
import { BurnoutDiagnosticWidget } from '@/components/blog/BurnoutDiagnosticWidget'
import { DistillerWidget } from '@/components/blog/DistillerWidget'
import { AlignmentFilterWidget } from '@/components/blog/AlignmentFilterWidget'

type ActiveTool = 'burnout' | 'priority' | 'mission' | null

const TOOLS: {
  id: Exclude<ActiveTool, null>
  funnelId: InteractiveFunnelId
  title: string
  subtitle: string
  blurb: string
  icon: typeof Activity
}[] = [
  {
    id: 'burnout',
    funnelId: 'burnout_diagnostic',
    title: 'Am I burning out?',
    subtitle: 'Burnout check',
    blurb: 'Tap what resonates—get a pattern read and one recovery move.',
    icon: Activity,
  },
  {
    id: 'priority',
    funnelId: 'needle_mover_distiller',
    title: "What's my priority?",
    subtitle: 'Priority sifter',
    blurb: 'Dump the list, name the needle-mover, and tag what can wait.',
    icon: ListTodo,
  },
  {
    id: 'mission',
    funnelId: 'mission_drift_filter',
    title: 'Is this idea worth it?',
    subtitle: 'Mission alignment',
    blurb: 'Run one shiny opportunity through purpose, persona, and talent.',
    icon: Scale,
  },
]

function scrollToHealthCheck() {
  if (typeof document === 'undefined') return
  document.getElementById('founder-health-check')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export function HomeFounderTools() {
  const [active, setActive] = useState<ActiveTool>(null)
  const toolSurfaceRef = useRef<HTMLDivElement>(null)

  const activeMeta = useMemo(() => TOOLS.find((t) => t.id === active), [active])
  const activeConfig = useMemo(
    () => (activeMeta ? getBlogInteractiveFunnel(activeMeta.funnelId) : undefined),
    [activeMeta]
  )

  const clearTool = useCallback(() => setActive(null), [])

  useEffect(() => {
    if (!active) return
    const id = window.requestAnimationFrame(() => {
      toolSurfaceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
    return () => window.cancelAnimationFrame(id)
  }, [active])

  return (
    <>
      {active && activeMeta && activeConfig ? (
        <div ref={toolSurfaceRef} id="home-founder-tool-surface" className="scroll-mt-24 mt-10 lg:mt-12">
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={clearTool}
              className="inline-flex items-center gap-2 rounded-xl border border-[#eaddd7] bg-white px-4 py-2.5 text-sm font-semibold text-[#152b50] shadow-sm transition hover:border-[#ef725c]/40 hover:bg-[#fdfcfb]"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
              Back to overview
            </button>
            <span className="text-sm font-medium text-[#6a5a52]">{activeMeta.subtitle}</span>
          </div>
          <div className="rounded-[1.75rem] border border-[#eaddd7] bg-white p-3 shadow-sm sm:p-5 lg:p-6">
            <div className="max-w-3xl mx-auto [&>section]:my-0">
              {active === 'burnout' ? (
                <BurnoutDiagnosticWidget funnelId="burnout_diagnostic" config={activeConfig} />
              ) : null}
              {active === 'priority' ? (
                <DistillerWidget funnelId="needle_mover_distiller" config={activeConfig} />
              ) : null}
              {active === 'mission' ? (
                <AlignmentFilterWidget funnelId="mission_drift_filter" config={activeConfig} />
              ) : null}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid items-start gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#ef725c]">Welcome to the beta</p>
            <h1 className="mt-5 max-w-4xl text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
              Turn today’s actions into better decisions tomorrow.
            </h1>
            <p className="mt-6 max-w-2xl text-xl leading-8 text-[#4a4a4a]">
              Mrs. Deer helps founders move from chaos to rhythm: plan the day, close the loop, and notice patterns you
              were too busy to see.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href="/auth/signup"
                className="inline-flex items-center justify-center rounded-2xl bg-[#ef725c] px-6 py-4 text-base font-bold text-white shadow-sm transition hover:bg-[#e96650]"
              >
                Start Your Daily Rhythm →
              </Link>
            </div>
            <div className="mt-4 max-w-xl">
              <button
                type="button"
                onClick={scrollToHealthCheck}
                className="text-left text-base font-semibold leading-snug text-[#152b50] underline decoration-[#ef725c]/50 underline-offset-4 transition hover:text-[#ef725c] hover:decoration-[#ef725c]"
              >
                <span
                  className="mr-1.5 inline-block text-[0.95em] opacity-80 saturate-125"
                  aria-hidden
                >
                  🎁
                </span>
                Not sure where to start? Run a 60-second diagnostic to unlock a Pro Trial.
              </button>
            </div>
            <p className="mt-5 text-sm text-[#4a4a4a]">
              40+ founders already shaping the future. No credit card needed during beta.
            </p>
          </div>

          <div className="rounded-[2rem] border border-[#eaddd7] bg-white p-5 shadow-sm">
            <div className="rounded-[1.5rem] bg-[#f9f7f2] p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#ef725c]">Today’s Rhythm</p>
                  <h2 className="mt-1 text-2xl font-bold text-[#152b50]">Your Complete Loop</h2>
                </div>
                <div className="rounded-full bg-[#ef725c]/10 px-3 py-1 text-sm font-bold text-[#ef725c]">Beta</div>
              </div>
              <div className="space-y-3">
                {[
                  ['3 Needle Movers', 'Kill the noise. Pick the 3 moves that actually move the business.'],
                  ['Decision Log', "Capture the 'why' behind heavy choices so they stop looping at 2 AM."],
                  ['Evening Reflection', 'Close the day, spot your patterns, and let tomorrow start lighter.'],
                ].map(([title, body]) => (
                  <div
                    key={title}
                    className="rounded-2xl border border-[#eaddd7] bg-[#fdfcfb] p-4 transition hover:border-[#ef725c]/40"
                  >
                    <h3 className="font-bold">{title}</h3>
                    <p className="mt-1 text-sm leading-6 text-[#4a4a4a]">{body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div
        id="founder-health-check"
        className={`scroll-mt-24 ${active ? 'mt-16 border-t border-[#eaddd7] pt-16' : 'mt-16 border-t border-[#eaddd7] pt-14'} lg:mt-20 lg:pt-16`}
      >
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#ef725c]">Interactive founder tools</p>
        <h2 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight text-[#152b50] sm:text-4xl">
          Founder health check — choose your challenge
        </h2>
        <p className="mt-3 max-w-2xl text-lg leading-relaxed text-[#4a4a4a]">
          Same flows as the journal: your answers save to a morning handoff when you continue into the app.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-3 sm:gap-5">
          {TOOLS.map(({ id, title, subtitle, blurb, icon: Icon }) => {
            const isActive = active === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActive(id)}
                className={`group flex flex-col rounded-2xl border p-5 text-left shadow-sm transition sm:p-6 ${
                  isActive
                    ? 'border-[#ef725c] bg-[#fff8f5] ring-2 ring-[#ef725c]/20'
                    : 'border-[#eaddd7] bg-white hover:border-[#ef725c]/35 hover:bg-[#fdfcfb]'
                }`}
              >
                <div className="mb-4 inline-flex rounded-xl bg-[#f9f7f2] p-3 text-[#ef725c] ring-1 ring-[#eaddd7] transition group-hover:ring-[#ef725c]/30">
                  <Icon className="h-6 w-6" strokeWidth={1.75} aria-hidden />
                </div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#8a4a3a]">{subtitle}</p>
                <h3 className="mt-2 text-lg font-bold text-[#152b50]">{title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-[#4a4a4a]">{blurb}</p>
                <span className="mt-4 text-sm font-bold text-[#ef725c]">
                  {isActive ? 'Showing above' : 'Open tool →'}
                </span>
              </button>
            )
          })}
        </div>

        {active ? (
          <p className="mt-6 text-center text-sm text-[#6a5a52]">
            Pick another card to switch tools, or use{' '}
            <span className="font-semibold text-[#152b50]">Back to overview</span> to return to the hero.
          </p>
        ) : null}
      </div>
    </>
  )
}
