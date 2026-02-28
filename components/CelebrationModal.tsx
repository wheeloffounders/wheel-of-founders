'use client'

import { useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import { MrsDeerAvatar } from './MrsDeerAvatar'

const CELEBRATION_MESSAGES = [
  'Another day of progress! Your consistency is building something amazing.',
  "Well done completing today's circle. Reflection is where growth happens.",
  "You showed up for your vision today. That's what founders do.",
  "Today's efforts become tomorrow's momentum. Great work.",
]

const BRAND_COLORS = {
  coral: '#ef725c',
  emerald: '#10b981',
  navy: '#152b50',
}

function getRandomMessage(): string {
  return CELEBRATION_MESSAGES[Math.floor(Math.random() * CELEBRATION_MESSAGES.length)]
}

function isMobile(): boolean {
  if (typeof window === 'undefined') return false
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

function fireConfetti() {
  const particleCount = isMobile() ? 50 : 100
  const duration = 3000

  const coralConfetti = confetti.create(undefined, { resize: true })

  const end = Date.now() + duration

  const frame = () => {
    coralConfetti({
      particleCount: 2,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: [BRAND_COLORS.coral, BRAND_COLORS.emerald, BRAND_COLORS.navy],
    })
    coralConfetti({
      particleCount: 2,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: [BRAND_COLORS.coral, BRAND_COLORS.emerald, BRAND_COLORS.navy],
    })

    if (Date.now() < end) {
      requestAnimationFrame(frame)
    }
  }

  frame()

  // One burst at the start
  coralConfetti({
    particleCount,
    spread: 70,
    origin: { y: 0.6 },
    colors: [BRAND_COLORS.coral, BRAND_COLORS.emerald, BRAND_COLORS.navy],
  })
}

interface CelebrationModalProps {
  isOpen: boolean
  onClose: () => void
  message?: string
  tasksCompleted?: number
  totalTasks?: number
}

export function CelebrationModal({
  isOpen,
  onClose,
  message,
  tasksCompleted = 0,
  totalTasks = 0,
}: CelebrationModalProps) {
  const hasFiredConfetti = useRef(false)
  const autoCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleClose = useCallback(() => {
    if (autoCloseTimer.current) {
      clearTimeout(autoCloseTimer.current)
      autoCloseTimer.current = null
    }
    onClose()
  }, [onClose])

  useEffect(() => {
    if (!isOpen) return

    if (!hasFiredConfetti.current) {
      fireConfetti()
      hasFiredConfetti.current = true
    }

    autoCloseTimer.current = setTimeout(handleClose, 9000)

    return () => {
      if (autoCloseTimer.current) {
        clearTimeout(autoCloseTimer.current)
      }
    }
  }, [isOpen, handleClose])

  const displayMessage = message ?? getRandomMessage()
  const hasProgress = totalTasks > 0

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#152b50]/90 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="celebration-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-8 text-center"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ 
              type: 'spring',
              stiffness: 300,
              damping: 30,
            }}
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ 
                delay: 0.2,
                type: 'spring',
                stiffness: 200,
                damping: 15,
              }}
              className="mb-4 flex justify-center"
            >
              <MrsDeerAvatar expression="celebratory" size="large" />
            </motion.div>
            
            <motion.h2
              id="celebration-title"
              className="text-xl font-semibold text-[#152b50] dark:text-[#E2E8F0] mb-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              Mrs. Deer, your AI companion is proud of you!
            </motion.h2>
            
            <motion.p
              className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              {displayMessage}
            </motion.p>

            {hasProgress && (
              <motion.p
                className="text-sm text-emerald-600 font-medium mb-4"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, type: 'spring' }}
              >
                {tasksCompleted}/{totalTasks} priorities completed today
              </motion.p>
            )}

            <motion.button
              type="button"
              onClick={handleClose}
              className="w-full py-3 px-6 bg-[#ef725c] text-white font-medium rounded-xl hover:bg-[#e8654d] transition touch-manipulation"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Continue
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
