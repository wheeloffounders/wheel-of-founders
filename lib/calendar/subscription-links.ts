import { getAppPublicOrigin } from '@/lib/app-public-url'

function toWebcal(url: string): string {
  return url.replace(/^https?:\/\//i, 'webcal://')
}

export function buildCalendarFeedUrl(token: string, origin?: string): string {
  const base = (origin?.trim() || getAppPublicOrigin()).replace(/\/$/, '')
  return `${base}/api/calendar/feed?token=${encodeURIComponent(token)}`
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
    // Google subscribes using the webcal:// form of the feed URL as `cid`
    google: `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcalUrl)}`,
    apple: feedUrl,
    appleWebcal: webcalUrl,
    outlook: `https://outlook.live.com/calendar/0/deeplink/subscribe?url=${encodeURIComponent(feedUrl)}&name=${encodeURIComponent('Wheel of Founders')}`,
  }
}

