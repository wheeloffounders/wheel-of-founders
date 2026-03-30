'use client'

import { useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import { MrsDeerAvatar } from '@/components/MrsDeerAvatar'
import { colors } from '@/lib/design-tokens'

function fireShortConfetti() {
  const c = confetti.create(undefined, { resize: true })
  c({
    particleCount: 70,
    spread: 65,
    origin: { y: 0.55 },
    colors: [colors.coral.DEFAULT, colors.emerald.DEFAULT, colors.navy.DEFAULT],
  })
}

interface EveningMicroCelebrationModalProps {
  isOpen: boolean
  day: number
  message: string
  onClose: () => void
}

export function EveningMicroCelebrationModal({ isOpen, day, message, onClose }: EveningMicroCelebrationModalProps) {
  const firedRef = useRef(false)

  useEffect(() => {
    if (!isOpen) {
      firedRef.current = false
      return
    }
    if ((day === 3 || day === 6) && !firedRef.current) {
      firedRef.current = true
      fireShortConfetti()
    }
  }, [isOpen, day])

  const handleClose = useCallback(() => {
    onClose()
  }, [onClose])

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="evening-micro-celebration-title"
            className="max-w-md w-full border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-xl p-6"
            style={{ borderRadius: 0 }}
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center text-center gap-4">
              <MrsDeerAvatar expression="celebratory" size="large" />
              <p
                id="evening-micro-celebration-title"
                className="text-sm font-semibold uppercase tracking-wider"
                style={{ color: colors.coral.DEFAULT }}
              >
                Day {day}
              </p>
              <p className="text-base text-gray-900 dark:text-gray-100 leading-relaxed">{message}</p>
              <button
                type="button"
                onClick={handleClose}
                className="mt-2 w-full py-3 text-sm font-medium text-white transition hover:opacity-90"
                style={{ backgroundColor: colors.coral.DEFAULT, borderRadius: 0 }}
              >
                Continue
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
