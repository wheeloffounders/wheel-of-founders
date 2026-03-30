'use client'

import { useCallback } from 'react'
import { colors } from '@/lib/design-tokens'

export type CalendarReminderType = 'google' | 'apple' | 'outlook' | 'other'

export type CalendarReminderModalProps = {
  isOpen: boolean
  reminderTime: string
  onChangeTime: (time: string) => void
  onClose: () => void
  onChooseCalendar: (type: CalendarReminderType) => void
  onDontShowAgain: () => void
  onLater: () => void
  /** Override default evening copy (e.g. morning insight reminder). */
  title?: string
  description?: string
}

export function CalendarReminderModal({
  isOpen,
  reminderTime,
  onChangeTime,
  onClose,
  onChooseCalendar,
  onDontShowAgain,
  onLater,
  title = '🌙 Make evening reflection a habit',
  description = 'Add a daily 5‑minute reminder to your calendar. This is where patterns emerge.',
}: CalendarReminderModalProps) {
  const stop = useCallback((e: React.MouseEvent) => e.stopPropagation(), [])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[90]" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={stop}
        role="dialog"
        aria-modal="true"
        aria-labelledby="calendar-reminder-title"
      >
        <div className="flex justify-between items-start mb-4">
          <h2 id="calendar-reminder-title" className="text-xl font-semibold text-gray-900 dark:text-white">
            {title}
          </h2>
          <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-700">
            ✕
          </button>
        </div>

        <p className="text-gray-600 dark:text-gray-300 mb-6">{description}</p>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Your reminder time</label>
            <input
              type="time"
              value={reminderTime}
              onChange={(e) => onChangeTime(e.target.value)}
              className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
            />
          </div>

          <p className="text-sm text-gray-500 dark:text-gray-400">Choose your calendar:</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onChooseCalendar('google')}
              className="p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 flex flex-col items-center"
            >
              <span className="text-xl mb-1">📅</span>
              <span className="text-sm">Google</span>
            </button>
            <button
              onClick={() => onChooseCalendar('apple')}
              className="p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 flex flex-col items-center"
            >
              <span className="text-xl mb-1">🍎</span>
              <span className="text-sm">Apple</span>
            </button>
            <button
              onClick={() => onChooseCalendar('outlook')}
              className="p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 flex flex-col items-center"
            >
              <span className="text-xl mb-1">📧</span>
              <span className="text-sm">Outlook</span>
            </button>
            <button
              onClick={() => onChooseCalendar('other')}
              className="p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 flex flex-col items-center"
            >
              <span className="text-xl mb-1">🔗</span>
              <span className="text-sm">Other</span>
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button onClick={onDontShowAgain} className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800">
            Don&apos;t show again
          </button>
          <button
            onClick={onLater}
            className="px-4 py-2 text-white rounded hover:opacity-90"
            style={{ backgroundColor: colors.coral.DEFAULT }}
          >
            Later
          </button>
        </div>
      </div>
    </div>
  )
}

