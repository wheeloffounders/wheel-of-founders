'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { X } from 'lucide-react'

/** localStorage key: dismissed for this calendar day (same key everywhere so dismiss hides across dashboard/morning/evening) */
function getDismissKey(): string {
  if (typeof window === 'undefined') return 'micro_lesson_dismissed_'
  const dateKey = new Date().toDateString()
  return `micro_lesson_dismissed_${dateKey}`
}

export interface MicroLessonData {
  situation: string
  message: string
  emoji?: string
  action?: { label: string; link: string }
  kind?: 'state' | 'struggle'
}

export type MicroLessonLocation = 'dashboard' | 'morning' | 'evening'

interface MicroLessonProps {
  /** Where the lesson is shown; dashboard gets highest-priority lesson regardless of page. */
  location?: MicroLessonLocation
  /** @deprecated Use location instead. Still supported for backward compatibility. */
  page?: 'morning' | 'evening'
  /** Callback when user completes evening (e.g. after saving evening review) */
  onRecordCompletedEvening?: () => void
  /** Tighter spacing + italic gray body (e.g. dashboard under greeting) */
  compact?: boolean
}

export function MicroLesson({ location: locationProp, page, onRecordCompletedEvening, compact }: MicroLessonProps) {
  const location: MicroLessonLocation = locationProp ?? (page ?? 'morning')
  const [data, setData] = useState<MicroLessonData | null>(null)
  const [dismissed, setDismissed] = useState(true) // start hidden to avoid flash
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/micro-lesson?location=${location}`, { credentials: 'include' })
      const json = await res.json()
      if (!res.ok || !json.lesson) {
        setData(null)
        setDismissed(true)
        return
      }
      const dismissKey = getDismissKey()
      const alreadyDismissed = typeof window !== 'undefined' && window.localStorage.getItem(dismissKey) === 'true'
      setData(json.lesson)
      setDismissed(!!alreadyDismissed)
    } catch {
      setData(null)
      setDismissed(true)
    } finally {
      setLoading(false)
    }
  }, [location])

  useEffect(() => {
    load()
  }, [load])

  const handleDismiss = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(getDismissKey(), 'true')
    }
    setDismissed(true)
  }

  const handleActionClick = async () => {
    try {
      await fetch('/api/micro-lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action_taken: true }),
      })
    } catch {
      // ignore
    }
  }

  // Expose for evening page to call when user saves review
  useEffect(() => {
    if (!onRecordCompletedEvening) return
    const record = () => {
      fetch('/api/micro-lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ completed_evening: true }),
      }).catch(() => {})
    }
    ;(window as unknown as { __microLessonRecordCompletedEvening?: () => void }).__microLessonRecordCompletedEvening = record
    return () => {
      delete (window as unknown as { __microLessonRecordCompletedEvening?: () => void }).__microLessonRecordCompletedEvening
    }
  }, [onRecordCompletedEvening])

  if (loading || !data || dismissed) return null

  const isDashboard = location === 'dashboard'

  const shellClass = compact
    ? 'bg-[#152b50]/5 dark:bg-[#152b50]/20 border-l-4 border-[#ef725c] p-3 mb-2 rounded-r-lg relative'
    : 'bg-[#152b50]/5 dark:bg-[#152b50]/20 border-l-4 border-[#ef725c] p-4 mb-6 rounded-r-lg relative'

  return (
    <div
      className={`${shellClass} ${isDashboard ? 'w-full' : ''}`}
      role="status"
      aria-live="polite"
    >
      <button
        type="button"
        onClick={handleDismiss}
        className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded"
        aria-label="Dismiss tip"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-start gap-3 pr-6">
        {data.emoji && (
          <span className={`shrink-0 ${compact ? 'text-xl' : 'text-2xl'}`} aria-hidden>
            {data.emoji}
          </span>
        )}
        <div className="flex-1 min-w-0">
          <p
            className={
              compact
                ? 'text-sm text-gray-500 dark:text-gray-400 italic leading-snug'
                : 'text-sm font-medium text-[#152b50] dark:text-white leading-snug'
            }
          >
            {data.message}
          </p>
          {data.action && (
            <Link
              href={data.action.link}
              onClick={handleActionClick}
              className="inline-block mt-2 text-sm text-[#ef725c] hover:underline"
            >
              {data.action.label} →
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
