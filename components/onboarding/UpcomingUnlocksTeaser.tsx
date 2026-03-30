'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { colors } from '@/lib/design-tokens'

export type UpcomingUnlocksTeaserProps = {
  isOpen: boolean
  onGotIt: () => void
}

/**
 * Post–reminder popup: dashboard unlocks teaser + next step (full day → morning insight).
 */
export function UpcomingUnlocksTeaser({ isOpen, onGotIt }: UpcomingUnlocksTeaserProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="upcoming-unlocks-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 text-left"
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
          >
            <h2 id="upcoming-unlocks-title" className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              🔓 Coming soon on your dashboard
            </h2>
            <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1.5 list-disc list-inside mb-4">
              <li>Energy trends</li>
              <li>Your decision style</li>
              <li>Your Founder Archetype</li>
            </ul>
            <p className="text-sm text-gray-700 dark:text-gray-200 mb-6">
              Complete your first full day → unlock tomorrow&apos;s morning insight
            </p>
            <button
              type="button"
              onClick={onGotIt}
              className="w-full py-3 rounded-lg font-medium text-white hover:opacity-90 transition"
              style={{ backgroundColor: colors.coral.DEFAULT }}
            >
              Got it
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
