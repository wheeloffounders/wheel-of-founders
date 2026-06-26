'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import type { BlogInteractiveFunnelConfig, InteractiveFunnelId } from '@/lib/blog-interactive-funnels'
import { unlockBlogTrialGiftInSession } from '@/lib/blog-trial-gift-session'
import { useBlogWidgetRadar, useRadarCompleteWhen } from '@/components/blog/useBlogWidgetRadar'

type Phase = 'dump' | 'king' | 'triage' | 'summary'

type TaskRow = { id: string; text: string }

type TriageTag = 'momentum' | 'maintenance'

type DistillerWidgetProps = {
  funnelId: InteractiveFunnelId
  config: BlogInteractiveFunnelConfig
}

const MIN_ITEMS = 2
const MAX_ITEMS = 7

function useRowIds() {
  const counter = useRef(0)
  return useCallback(() => {
    counter.current += 1
    return `nm-${counter.current}`
  }, [])
}

export function DistillerWidget({ funnelId, config }: DistillerWidgetProps) {
  const pathname = usePathname()
  const nextId = useRowIds()
  const { onFirstPointer, markComplete } = useBlogWidgetRadar(funnelId)
  const [phase, setPhase] = useState<Phase>('dump')
  const [tasks, setTasks] = useState<TaskRow[]>([])
  const [draft, setDraft] = useState('')
  const [primaryId, setPrimaryId] = useState<string | null>(null)
  const [triageById, setTriageById] = useState<Record<string, TriageTag>>({})
  const [claiming, setClaiming] = useState(false)

  useRadarCompleteWhen(phase === 'summary', markComplete)

  const entryList = useMemo(
    () => tasks.map((r) => ({ ...r, text: r.text.trim() })).filter((r) => r.text.length > 0),
    [tasks]
  )

  const canLeaveDump = entryList.length >= MIN_ITEMS && entryList.length <= MAX_ITEMS
  const primaryRow = useMemo(
    () => entryList.find((r) => r.id === primaryId) ?? null,
    [entryList, primaryId]
  )
  const siblings = useMemo(
    () => entryList.filter((r) => r.id !== primaryId),
    [entryList, primaryId]
  )

  const triageComplete = useMemo(() => {
    if (!primaryId || siblings.length === 0) return false
    return siblings.every((s) => triageById[s.id] === 'momentum' || triageById[s.id] === 'maintenance')
  }, [primaryId, siblings, triageById])

  const momentumTasks = useMemo(() => {
    return siblings.filter((s) => triageById[s.id] === 'momentum').map((s) => s.text)
  }, [siblings, triageById])

  const maintenanceTasks = useMemo(() => {
    return siblings.filter((s) => triageById[s.id] === 'maintenance').map((s) => s.text)
  }, [siblings, triageById])

  const topMomentumPair = useMemo(() => momentumTasks.slice(0, 2), [momentumTasks])

  const secondaryLabel = topMomentumPair[0] ?? '—'

  const addFromDraft = () => {
    const t = draft.trim()
    if (!t || tasks.length >= MAX_ITEMS) return
    setTasks((prev) => [...prev, { id: nextId(), text: t }])
    setDraft('')
  }

  const removeTask = (id: string) => {
    setTasks((prev) => prev.filter((r) => r.id !== id))
    setPrimaryId((p) => (p === id ? null : p))
    setTriageById((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  const setTag = (id: string, tag: TriageTag) => {
    setTriageById((prev) => ({ ...prev, [id]: tag }))
  }

  const handleClaim = () => {
    if (!primaryRow || !triageComplete || typeof window === 'undefined') return
    const primary_needle_mover = primaryRow.text
    const momentum_tasks = topMomentumPair
    const maintenance_tasks = maintenanceTasks

    const distilled_tasks = {
      primary_needle_mover,
      momentum_tasks,
      maintenance_tasks,
    }

    const noiseForItem =
      maintenance_tasks.length > 0
        ? maintenance_tasks.slice(0, 5).join('; ')
        : 'Defer reactive busywork until the primary ships.'

    const items = [
      `Primary Needle-Mover: ${primary_needle_mover}`,
      `Momentum support: ${momentum_tasks[0] ?? 'After the primary wins, stack the next growth move—not maintenance.'}`,
      `Noise to ignore (maintenance / reactive): ${noiseForItem}`,
    ]

    setClaiming(true)
    try {
      sessionStorage.setItem(
        'pending_plan',
        JSON.stringify({
          funnelId,
          handoffContext: config.handoffContext,
          needleDistiller: true,
          distilled_tasks,
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

      {phase === 'dump' && (
        <div className="mt-5 space-y-4">
          <p className="text-sm leading-relaxed text-[#4a3d38]">
            <span className="font-medium text-[#8a4a3a]">Mrs. Deer:</span> Type out the top 5–7 things currently
            cluttering your brain. Don&apos;t overthink it.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addFromDraft()
                }
              }}
              placeholder="Type a task, then Enter or Add item"
              disabled={tasks.length >= MAX_ITEMS}
              autoFocus
              className="min-w-0 flex-1 rounded-lg border border-[#e6d8d2] bg-white px-3 py-2.5 text-sm text-[#1e1e1e] outline-none transition focus:border-[#ef725c] focus:ring-2 focus:ring-[#ef725c]/20"
            />
            <button
              type="button"
              onClick={addFromDraft}
              disabled={!draft.trim() || tasks.length >= MAX_ITEMS}
              className="shrink-0 rounded-lg border border-[#e6d8d2] bg-white px-3 py-2 text-sm font-medium text-[#152b50] transition hover:border-[#ef725c] hover:text-[#ef725c] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Add item
            </button>
          </div>
          {tasks.length === 0 ? (
            <div
              className="rounded-lg border border-dashed border-[#e0d2cc] bg-[#faf6f4]/90 px-4 py-6 text-center text-sm text-[#6a5a52]"
              role="status"
            >
              Your list is empty. Add your first task above.
            </div>
          ) : (
            <ul className="space-y-2">
              {tasks.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center gap-2 rounded-lg border border-[#e6d8d2] bg-white px-3 py-2 shadow-sm"
                >
                  <p className="min-w-0 flex-1 text-sm leading-snug text-[#1e1e1e]">{r.text}</p>
                  <button
                    type="button"
                    onClick={() => removeTask(r.id)}
                    className="shrink-0 rounded px-2 py-1 text-xs font-medium text-[#8a4a3a] hover:bg-[#fdf0ec]"
                    aria-label="Remove item"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-[#6a5a52]">
            {entryList.length < MIN_ITEMS
              ? `Add at least ${MIN_ITEMS} items to continue (aim for 5–7).`
              : entryList.length > MAX_ITEMS
                ? `Trim to ${MAX_ITEMS} items max for a fast triage.`
                : 'When your list feels honest, move to the momentum filter.'}
          </p>
          <button
            type="button"
            disabled={!canLeaveDump}
            onClick={() => setPhase('king')}
            className="inline-flex min-w-[160px] items-center justify-center rounded-lg bg-[#152b50] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0f1f3d] disabled:cursor-not-allowed disabled:opacity-45"
          >
            Next: pick the king
          </button>
        </div>
      )}

      {phase === 'king' && (
        <div className="mt-5 space-y-4">
          <p className="text-sm leading-relaxed text-[#4a3d38]">
            <span className="font-medium text-[#8a4a3a]">Mrs. Deer:</span> Now, look at that list. If you could ONLY
            do one today that makes the others easier or unnecessary, which is it?
          </p>
          <ul className="space-y-2">
            {entryList.map((r) => {
              const selected = primaryId === r.id
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => setPrimaryId(r.id)}
                    className={`w-full rounded-xl border px-3 py-3 text-left text-sm leading-snug transition ${
                      selected
                        ? 'border-amber-400 bg-amber-50 text-[#3d2f12] ring-2 ring-amber-200'
                        : 'border-[#e6d8d2] bg-white text-[#1e1e1e] hover:border-[#c9a227]/60'
                    }`}
                  >
                    {r.text}
                    {selected ? (
                      <span className="mt-1 block text-xs font-semibold uppercase tracking-wide text-amber-800">
                        Primary Needle-Mover
                      </span>
                    ) : null}
                  </button>
                </li>
              )
            })}
          </ul>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setPhase('dump')}
              className="rounded-lg border border-[#e6d8d2] bg-white px-3 py-2 text-sm font-medium text-[#5b4d46] hover:border-[#ef725c]"
            >
              Back
            </button>
            <button
              type="button"
              disabled={!primaryId}
              onClick={() => {
                setTriageById({})
                setPhase('triage')
              }}
              className="inline-flex min-w-[160px] items-center justify-center rounded-lg bg-[#152b50] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0f1f3d] disabled:cursor-not-allowed disabled:opacity-45"
            >
              Next: noise check
            </button>
          </div>
        </div>
      )}

      {phase === 'triage' && primaryId && (
        <div className="mt-5 space-y-4">
          <p className="text-sm leading-relaxed text-[#4a3d38]">
            <span className="font-medium text-[#8a4a3a]">Mrs. Deer:</span> These remaining items—are they{' '}
            <strong className="font-semibold text-[#152b50]">Momentum</strong> (Growth) or{' '}
            <strong className="font-semibold text-[#152b50]">Maintenance</strong> (Firefighting)?
          </p>
          {primaryRow ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs text-[#5b4d46]">
              <span className="font-semibold text-amber-900">King locked:</span> {primaryRow.text}
            </p>
          ) : null}
          <ul className="space-y-3">
            {siblings.map((r) => {
              const tag = triageById[r.id]
              const isMaintenance = tag === 'maintenance'
              return (
                <li
                  key={r.id}
                  className={`rounded-xl border border-[#e6d8d2] bg-white p-3 transition ${
                    isMaintenance ? 'opacity-45 grayscale' : 'opacity-100'
                  }`}
                >
                  <p className={`text-sm leading-snug ${isMaintenance ? 'text-[#6a5a52]' : 'text-[#1e1e1e]'}`}>
                    {r.text}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setTag(r.id, 'momentum')}
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                        tag === 'momentum'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-[#eef7f0] text-[#1e5c3a] ring-1 ring-[#c5e6d0] hover:bg-[#dff5e6]'
                      }`}
                    >
                      Momentum
                    </button>
                    <button
                      type="button"
                      onClick={() => setTag(r.id, 'maintenance')}
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                        tag === 'maintenance'
                          ? 'bg-[#8a7a72] text-white shadow-sm'
                          : 'bg-[#f3eeeb] text-[#5b4d46] ring-1 ring-[#e0d5cf] hover:bg-[#ebe4df]'
                      }`}
                    >
                      Maintenance
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setPhase('king')}
              className="rounded-lg border border-[#e6d8d2] bg-white px-3 py-2 text-sm font-medium text-[#5b4d46] hover:border-[#ef725c]"
            >
              Back
            </button>
            <button
              type="button"
              disabled={!triageComplete}
              onClick={() => setPhase('summary')}
              className="inline-flex min-w-[160px] items-center justify-center rounded-lg bg-[#152b50] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0f1f3d] disabled:cursor-not-allowed disabled:opacity-45"
            >
              Show my Smart Constraint
            </button>
          </div>
        </div>
      )}

      {phase === 'summary' && primaryRow && triageComplete && (
        <div className="mt-5 space-y-4">
          <div className="rounded-xl border border-[#e8dbd5] bg-white p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-[#ef725c]">Calibrated plan</p>
            <h4 className="mt-2 text-lg font-semibold text-[#152b50]">Your Smart Constraint for Tomorrow</h4>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-[#4a3d38]">
              <li>
                <span className="font-semibold text-[#152b50]">Primary Needle-Mover:</span> {primaryRow.text}
              </li>
              <li>
                <span className="font-semibold text-[#152b50]">Secondary Support:</span> {secondaryLabel}
              </li>
              <li>
                <span className="font-semibold text-[#152b50]">The &apos;Noise&apos; to Ignore:</span>{' '}
                {maintenanceTasks.length > 0 ? maintenanceTasks.join(' · ') : '—'}
              </li>
            </ol>
            <p className="mt-4 border-l-4 border-[#ef725c] pl-4 text-sm italic leading-relaxed text-[#5b4d46]">
              <span className="font-semibold not-italic text-[#8a4a3a]">The Insight:</span> By focusing on{' '}
              <span className="not-italic font-medium text-[#152b50]">{primaryRow.text}</span>, you&apos;re choosing
              Momentum over the &apos;Busyness Loop.&apos; I&apos;ll hold this focus for you on the Morning Canvas.
            </p>
          </div>
          <p className="text-xs text-[#6a5a52]">{config.strategicSummary}</p>
          <button
            type="button"
            onClick={handleClaim}
            disabled={claiming}
            className="inline-flex min-w-[220px] items-center justify-center rounded-lg bg-[#ef725c] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#e8654d] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {claiming ? 'Saving…' : 'Activate My Smart Constraints'}
          </button>
        </div>
      )}
    </section>
  )
}
