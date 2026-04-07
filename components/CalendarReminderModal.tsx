'use client'

import { useMemo, useCallback } from 'react'
import { colors } from '@/lib/design-tokens'
import { hourFromTimeString, mrsDeerLineForEveningHour } from '@/lib/calendar-reminder-feedback'

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

const CORAL = '#ef725c'

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
  const eveningHint = useMemo(
    () => mrsDeerLineForEveningHour(hourFromTimeString(reminderTime)),
    [reminderTime],
  )

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
            <p className="mt-1.5 text-xs italic text-gray-600 dark:text-gray-400">{eveningHint}</p>
          </div>

          <p className="text-center text-sm italic text-[#152b50]/70 dark:text-gray-400 leading-relaxed px-1">
            85% of our most consistent Founders use calendar nudges to stay on track.
          </p>

          <p className="text-sm text-gray-500 dark:text-gray-400">Choose your calendar:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => onChooseCalendar('google')}
              className="rounded-lg px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              style={{ backgroundColor: CORAL }}
            >
              Sync with Google
            </button>
            <button
              type="button"
              onClick={() => onChooseCalendar('apple')}
              className="rounded-lg border-2 border-[#152b50] bg-transparent px-4 py-3 text-sm font-semibold text-[#152b50] transition hover:-translate-y-0.5 hover:bg-black/[0.02] dark:border-white/70 dark:text-white dark:hover:bg-white/[0.04]"
            >
              Add to Apple Calendar
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button onClick={onDontShowAgain} className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800">
            Don&apos;t show again
          </button>
          <button
            onClick={onLater}
            className="px-4 py-2 text-white rounded-lg hover:opacity-90 transition hover:-translate-y-0.5"
            style={{ backgroundColor: colors.coral.DEFAULT }}
          >
            Later
          </button>
        </div>
      </div>
    </div>
  )
}
