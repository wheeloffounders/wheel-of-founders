'use client'

import { useEffect, useState } from 'react'
import { trackEvent } from '@/lib/analytics/preview-events'
import { SmartAuthLink } from '@/components/SmartAuthLink'

type DoorType = 'one-way' | 'two-way'

export function DecisionParserWidget() {
  const [decision, setDecision] = useState('')
  const [doorType, setDoorType] = useState<DoorType | null>(null)
  const [loggedCompletion, setLoggedCompletion] = useState(false)

  const canClarify = decision.trim().length > 0
  const showFinal = canClarify && doorType !== null

  useEffect(() => {
    if (showFinal && !loggedCompletion) {
      trackEvent('decision_parser_used', { stage: 'completed', doorType })
      setLoggedCompletion(true)
    }
  }, [showFinal, loggedCompletion, doorType])

  const guidance =
    doorType === 'one-way'
      ? "This is a heavy lift. Let's capture the core risks so you can stop replaying them."
      : 'Two-way doors are reversible. Choose the best next step, timebox it, and review after real-world feedback.'
  const ctaLabel =
    doorType === 'two-way' ? 'Commit to Experiment & Save' : 'Log Decision & Save'

  return (
    <section className="my-10 rounded-3xl border border-[#eaddd7] bg-[#fff8f5] p-6 pb-32 shadow-sm sm:p-7 sm:pb-32">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#ef725c]">2 AM Decision Parser</p>
      <h3 className="mt-2 text-2xl font-semibold text-[#152b50]">
        Let Mrs. Deer help you close this loop
      </h3>
      <p className="mt-2 text-sm leading-6 text-[#4a4a4a]">
        Capture one decision, clarify reversibility, then save it before your brain starts replaying it.
      </p>

      <label className="mt-5 block text-sm font-medium text-[#1a1a1a]">
        What&apos;s the decision keeping you up right now?
      </label>
      <textarea
        value={decision}
        onChange={(event) => {
          setDecision(event.target.value)
          if (doorType) setDoorType(null)
          if (loggedCompletion) setLoggedCompletion(false)
        }}
        rows={3}
        className="mt-2 w-full rounded-2xl border border-[#e5d5ce] bg-white px-4 py-3 text-sm text-[#1a1a1a] outline-none transition focus:border-[#ef725c] focus:ring-2 focus:ring-[#ef725c]/20"
        placeholder="Example: Should I pause paid ads for two weeks and rework onboarding first?"
      />

      {canClarify ? (
        <div className="mt-5 rounded-2xl border border-[#f2d7ce] bg-white p-4">
          <p className="text-sm font-semibold text-[#152b50]">
            Mrs. Deer asks: Is this a one-way door or a two-way door decision?
          </p>
          <p className="mt-1 text-xs text-[#4a4a4a]">
            One-way = hard to reverse. Two-way = reversible experiment.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setDoorType('one-way')}
              className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                doorType === 'one-way'
                  ? 'border-[#ef725c] bg-[#ef725c] text-white'
                  : 'border-[#e5d5ce] bg-white text-[#1a1a1a] hover:border-[#ef725c]'
              }`}
            >
              One-way door
            </button>
            <button
              type="button"
              onClick={() => setDoorType('two-way')}
              className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                doorType === 'two-way'
                  ? 'border-[#ef725c] bg-[#ef725c] text-white'
                  : 'border-[#e5d5ce] bg-white text-[#1a1a1a] hover:border-[#ef725c]'
              }`}
            >
              Two-way door
            </button>
          </div>
        </div>
      ) : null}

      {showFinal ? (
        <div className="mt-5 rounded-2xl border border-[#e5d5ce] bg-[#fffdfa] p-4">
          <p className="text-base italic leading-7 text-[#8a4a3a]">{guidance}</p>
          <SmartAuthLink
            className="mt-4 mb-8 inline-flex rounded-xl bg-[#ef725c] px-4 py-2.5 text-sm font-bold transition-transform hover:bg-[#e8654d] active:scale-95"
            loggedOutLabel={ctaLabel}
            loggedInLabel={ctaLabel}
            loggedOutHref="/auth/signup"
            loggedInHref="/today?context=decision"
            onBeforeNavigate={({ isLoggedIn }) => {
              if (isLoggedIn || !doorType) return
              const payload = {
                decision: decision.trim(),
                doorType,
                capturedAt: new Date().toISOString(),
                source: 'decision-parser-widget',
              }
              localStorage.setItem('wof_pending_decision_parser', JSON.stringify(payload))
              trackEvent('decision_parser_saved_locally', { doorType, source: payload.source })
            }}
          >
            <span style={{ color: 'white', fontWeight: 'bold' }}>{ctaLabel}</span>
          </SmartAuthLink>
        </div>
      ) : null}
    </section>
  )
}
