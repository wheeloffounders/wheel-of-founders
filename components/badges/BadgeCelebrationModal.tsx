'use client'

import { Fragment, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import confetti from 'canvas-confetti'
import type { JourneyBadge } from '@/lib/types/founder-dna'
import { MrsDeerAvatar } from '@/components/MrsDeerAvatar'
import { Button } from '@/components/ui/button'
import { getBadgeCelebrationCopy } from '@/lib/badges/badge-messages'

export type BadgeCelebrationModalProps = {
  open: boolean
  badge: JourneyBadge | null
  /** Epic tier — burst once when modal opens */
  withConfetti?: boolean
  /** Optional user goal text for founder_story celebration */
  founderGoalText?: string | null
  onContinue: () => void
}

function triggerConfetti() {
  void confetti({
    particleCount: 120,
    spread: 72,
    origin: { y: 0.65 },
    colors: ['#ef725c', '#f4a261', '#2a9d8f', '#e9c46a', '#264653'],
  })
}

export function BadgeCelebrationModal({
  open,
  badge,
  withConfetti,
  founderGoalText,
  onContinue,
}: BadgeCelebrationModalProps) {
  const router = useRouter()
  const firedConfetti = useRef(false)

  useEffect(() => {
    if (!open || !withConfetti) {
      firedConfetti.current = false
      return
    }
    if (firedConfetti.current) return
    firedConfetti.current = true
    const t = window.setTimeout(() => triggerConfetti(), 150)
    return () => window.clearTimeout(t)
  }, [open, withConfetti])

  if (!open || !badge) return null

  const copy = getBadgeCelebrationCopy(badge.name)
  const goalText = (founderGoalText ?? '').trim()

  const onCta = (href: string) => {
    router.push(href)
    onContinue()
  }

  if (copy) {
    return (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="badge-celebration-title"
      >
        <div className="relative w-full max-w-md rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#ef725c] via-amber-400 to-teal-500" aria-hidden />

          <div className="p-6 pt-8 text-left">
            <div className="flex gap-3 items-start">
              <MrsDeerAvatar expression="celebratory" size="sm" className="shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1 space-y-3">
                {copy.paragraphs.map((paragraph, i) => (
                  <Fragment key={i}>
                    <p
                      id={i === 0 ? 'badge-celebration-title' : undefined}
                      className="text-base italic text-gray-900 dark:text-gray-100 font-medium leading-relaxed"
                    >
                      {paragraph}
                    </p>
                    {i === 0 && copy.includeFounderGoalQuote && goalText ? (
                      <div className="rounded-xl bg-amber-50/90 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 p-4">
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">You named it:</p>
                        <p className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed italic">
                          &ldquo;{goalText}&rdquo;
                        </p>
                      </div>
                    ) : null}
                  </Fragment>
                ))}
              </div>
            </div>

            <Button
              type="button"
              variant="coral"
              className="mt-6 w-full"
              onClick={() => onCta(copy.ctaHref)}
            >
              {copy.ctaLabel}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="badge-celebration-title"
    >
      <div className="relative w-full max-w-md rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#ef725c] via-amber-400 to-teal-500" aria-hidden />

        <div className="p-6 pt-8 text-center">
          <div className="text-5xl mb-3" aria-hidden>
            {badge.icon}
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#ef725c]">Badge unlocked</p>
          <h2 id="badge-celebration-title" className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
            {badge.label}
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{badge.description}</p>

          <Button type="button" variant="coral" className="mt-6 w-full" onClick={onContinue}>
            Continue →
          </Button>
        </div>
      </div>
    </div>
  )
}
