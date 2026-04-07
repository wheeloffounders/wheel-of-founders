'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import { X } from 'lucide-react'
import { MrsDeerAvatar } from '@/components/MrsDeerAvatar'
import { colors } from '@/lib/design-tokens'
import { Button } from '@/components/ui/button'

export interface DecisionStyleCelebrationProps {
  isOpen: boolean
  onClose: () => void
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

  burst({
    particleCount: Math.floor(particleCount / 2),
    angle: 180,
    spread: 40,
    origin: { x: 0.5, y: 0.8 },
    colors: [coral, emerald],
  })
}

export function DecisionStyleCelebration({ isOpen, onClose }: DecisionStyleCelebrationProps) {
  const router = useRouter()
  const hasFiredRef = useRef(false)

  useEffect(() => {
    if (!isOpen) return
    if (hasFiredRef.current) return
    fireConfetti()
    hasFiredRef.current = true
  }, [isOpen])

  const sparklePositions = useMemo(
    () => [
      { top: '8%', left: '18%', delay: 0.0 },
      { top: '12%', left: '60%', delay: 0.12 },
      { top: '22%', left: '83%', delay: 0.28 },
      { top: '40%', left: '8%', delay: 0.22 },
      { top: '56%', left: '92%', delay: 0.34 },
      { top: '70%', left: '25%', delay: 0.44 },
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
          aria-labelledby="decision-style-title"
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
            {sparklePositions.map((pos, idx) => (
              <motion.span
                key={idx}
                className="absolute text-amber-400"
                style={{ top: pos.top, left: pos.left }}
                initial={{ opacity: 0, scale: 0.4, rotate: -10 }}
                animate={{ opacity: 1, scale: [0.6, 1.2, 0.9], rotate: [0, 14, 0] }}
                transition={{ duration: 1.2, delay: pos.delay }}
              >
                🎯
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

            <h2 id="decision-style-title" className="text-2xl font-bold text-[#152B50] dark:text-white mb-2">
              Decision Style Unlocked! 🎯
            </h2>

            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
              Mrs. Deer now understands how you choose: strategy when you need direction, tactics when you need motion.
            </p>

            <div className="bg-[#152b50]/5 dark:bg-[#152b50]/20 border-l-4 border-[#ef725c] rounded-lg p-4 mb-5 text-left">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Your chart shows your mix over time. Use it to plan future days with the right kind of momentum.
              </p>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside mt-3">
                <li>Notice what happens when you go strategic</li>
                <li>Notice what happens when you go tactical</li>
                <li>Spot the combination that works best for you</li>
              </ul>
            </div>

            <div className="text-left">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                📌 Next up: Founder Archetype
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                After a few more days, patterns behind your choices start to reveal your natural archetype.
              </p>
            </div>

            <div className="mt-2">
              <Button
                variant="coral"
                className="w-full py-3 rounded-lg font-medium text-white hover:opacity-90 transition"
                onClick={() => {
                  onClose()
                  router.push('/founder-dna/patterns')
                }}
              >
                View your style →
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

