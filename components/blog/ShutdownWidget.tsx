'use client'

import { useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import type { BlogInteractiveFunnelConfig, InteractiveFunnelId } from '@/lib/blog-interactive-funnels'
import { unlockBlogTrialGiftInSession } from '@/lib/blog-trial-gift-session'

type Phase = 'itch' | 'calibrate' | 'define' | 'summary'

type ShutdownWidgetProps = {
  funnelId: InteractiveFunnelId
  config: BlogInteractiveFunnelConfig
}

function LaptopLidGraphic({ stepsFilled }: { stepsFilled: number }) {
  const t = Math.min(3, Math.max(0, stepsFilled)) / 3
  const lidAngle = -8 - t * 78

  return (
    <div className="mx-auto max-w-sm">
      <p className="mb-2 text-center text-xs font-semibold uppercase tracking-wide text-[#8a4a3a]">
        Laptop lid
      </p>
      <svg viewBox="0 0 280 160" className="h-36 w-full text-[#152b50]" aria-hidden="true">
        <defs>
          <linearGradient id="sd-base" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#e8dfd8" />
            <stop offset="100%" stopColor="#d4c4bc" />
          </linearGradient>
          <linearGradient id="sd-screen" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#152b50" stopOpacity="0.92" />
            <stop offset="100%" stopColor="#1e3a5f" stopOpacity="0.88" />
          </linearGradient>
        </defs>
        <rect x="38" y="118" width="204" height="14" rx="4" fill="url(#sd-base)" stroke="#c9bfb8" strokeWidth="1.2" />
        <rect x="48" y="124" width="184" height="6" rx="2" fill="#b8a99e" opacity="0.55" />
        <g transform={`rotate(${lidAngle} 140 92)`}>
          <path
            d="M44,92 L236,92 L228,118 L52,118 Z"
            fill="url(#sd-base)"
            stroke="#c9bfb8"
            strokeWidth="1.2"
          />
          <rect x="58" y="98" width="164" height="14" rx="2" fill="url(#sd-screen)" opacity={0.35 + t * 0.55} />
        </g>
        <text x="140" y="86" textAnchor="middle" className="fill-[#6a5a52] text-[9px] font-medium">
          {stepsFilled >= 3 ? 'Closed enough' : 'Closing as you commit…'}
        </text>
      </svg>
    </div>
  )
}

export function ShutdownWidget({ funnelId, config }: ShutdownWidgetProps) {
  const pathname = usePathname()
  const [phase, setPhase] = useState<Phase>('itch')
  const [workItch, setWorkItch] = useState('')
  const [calibration, setCalibration] = useState<'revenue' | 'presence' | null>(null)
  const [finishedEnough, setFinishedEnough] = useState('')
  const [presencePreset, setPresencePreset] = useState<string | null>(null)
  const [presenceCustom, setPresenceCustom] = useState('')
  const [claiming, setClaiming] = useState(false)

  const itchTrim = workItch.trim()
  const enoughTrim = finishedEnough.trim()
  const presenceFor = (presenceCustom.trim() || presencePreset?.trim() || '').trim()

  const stepsFilled = useMemo(() => {
    let n = 0
    if (itchTrim) n += 1
    if (calibration) n += 1
    if (enoughTrim && presenceFor) n += 1
    return n
  }, [itchTrim, calibration, enoughTrim, presenceFor])

  const canItch = itchTrim.length > 0
  const canCalibrate = calibration !== null
  const canDefine = enoughTrim.length > 0 && presenceFor.length > 0

  const calibrationLabel =
    calibration === 'revenue'
      ? 'This could move revenue tomorrow.'
      : calibration === 'presence'
        ? 'This is polish / presence wins—I am done chasing it tonight.'
        : ''

  const handleClaim = () => {
    if (!canDefine || !calibration || typeof window === 'undefined') return
    const shutdown_logic = {
      workItch: itchTrim,
      calibration,
      finishedEnough: enoughTrim,
      presenceFor,
    }
    const items = [
      `Finished enough: ${enoughTrim}`,
      `Itch parked: ${itchTrim}`,
      `100% presence for: ${presenceFor}`,
    ]

    setClaiming(true)
    try {
      sessionStorage.setItem(
        'pending_plan',
        JSON.stringify({
          funnelId,
          handoffContext: config.handoffContext,
          shutdownRitual: true,
          shutdown_logic,
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

      <LaptopLidGraphic stepsFilled={stepsFilled} />

      {phase === 'itch' && (
        <div className="mt-5 space-y-4">
          <p className="text-sm leading-relaxed text-[#4a3d38]">
            <span className="font-medium text-[#8a4a3a]">Step 1 — The pressure:</span> What is the one itch or bug
            currently making it hard to close your laptop?
          </p>
          <textarea
            value={workItch}
            onChange={(e) => setWorkItch(e.target.value)}
            rows={3}
            placeholder='e.g. "That CSS alignment on the footer"'
            className="w-full resize-y rounded-lg border border-[#e6d8d2] bg-white px-3 py-2.5 text-sm text-[#1e1e1e] outline-none transition focus:border-[#ef725c] focus:ring-2 focus:ring-[#ef725c]/20"
          />
          <button
            type="button"
            disabled={!canItch}
            onClick={() => setPhase('calibrate')}
            className="inline-flex items-center justify-center rounded-lg bg-[#152b50] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0f2240] disabled:cursor-not-allowed disabled:opacity-45"
          >
            Continue
          </button>
        </div>
      )}

      {phase === 'calibrate' && (
        <div className="mt-5 space-y-4">
          <p className="text-sm leading-relaxed text-[#4a3d38]">
            <span className="font-medium text-[#8a4a3a]">Step 2 — Presence vs profit:</span> If you fix this now, will
            it change your revenue tomorrow? Or is it a distraction from being present?
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setCalibration('revenue')}
              className={`rounded-xl border px-3 py-3 text-left text-sm font-medium transition ${
                calibration === 'revenue'
                  ? 'border-[#ef725c] bg-white ring-2 ring-[#ef725c]/25'
                  : 'border-[#e6d8d2] bg-white hover:border-[#ef725c]/50'
              }`}
            >
              Could move revenue tomorrow
            </button>
            <button
              type="button"
              onClick={() => setCalibration('presence')}
              className={`rounded-xl border px-3 py-3 text-left text-sm font-medium transition ${
                calibration === 'presence'
                  ? 'border-[#ef725c] bg-white ring-2 ring-[#ef725c]/25'
                  : 'border-[#e6d8d2] bg-white hover:border-[#ef725c]/50'
              }`}
            >
              Polish / presence wins—I need to walk away
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setPhase('itch')}
              className="rounded-lg border border-[#e6d8d2] bg-white px-3 py-2 text-sm text-[#5b4d46] hover:bg-[#faf6f4]"
            >
              Back
            </button>
            <button
              type="button"
              disabled={!canCalibrate}
              onClick={() => setPhase('define')}
              className="rounded-lg bg-[#152b50] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {phase === 'define' && (
        <div className="mt-5 space-y-4">
          <p className="text-sm leading-relaxed text-[#4a3d38]">
            <span className="font-medium text-[#8a4a3a]">Step 3 — The definition:</span> What is the absolute minimum
            &quot;Finished Enough&quot; version of this that lets you walk away with a clean conscience?
          </p>
          <textarea
            value={finishedEnough}
            onChange={(e) => setFinishedEnough(e.target.value)}
            rows={3}
            placeholder='e.g. "Footer aligned on desktop; mobile can ship tomorrow"'
            className="w-full resize-y rounded-lg border border-[#e6d8d2] bg-white px-3 py-2.5 text-sm text-[#1e1e1e] outline-none transition focus:border-[#ef725c] focus:ring-2 focus:ring-[#ef725c]/20"
          />
          <p className="text-xs font-semibold uppercase tracking-wide text-[#8a4a3a]">Tonight, 100% presence for</p>
          <div className="flex flex-wrap gap-2">
            {['My son', 'My family', 'Myself'].map((label) => (
              <button
                key={label}
                type="button"
                onClick={() => {
                  setPresencePreset(label)
                  setPresenceCustom('')
                }}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  presencePreset === label && !presenceCustom.trim()
                    ? 'border-[#ef725c] bg-[#fff5f2] text-[#c2410c]'
                    : 'border-[#e6d8d2] bg-white text-[#5b4d46] hover:border-[#ef725c]/40'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <input
            value={presenceCustom}
            onChange={(e) => {
              setPresenceCustom(e.target.value)
              if (e.target.value.trim()) setPresencePreset(null)
            }}
            placeholder="Or name who gets your full presence (e.g. Jake)"
            className="w-full rounded-lg border border-[#e6d8d2] bg-white px-3 py-2 text-sm text-[#1e1e1e] outline-none transition focus:border-[#ef725c] focus:ring-2 focus:ring-[#ef725c]/20"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setPhase('calibrate')}
              className="rounded-lg border border-[#e6d8d2] bg-white px-3 py-2 text-sm text-[#5b4d46] hover:bg-[#faf6f4]"
            >
              Back
            </button>
            <button
              type="button"
              disabled={!canDefine}
              onClick={() => setPhase('summary')}
              className="rounded-lg bg-[#152b50] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45"
            >
              See my permit
            </button>
          </div>
        </div>
      )}

      {phase === 'summary' && (
        <div className="mt-5 space-y-4 rounded-xl border border-[#e0d4ce] bg-white/90 p-4 shadow-inner">
          <p className="text-center text-xs font-bold uppercase tracking-[0.12em] text-[#ef725c]">Presence permit</p>
          <p className="text-center text-lg font-semibold text-[#152b50]">Status: Finished Enough</p>
          <ul className="space-y-2 text-sm text-[#4a3d38]">
            <li>
              <span className="font-semibold text-[#152b50]">The itch:</span> {itchTrim}
            </li>
            <li>
              <span className="font-semibold text-[#152b50]">Calibration:</span> {calibrationLabel}
            </li>
            <li>
              <span className="font-semibold text-[#152b50]">The minimum:</span> {enoughTrim}
            </li>
            <li>
              <span className="font-semibold text-[#152b50]">The reward:</span> 100% presence for {presenceFor}
            </li>
          </ul>
          <p className="rounded-lg bg-[#fdf8f6] p-3 text-sm italic leading-relaxed text-[#5b4d46]">
            <span className="font-semibold not-italic text-[#8a4a3a]">Mrs. Deer&apos;s note:</span> The cracks are
            enough. I&apos;ve logged <span className="font-medium not-italic">{enoughTrim}</span> as your win. Close
            the laptop. I&apos;ll be here in the morning.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setPhase('define')}
              className="rounded-lg border border-[#e6d8d2] bg-white px-3 py-2 text-sm text-[#5b4d46] hover:bg-[#faf6f4]"
            >
              Edit
            </button>
            <button
              type="button"
              disabled={claiming}
              onClick={handleClaim}
              className="rounded-lg bg-[#ef725c] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#e8654d] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {claiming ? 'Saving…' : 'Claim My Presence'}
            </button>
          </div>
        </div>
      )}

      <p className="mt-4 text-xs text-[#6a5a52]">{config.strategicSummary}</p>
    </section>
  )
}
