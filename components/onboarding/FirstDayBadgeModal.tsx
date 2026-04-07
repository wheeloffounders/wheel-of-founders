'use client'

import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import { X } from 'lucide-react'
import { MrsDeerAvatar } from '@/components/MrsDeerAvatar'
import { colors } from '@/lib/design-tokens'

export type FirstDayBadgeModalProps = {
  isOpen: boolean
  /** Close (X / backdrop) without advancing to reminder step */
  onClose: () => void
  /** Primary CTA — leads to reminder setup */
  onContinue: () => void
  insight?: string | null
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

export function FirstDayBadgeModal({ isOpen, onClose, onContinue, insight }: FirstDayBadgeModalProps) {
  const hasFiredRef = useRef(false)

  useEffect(() => {
    if (!isOpen) return
    if (hasFiredRef.current) return
    fireConfetti()
    hasFiredRef.current = true
  }, [isOpen])

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="first-day-badge-title"
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

            <div className="flex justify-center mb-3">
              <MrsDeerAvatar expression="celebratory" size="large" />
            </div>

            <h2
              id="first-day-badge-title"
              className="text-xl font-bold text-[#152B50] dark:text-white mb-4 text-center"
            >
              ✨ First Day Badge Unlocked 🌟
            </h2>

            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
              <span className="font-medium text-gray-800 dark:text-gray-200">Mrs. Deer:</span>
            </p>

            {insight ? (
              <div className="p-4 rounded-lg bg-[#152b50]/5 dark:bg-[#152b50]/20 border-l-4 border-[#ef725c] mb-5">
                <p className="text-sm text-gray-700 dark:text-gray-300 italic leading-relaxed">&ldquo;{insight}&rdquo;</p>
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
              Tonight, after your evening reflection, she&apos;ll show what today built and one pattern you might have
              missed —{' '}
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
