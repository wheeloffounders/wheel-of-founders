'use client'

import { withGoogleCalendarSubscribeNonce } from '@/lib/calendar/subscription-links'

export type CalendarSubscribeLinks = {
  feedUrl: string
  webcalUrl?: string
  google: string
  apple: string
  outlook: string
}

/**
 * Issues a new `calendar_token` and returns a fresh Google Calendar subscribe URL.
 * Google aggressively caches by feed URL; a new token forces a distinct subscription after delete/re-add.
 */
export async function regenerateCalendarTokenForGoogleSubscribe(): Promise<{
  openUrl: string
  links: CalendarSubscribeLinks
} | null> {
  const res = await fetch('/api/user/calendar-subscription/regenerate', {
    method: 'POST',
    credentials: 'include',
  })
  const json = (await res.json().catch(() => ({}))) as {
    success?: boolean
    links?: CalendarSubscribeLinks
    error?: string
  }
  if (!res.ok || !json.links?.google) {
    return null
  }
  return {
    openUrl: withGoogleCalendarSubscribeNonce(json.links.google),
    links: json.links,
  }
}
