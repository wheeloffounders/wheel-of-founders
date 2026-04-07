'use client'

import { useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import { X } from 'lucide-react'
import { MrsDeerAvatar } from '@/components/MrsDeerAvatar'
import { colors } from '@/lib/design-tokens'

export interface FirstBadgeCelebrationProps {
  isOpen: boolean
  onClose: () => void
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
  burst({
    particleCount,
    spread: 70,
    origin: { y: 0.65 },
    colors: [coral, navy, emerald],
  })

  // A short extra shimmer for visual polish.
  burst({
    particleCount: Math.floor(particleCount / 2),
    angle: 180,
    spread: 40,
    origin: { x: 0.5, y: 0.8 },
    colors: [coral, emerald],
  })
}

export function FirstBadgeCelebration({ isOpen, onClose, insight }: FirstBadgeCelebrationProps) {
  const hasFiredRef = useRef(false)

  useEffect(() => {
    if (!isOpen) return
    if (hasFiredRef.current) return

    fireConfetti()
    hasFiredRef.current = true
  }, [isOpen])

  const sparklePositions = useMemo(
    () => [
      { top: '6%', left: '18%', delay: 0.0 },
      { top: '9%', left: '62%', delay: 0.15 },
      { top: '24%', left: '78%', delay: 0.3 },
      { top: '40%', left: '10%', delay: 0.25 },
      { top: '55%', left: '88%', delay: 0.35 },
      { top: '70%', left: '22%', delay: 0.4 },
    ],
    []
  )

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
            className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 text-center max-h-[90vh] overflow-y-auto"
            initial={{ opacity: 0, scale: 0.92, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 10 }}
            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sparkles */}
            {sparklePositions.map((pos, idx) => (
              <motion.span
                key={idx}
                className="absolute text-amber-400"
                style={{ top: pos.top, left: pos.left }}
                initial={{ opacity: 0, scale: 0.4, rotate: -10 }}
                animate={{ opacity: 1, scale: [0.6, 1.2, 0.9], rotate: [0, 14, 0] }}
                transition={{ duration: 1.2, delay: pos.delay }}
              >
                ✨
              </motion.span>
            ))}

            <button
              type="button"
              className="absolute top-3 right-3 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition"
              aria-label="Close"
              onClick={onClose}
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex justify-center mb-3 relative">
              <MrsDeerAvatar expression="celebratory" size="large" />
            </div>

            <h2 id="first-day-badge-title" className="text-2xl font-bold text-[#152B50] dark:text-white mb-2">
              First Day Badge Unlocked 🌟
            </h2>

            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
              Here&apos;s what Mrs. Deer noticed:
            </p>

            {insight && (
              <div className="p-4 rounded-lg bg-[#152b50]/5 dark:bg-[#152b50]/20 border-l-4 border-[#ef725c] mb-4">
                <p className="text-sm text-gray-700 dark:text-gray-300 italic leading-relaxed">&ldquo;{insight}&rdquo;</p>
              </div>
            )}

            <div className="bg-[#152b50]/5 dark:bg-[#152b50]/20 border-l-4 border-[#ef725c] rounded-lg p-4 mb-5">
              <div className="flex items-center justify-center gap-2">
                <span className="inline-flex items-center px-3 py-1 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 font-medium">
                  🌟 First Day Badge
                </span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                Completed your first morning reflection.
              </p>
            </div>

            <hr className="border-gray-200 dark:border-gray-700" />

            <div className="text-left">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                🌙 The real magic happens tonight.
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Your evening reflection is where Mrs. Deer starts connecting the dots:
              </p>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside mb-4">
                <li>What drained you vs what fueled you</li>
                <li>Tasks you avoided (and why)</li>
                <li>Decisions that shaped your day</li>
              </ul>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                After just 3 evenings, patterns emerge. After 7 days, you&apos;ll see what&apos;s compounding — and what&apos;s holding you back.
              </p>

              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Coming soon</h3>
              <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1 list-disc list-inside">
                <li>Energy trends over your week</li>
                <li>Your decision style patterns</li>
                <li>Archetype hints (what you naturally return to)</li>
              </ul>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full mt-5 py-3 rounded-lg font-medium text-white hover:opacity-90 transition"
              style={{ backgroundColor: colors.coral.DEFAULT }}
            >
              Continue →
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

