'use client'

/**
 * Evening “badge logic” completion — mirrors FirstDayBadgeModal beats (confetti, strategy bridge, CTA)
 * without duplicating that component; evening uses coral rail + moon/star seal for past-reflection DNA.
 */
import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import { Moon, Star, X } from 'lucide-react'
import { MarkdownText } from '@/components/MarkdownText'
import { InsightFeedback } from '@/components/InsightFeedback'
import { colors } from '@/lib/design-tokens'
import {
  filterInsightLabels,
  scrubGenericSynthesisTransitions,
  stripRedundantLeadingHeadings,
} from '@/lib/insight-utils'
import {
  emphasizeTomorrowDebtInGoodnight,
  splitEveningCoachMessage,
} from '@/lib/evening/evening-coach-message'

export type EveningInsightCompletionModalProps = {
  isOpen: boolean
  onClose: () => void
  onContinue: () => void
  insight: string | null
  insightId?: string | null
  eveningHotUnresolvedCount?: number
  /** First-ever evening reflection → “First Glimpse Unlocked” */
  firstGlimpseBadge?: boolean
}

function isMobile(): boolean {
  if (typeof window === 'undefined') return false
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

function fireConfetti() {
  const particleCount = isMobile() ? 60 : 120
  const coral = colors.coral.DEFAULT
  const navy = colors.navy.DEFAULT
  const emerald = colors.emerald.DEFAULT
  const burst = confetti.create(undefined, { resize: true })
  burst({ particleCount, spread: 70, origin: { y: 0.65 }, colors: [coral, navy, emerald] })
  burst({
    particleCount: Math.floor(particleCount / 2),
    angle: 180,
    spread: 40,
    origin: { x: 0.5, y: 0.8 },
    colors: [coral, emerald],
  })
}

export function EveningInsightCompletionModal({
  isOpen,
  onClose,
  onContinue,
  insight,
  insightId,
  eveningHotUnresolvedCount = 0,
  firstGlimpseBadge = false,
}: EveningInsightCompletionModalProps) {
  const hasFiredConfettiRef = useRef(false)

  useEffect(() => {
    if (!isOpen) {
      hasFiredConfettiRef.current = false
      return
    }
    if (hasFiredConfettiRef.current) return
    fireConfetti()
    hasFiredConfettiRef.current = true
  }, [isOpen])

  const rawFiltered = scrubGenericSynthesisTransitions(
    stripRedundantLeadingHeadings(filterInsightLabels(insight ?? ''))
  )
  const eveningSplit = splitEveningCoachMessage(rawFiltered)

  const title = firstGlimpseBadge ? 'First Glimpse Unlocked' : 'Evening Reflection Complete'
  const titleSubtitle = firstGlimpseBadge ? 'Your first evening reflection' : null

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="evening-insight-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
        >
          <motion.div
            className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full px-6 pt-6 text-left max-h-[90vh] overflow-y-auto pb-[calc(10rem+env(safe-area-inset-bottom,0px))]"
            initial={{ opacity: 0, scale: 0.92, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 10 }}
            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="absolute top-3 right-3 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition"
              aria-label="Close"
              onClick={onClose}
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center mb-5">
              <div
                className="relative mb-3 flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#152b50]/12 to-[#ef725c]/15 dark:from-[#152b50]/35 dark:to-[#ef725c]/25 ring-2 ring-[#ef725c]/80 shadow-sm"
                aria-hidden
              >
                <Moon className="h-7 w-7 text-[#152B50] dark:text-sky-200" strokeWidth={1.75} />
                <Star
                  className="absolute -right-0.5 -top-0.5 h-4 w-4 fill-amber-400 text-amber-400"
                  aria-hidden
                />
              </div>
              <h2
                id="evening-insight-title"
                className="text-xl font-bold text-[#152B50] dark:text-sky-200 text-center tracking-tight"
              >
                {title}
              </h2>
              {titleSubtitle ? (
                <p className="mt-1 text-xs font-medium uppercase tracking-wide text-[#ef725c] dark:text-[#f0886c]">
                  {titleSubtitle}
                </p>
              ) : (
                <p className="mt-1 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Day closed
                </p>
              )}
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 leading-relaxed">
              <span className="font-medium text-gray-800 dark:text-gray-200">Mrs. Deer</span>
              <span className="text-gray-500 dark:text-gray-400"> — tonight&apos;s read</span>
            </p>

            {insight ? (
              <div
                className="mb-5 rounded-lg border-l-4 bg-[#152b50]/5 p-4 dark:bg-[#152b50]/20"
                style={{ borderLeftColor: colors.coral.DEFAULT }}
              >
                <div className="max-h-[min(40vh,300px)] space-y-3 overflow-y-auto pr-1 [scrollbar-width:thin]">
                  <MarkdownText className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed [&_p]:mb-2 [&_p:last-child]:mb-0 [&_p]:leading-relaxed">
                    {eveningSplit.body}
                  </MarkdownText>
                  {eveningSplit.goodnight ? (
                    <MarkdownText className="text-sm italic text-gray-600 dark:text-gray-400 leading-relaxed [&_p]:mb-2 [&_p:last-child]:mb-0 [&_p]:leading-relaxed [&_strong]:font-semibold [&_strong]:text-gray-800 dark:[&_strong]:text-gray-200">
                      {emphasizeTomorrowDebtInGoodnight(eveningSplit.goodnight, eveningHotUnresolvedCount)}
                    </MarkdownText>
                  ) : null}
                </div>
                {insightId ? (
                  <div className="mt-4 border-t border-gray-200/80 pt-3 dark:border-gray-600/60 [&>div]:mt-0">
                    <InsightFeedback insightId={insightId} insightType="evening" />
                  </div>
                ) : null}
              </div>
            ) : null}

            <hr className="border-gray-200 dark:border-gray-700 mb-4" />

            <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 leading-relaxed">
              The Strategy is set.{' '}
              <span className="font-medium text-indigo-600 dark:text-indigo-400">
                Mrs. Deer is now tracking your patterns
              </span>{' '}
              in the background. Ready to execute?
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
              Tomorrow morning, she&apos;ll meet you with a fresh plan —{' '}
              <span className="font-semibold text-[#152b50] dark:text-sky-200">your dashboard is live now</span>.
            </p>

            <button
              type="button"
              onClick={onContinue}
              className="w-full py-3 rounded-lg font-medium text-white hover:opacity-90 transition"
              style={{ backgroundColor: colors.coral.DEFAULT }}
            >
              Enter My Dashboard →
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
