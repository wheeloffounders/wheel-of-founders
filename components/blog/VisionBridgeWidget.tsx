'use client'

import { useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import type { BlogInteractiveFunnelConfig, InteractiveFunnelId } from '@/lib/blog-interactive-funnels'
import { unlockBlogTrialGiftInSession } from '@/lib/blog-trial-gift-session'
import { useBlogWidgetRadar, useRadarCompleteWhen } from '@/components/blog/useBlogWidgetRadar'

type Phase = 'vision' | 'task' | 'brick' | 'summary'

type VisionBridgeWidgetProps = {
  funnelId: InteractiveFunnelId
  config: BlogInteractiveFunnelConfig
}

function ChasmBridgeGraphic({ stepsFilled }: { stepsFilled: number }) {
  const t = Math.min(3, Math.max(0, stepsFilled)) / 3
  const bridgeLen = 220
  const dashOffset = bridgeLen * (1 - t)

  return (
    <div className="mx-auto max-w-md">
      <p className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-[#8a4a3a]">
        Vision ↔ grind
      </p>
      <svg viewBox="0 0 360 130" className="h-32 w-full text-[#152b50]" aria-hidden="true">
        <defs>
          <linearGradient id="vb-bridge" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef725c" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.95" />
          </linearGradient>
        </defs>
        <path
          d="M0,125 L0,55 L75,55 L75,125 Z"
          className="fill-[#e8dfd8] stroke-[#d4c4bc]"
          strokeWidth="1.5"
        />
        <path
          d="M285,55 L360,55 L360,125 L285,125 Z"
          className="fill-[#e8dfd8] stroke-[#d4c4bc]"
          strokeWidth="1.5"
        />
        <text x="28" y="48" textAnchor="middle" className="fill-[#5b4d46] text-[10px] font-bold">
          Vision
        </text>
        <text x="322" y="48" textAnchor="middle" className="fill-[#5b4d46] text-[10px] font-bold">
          Grind
        </text>
        <line x1="75" y1="88" x2="285" y2="88" stroke="#e0d5cf" strokeWidth="4" strokeLinecap="round" />
        <line
          x1="75"
          y1="88"
          x2="285"
          y2="88"
          stroke="url(#vb-bridge)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={bridgeLen}
          strokeDashoffset={dashOffset}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
        <circle cx="75" cy="88" r="5" className={stepsFilled >= 1 ? 'fill-[#ef725c]' : 'fill-[#c9bfb8]'} />
        <circle cx="180" cy="88" r="4" className={stepsFilled >= 2 ? 'fill-[#f59e0b]' : 'fill-[#d4c4bc]'} />
        <circle cx="285" cy="88" r="5" className={stepsFilled >= 3 ? 'fill-[#ef725c]' : 'fill-[#c9bfb8]'} />
      </svg>
      <p className="mt-1 text-center text-[11px] text-[#6a5a52]">
        Each step lays another plank across the chasm.
      </p>
    </div>
  )
}

export function VisionBridgeWidget({ funnelId, config }: VisionBridgeWidgetProps) {
  const pathname = usePathname()
  const { onFirstPointer, markComplete } = useBlogWidgetRadar(funnelId)
  const [phase, setPhase] = useState<Phase>('vision')
  const [bigVision, setBigVision] = useState('')
  const [currentTask, setCurrentTask] = useState('')
  const [dailyBrick, setDailyBrick] = useState('')
  const [claiming, setClaiming] = useState(false)

  useRadarCompleteWhen(phase === 'summary', markComplete)

  const vTrim = bigVision.trim()
  const tTrim = currentTask.trim()
  const bTrim = dailyBrick.trim()

  const stepsFilled = useMemo(() => {
    let n = 0
    if (vTrim) n += 1
    if (tTrim) n += 1
    if (bTrim) n += 1
    return n
  }, [vTrim, tTrim, bTrim])

  const canVision = vTrim.length > 0
  const canTask = tTrim.length > 0
  const canBrick = bTrim.length > 0

  const visionShort = vTrim.length > 48 ? `${vTrim.slice(0, 45)}…` : vTrim

  const handleClaim = () => {
    if (!canBrick || typeof window === 'undefined') return
    const vision_bridge = {
      bigVision: vTrim,
      currentTask: tTrim,
      dailyBrick: bTrim,
    }
    const items = [
      `Vision bridge: "${vTrim}" → today's brick: ${bTrim}`,
      `Translation task (carries the vision): ${tTrim}`,
      `Lay this brick first—reactive expansion waits until the castle has one more row.`,
    ]

    setClaiming(true)
    try {
      sessionStorage.setItem(
        'pending_plan',
        JSON.stringify({
          funnelId,
          handoffContext: config.handoffContext,
          visionBridge: true,
          vision_bridge,
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

      <ChasmBridgeGraphic stepsFilled={stepsFilled} />

      {phase === 'vision' && (
        <div className="mt-5 space-y-4">
          <p className="text-sm leading-relaxed text-[#4a3d38]">
            <span className="font-medium text-[#8a4a3a]">Mrs. Deer:</span> What is the one big, shiny vision that feels
            far away right now?
          </p>
          <textarea
            value={bigVision}
            onChange={(e) => setBigVision(e.target.value)}
            rows={3}
            placeholder='e.g. "Building a $10M category-defining app"'
            className="w-full resize-y rounded-lg border border-[#e6d8d2] bg-white px-3 py-2.5 text-sm text-[#1e1e1e] outline-none transition focus:border-[#ef725c] focus:ring-2 focus:ring-[#ef725c]/20"
          />
          <button
            type="button"
            disabled={!canVision}
            onClick={() => setPhase('task')}
            className="inline-flex min-w-[160px] items-center justify-center rounded-lg bg-[#152b50] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0f1f3d] disabled:cursor-not-allowed disabled:opacity-45"
          >
            Next: translate to today
          </button>
        </div>
      )}

      {phase === 'task' && (
        <div className="mt-5 space-y-4">
          <p className="text-sm leading-relaxed text-[#4a3d38]">
            <span className="font-medium text-[#8a4a3a]">Mrs. Deer:</span> Looking at your to-do list, which task
            actually carries the weight of{' '}
            <strong className="text-[#152b50]">{visionShort || 'that vision'}</strong>?
          </p>
          <textarea
            value={currentTask}
            onChange={(e) => setCurrentTask(e.target.value)}
            rows={3}
            placeholder="The item that isn't busywork—it's the one that moves the future you named."
            className="w-full resize-y rounded-lg border border-[#e6d8d2] bg-white px-3 py-2.5 text-sm text-[#1e1e1e] outline-none transition focus:border-[#ef725c] focus:ring-2 focus:ring-[#ef725c]/20"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setPhase('vision')}
              className="rounded-lg border border-[#e6d8d2] bg-white px-3 py-2 text-sm font-medium text-[#5b4d46] hover:border-[#ef725c]"
            >
              Back
            </button>
            <button
              type="button"
              disabled={!canTask}
              onClick={() => setPhase('brick')}
              className="inline-flex min-w-[160px] items-center justify-center rounded-lg bg-[#152b50] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0f1f3d] disabled:cursor-not-allowed disabled:opacity-45"
            >
              Next: daily brick
            </button>
          </div>
        </div>
      )}

      {phase === 'brick' && (
        <div className="mt-5 space-y-4">
          <p className="text-sm leading-relaxed text-[#4a3d38]">
            <span className="font-medium text-[#8a4a3a]">Mrs. Deer:</span> If you could only do{' '}
            <strong className="text-[#152b50]">one small version</strong> of that task today to prove the vision is
            real, what is it?
          </p>
          <textarea
            value={dailyBrick}
            onChange={(e) => setDailyBrick(e.target.value)}
            rows={2}
            placeholder="One brick only—small enough to ship before noon."
            className="w-full resize-y rounded-lg border border-[#e6d8d2] bg-white px-3 py-2.5 text-sm text-[#1e1e1e] outline-none transition focus:border-[#ef725c] focus:ring-2 focus:ring-[#ef725c]/20"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setPhase('task')}
              className="rounded-lg border border-[#e6d8d2] bg-white px-3 py-2 text-sm font-medium text-[#5b4d46] hover:border-[#ef725c]"
            >
              Back
            </button>
            <button
              type="button"
              disabled={!canBrick}
              onClick={() => setPhase('summary')}
              className="inline-flex min-w-[180px] items-center justify-center rounded-lg bg-[#152b50] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0f1f3d] disabled:cursor-not-allowed disabled:opacity-45"
            >
              Show Strategic Alignment Card
            </button>
          </div>
        </div>
      )}

      {phase === 'summary' && (
        <div className="mt-5 space-y-4">
          <div className="rounded-xl border border-[#e8dbd5] bg-white p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-[#ef725c]">Strategic alignment</p>
            <h4 className="mt-2 text-lg font-semibold text-[#152b50]">Vision Bridge: {visionShort}</h4>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-[#4a3d38]">
              <li>
                <span className="font-semibold text-[#152b50]">The Distant Goal:</span> {vTrim}
              </li>
              <li>
                <span className="font-semibold text-[#152b50]">Today&apos;s Daily Brick:</span> {bTrim}
              </li>
              <li>
                <span className="font-semibold text-[#152b50]">Connection Type:</span> Momentum / growth
              </li>
            </ul>
            <p className="mt-2 text-sm italic text-[#5b4d46]">Translation (what carries the vision): {tTrim}</p>
            <p className="mt-4 border-l-4 border-[#ef725c] pl-4 text-sm italic leading-relaxed text-[#5b4d46]">
              <span className="font-semibold not-italic text-[#8a4a3a]">Mrs. Deer&apos;s Note:</span> The chasm just
              got smaller. By laying this one brick, you aren&apos;t just &apos;working&apos;—you are building a
              castle. I&apos;ll hold this connection for you on your Morning Canvas.
            </p>
          </div>
          <p className="text-xs text-[#6a5a52]">{config.strategicSummary}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setPhase('brick')}
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
              {claiming ? 'Saving…' : 'Lay My Daily Brick'}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
