'use client'

import { getBrowserIanaTimeZone } from '@/lib/browser-timezone'

const STORAGE_KEY = 'wof_google_cal_prev_connected'

/**
 * When Google OAuth becomes connected (was disconnected in this tab), POST an immediate
 * `sync_google_reminders` so recurring events land without waiting for cron.
 */
export function notifyGoogleCalendarConnectionIfNeeded(googleConnected: boolean): void {
  if (typeof window === 'undefined') return
  try {
    const prev = sessionStorage.getItem(STORAGE_KEY) ?? '0'
    const now = googleConnected ? '1' : '0'
    const flipped = prev === '0' && now === '1'
    sessionStorage.setItem(STORAGE_KEY, now)
    if (!flipped) return
    const tz = getBrowserIanaTimeZone()
    void fetch('/api/user/calendar-subscription', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'sync_google_reminders',
        hadGoogleCalendar: false,
        ...(tz ? { timeZone: tz } : {}),
      }),
    }).catch(() => {})
  } catch {
    // ignore private mode / quota
  }
}
