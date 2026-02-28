'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Flame } from 'lucide-react'
import { getStreakMilestoneMessage } from '@/lib/streak'
import { MrsDeerAvatar } from './MrsDeerAvatar'

type StreakCelebrationModalProps = {
  isOpen: boolean
  onClose: () => void
  streak: number
}

export function StreakCelebrationModal({
  isOpen,
  onClose,
  streak,
}: StreakCelebrationModalProps) {
  useEffect(() => {
    if (!isOpen) return

    // Trigger confetti
    const triggerConfetti = async () => {
      try {
        const confetti = (await import('canvas-confetti')).default
        const duration = 3000
        const end = Date.now() + duration

        const interval = setInterval(() => {
          if (Date.now() > end) {
            clearInterval(interval)
            return
          }

          confetti({
            particleCount: 3,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: ['#ef725c', '#152b50', '#10b981'],
          })
          confetti({
            particleCount: 3,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: ['#ef725c', '#152b50', '#10b981'],
          })
        }, 200)
      } catch (error) {
        console.error('Failed to load confetti:', error)
      }
    }

    triggerConfetti()
  }, [isOpen])

  const message = getStreakMilestoneMessage(streak)

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Overlay */}
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Modal */}
          <motion.div
            className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-8 z-10"
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 30,
            }}
          >
            <motion.button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:text-gray-300 transition-colors"
              aria-label="Close"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <X className="w-6 h-6" />
            </motion.button>

            <div className="text-center">
              <motion.div
                className="inline-flex items-center justify-center mb-6"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{
                  delay: 0.2,
                  type: 'spring',
                  stiffness: 200,
                  damping: 15,
                }}
              >
                <MrsDeerAvatar expression="celebratory" size="large" />
              </motion.div>

              <motion.h2
                className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                Streak Milestone!
              </motion.h2>

              <motion.p
                className="text-xl text-gray-700 dark:text-gray-300 mb-6"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                {message}
              </motion.p>

              <motion.div
                className="bg-gradient-to-r from-[#ef725c]/10 to-[#152b50]/10 rounded-lg p-4 mb-6"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, type: 'spring' }}
              >
                <motion.p
                  className="text-4xl font-bold text-[#ef725c] mb-2"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    delay: 0.6,
                    type: 'spring',
                    stiffness: 200,
                  }}
                >
                  {streak} Days
                </motion.p>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Keep your momentum going! Complete your evening review today to extend your streak.
                </p>
              </motion.div>

              <motion.button
                onClick={onClose}
                className="w-full bg-[#152b50] text-white py-3 px-6 rounded-lg font-semibold hover:bg-opacity-90 transition-colors"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Keep Going! 🔥
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
