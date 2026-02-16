'use client'

import { useEffect, useCallback, useRef } from 'react'
import confetti from 'canvas-confetti'

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

  if (!isOpen) return null

  const displayMessage = message ?? getRandomMessage()
  const hasProgress = totalTasks > 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#152b50]/90 backdrop-blur-sm transition-opacity duration-300"
      role="dialog"
      aria-modal="true"
      aria-labelledby="celebration-title"
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center transition-transform duration-300">
        <div className="mb-4 text-5xl" aria-hidden="true">
          🦌
        </div>
        <h2 id="celebration-title" className="text-xl font-semibold text-[#152b50] mb-3">
          Mrs. Deer is proud of you!
        </h2>
        <p className="text-gray-700 mb-4 leading-relaxed">{displayMessage}</p>

        {hasProgress && (
          <p className="text-sm text-emerald-600 font-medium mb-4">
            {tasksCompleted}/{totalTasks} priorities completed today
          </p>
        )}

        <button
          type="button"
          onClick={handleClose}
          className="w-full py-3 px-6 bg-[#ef725c] text-white font-medium rounded-xl hover:bg-[#e8654d] transition touch-manipulation"
        >
          Continue
        </button>
      </div>
    </div>
  )
}
