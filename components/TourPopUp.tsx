'use client'

import { useTour } from '@/lib/hooks/useTour'
import { HelpCircle } from 'lucide-react'

const TOUR_ITEMS = [
  'Dashboard — your command center',
  'Morning — where each day begins',
  'Evening — where patterns emerge',
  'History — see your journey',
  'Weekly/Monthly/Quarterly — watch your growth',
  'Emergency — for when things go sideways',
  'Profile — where Mrs. Deer learns you',
]

export function TourPopUp() {
  const { showPopUp, startTour, dismissForSession } = useTour()

  if (!showPopUp) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
      <div
        className="max-w-md w-full mx-auto p-6 rounded-xl bg-white dark:bg-gray-800 shadow-xl border border-gray-200 dark:border-gray-700"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-popup-title"
      >
        <h2 id="tour-popup-title" className="text-xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
          ✨ First time here?
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Want a 3-minute tour of the app?
        </p>
        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 mb-6">
          {TOUR_ITEMS.map((item) => (
            <li key={item}>• {item}</li>
          ))}
        </ul>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => {
              console.log('🔍 [Button] "Show me around" clicked')
              startTour()
            }}
            className="flex-1 px-4 py-2.5 rounded-lg font-medium text-white hover:opacity-90 transition"
            style={{ backgroundColor: '#ef725c' }}
          >
            Show me around
          </button>
          <button
            type="button"
            onClick={dismissForSession}
            className="px-4 py-2.5 rounded-lg font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  )
}
