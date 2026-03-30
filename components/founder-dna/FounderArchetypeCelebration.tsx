'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import { X } from 'lucide-react'
import { MrsDeerAvatar } from '@/components/MrsDeerAvatar'
import { colors } from '@/lib/design-tokens'
import { Button } from '@/components/ui/button'

export type ArchetypeMini = {
  name: string
  label: string
  icon: string
  description: string
  confidence: number
}

export interface FounderArchetypeCelebrationProps {
  isOpen: boolean
  onClose: () => void
  primary?: ArchetypeMini | null
  /** Archetype now unlocks as a 21-day preview; full profile at 30 days. */
  isPreviewUnlock?: boolean
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

export function FounderArchetypeCelebration({
  isOpen,
  onClose,
  primary,
  isPreviewUnlock = true,
}: FounderArchetypeCelebrationProps) {
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
      { top: '10%', left: '62%', delay: 0.15 },
      { top: '24%', left: '82%', delay: 0.3 },
      { top: '38%', left: '12%', delay: 0.25 },
      { top: '55%', left: '88%', delay: 0.35 },
      { top: '70%', left: '22%', delay: 0.45 },
    ],
    []
  )

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="founder-archetype-title"
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
                🏷️
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

            <h2 id="founder-archetype-title" className="text-2xl font-bold text-[#152B50] dark:text-white mb-2">
              {isPreviewUnlock ? 'Your founder style is emerging! 🌱' : 'Your Founder Archetype Has Emerged! 🏷️'}
            </h2>

            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
              {isPreviewUnlock
                ? 'After 21 days, Mrs. Deer can share an early read on your tendencies. Keep reflecting — your full archetype profile unlocks at 30 days.'
                : 'Mrs. Deer pulled the pattern out of your decisions, tasks, and reflections.'}
            </p>

            <div className="bg-[#152b50]/5 dark:bg-[#152b50]/20 border-l-4 border-[#ef725c] rounded-lg p-4 mb-5 text-left">
              {primary ? (
                <>
                  <div className="flex items-start gap-3">
                    <div className="text-2xl leading-none">{primary.icon}</div>
                    <div className="min-w-0">
                      <div className="font-semibold text-sm text-gray-900 dark:text-white">{primary.label}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">{primary.description}</div>
                      <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-2">
                        Confidence: ~{primary.confidence}%
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-sm text-gray-700 dark:text-gray-300">Loading your archetype...</div>
              )}
            </div>

            <div className="text-left">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                Next up: Postponement Patterns
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                After you postpone 7 tasks, Mrs. Deer will show how your “avoidance pattern” actually works.
              </p>
            </div>

            <Button
              variant="coral"
              className="w-full py-3 rounded-lg font-medium text-white hover:opacity-90 transition"
              onClick={() => {
                onClose()
                router.push('/founder-dna/archetype')
              }}
            >
              View details →
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

