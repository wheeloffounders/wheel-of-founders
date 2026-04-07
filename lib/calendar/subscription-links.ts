import { getAppPublicOrigin } from '@/lib/app-public-url'

/** Matches `X-WR-CALNAME` / `NAME` in the ICS feed — keep in sync with calendar feed route. */
export const CALENDAR_SUBSCRIPTION_DISPLAY_NAME = 'Wheel of Founders Reminders'

function toWebcal(url: string): string {
  return url.replace(/^https?:\/\//i, 'webcal://')
}

export function buildCalendarFeedUrl(token: string, origin?: string): string {
  const base = (origin?.trim() || getAppPublicOrigin()).replace(/\/$/, '')
  return `${base}/api/calendar/feed?token=${encodeURIComponent(token)}`
}

/**
 * Google sometimes no-ops or shows a blank page when opening the same `calendar/r?cid=…`
 * URL twice in a row. Append a harmless query param so each click is a distinct navigation.
 */
export function withGoogleCalendarSubscribeNonce(googleSubscribeUrl: string): string {
  try {
    const u = new URL(googleSubscribeUrl)
    u.searchParams.set('_wof', String(Date.now()))
    return u.toString()
  } catch {
    const sep = googleSubscribeUrl.includes('?') ? '&' : '?'
    return `${googleSubscribeUrl}${sep}_wof=${Date.now()}`
  }
}

export function buildCalendarProviderLinks(token: string, origin?: string): {
  /** Compatibility alias expected by some clients */
  feed: string
  feedUrl: string
  webcalUrl: string
  google: string
  /** HTTPS feed — reliable for Apple Calendar (File → New Calendar Subscription) and browsers */
  apple: string
  /** Legacy webcal:// — some older setups only; can fail from Safari/macOS */
  appleWebcal: string
  outlook: string
} {
  const feedUrl = buildCalendarFeedUrl(token, origin)
  const webcalUrl = toWebcal(feedUrl)
  return {
    feed: feedUrl,
    feedUrl,
    webcalUrl,
    // One-click Google subscribe: `cid` must be the feed URL with a webcal:// scheme (same path as
    // `feedUrl`); `/calendar/r` is the subscribe entry point that reliably shows the add prompt.
    // The ICS is still served over HTTPS — only this link uses webcal for Google’s handler.
    // Token is rotated on each Google click (see prepare-google-calendar-subscribe) so re-add works.
    google: `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcalUrl)}`,
    apple: feedUrl,
    appleWebcal: webcalUrl,
    outlook: `https://outlook.live.com/calendar/0/deeplink/subscribe?url=${encodeURIComponent(feedUrl)}&name=${encodeURIComponent(CALENDAR_SUBSCRIPTION_DISPLAY_NAME)}`,
  }
}

