'use client'

import { useEffect } from 'react'
import { X, Flame } from 'lucide-react'
import { getStreakMilestoneMessage } from '@/lib/streak'

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

  if (!isOpen) return null

  const message = getStreakMilestoneMessage(streak)

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 z-10 animate-in fade-in zoom-in duration-300">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-[#ef725c] to-[#152b50] mb-6 animate-pulse">
            <Flame className="w-10 h-10 text-white" />
          </div>

          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Streak Milestone!
          </h2>

          <p className="text-xl text-gray-700 mb-6">{message}</p>

          <div className="bg-gradient-to-r from-[#ef725c]/10 to-[#152b50]/10 rounded-lg p-4 mb-6">
            <p className="text-4xl font-bold text-[#ef725c] mb-2">
              {streak} Days
            </p>
            <p className="text-sm text-gray-600">
              Keep your momentum going! Complete your evening review today to extend your streak.
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-full bg-[#152b50] text-white py-3 px-6 rounded-lg font-semibold hover:bg-opacity-90 transition-colors"
          >
            Keep Going! 🔥
          </button>
        </div>
      </div>
    </div>
  )
}
