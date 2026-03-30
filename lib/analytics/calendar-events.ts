'use client'

import { trackEvent } from '@/lib/analytics'

export type CalendarPlacement = 'after-morning'
export type CalendarUserSegment = 'new_user' | 'returning_user'

type CalendarEventName =
  | 'calendar_setup_modal_viewed'
  | 'calendar_setup_subscribed'
  | 'calendar_setup_skipped'
  | 'calendar_provider_clicked'

export async function trackCalendarEvent(
  eventName: CalendarEventName,
  details: {
    placement: CalendarPlacement
    userSegment: CalendarUserSegment
    provider?: 'google' | 'apple' | 'outlook'
    skipReason?: string
    sendCalendar?: boolean
    whatsappPlaceholder?: boolean
  }
) {
  // Existing analytics stream (e.g. PostHog)
  trackEvent(eventName, details)

  // Server-side canonical store used by admin dashboards
  await fetch('/api/analytics/feature-usage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      feature_name: 'calendar_subscription',
      action: eventName,
      page: '/onboarding',
      metadata: {
        ...details,
        ts: new Date().toISOString(),
      },
    }),
  }).catch(() => {})
}

