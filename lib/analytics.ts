import posthog from 'posthog-js'

let analyticsReady = false

/**
 * Initialize PostHog. Call once when app loads (client-side).
 */
export const initAnalytics = () => {
  if (typeof window === 'undefined') return
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!key) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[Analytics] PostHog key missing - analytics disabled')
    }
    return
  }
  if (analyticsReady) return

  try {
    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
      person_profiles: 'identified_only',
      capture_pageview: false,
      persistence: 'localStorage+cookie',
      loaded: (ph) => {
        analyticsReady = true
        if (process.env.NODE_ENV === 'development') {
          ph.debug()
        }
      },
    })
  } catch (e) {
    console.error('[Analytics] Init failed:', e)
  }
}

const canCapture = () => typeof window !== 'undefined' && analyticsReady

/**
 * Track page views
 */
export const trackPageView = (path: string, userTier?: string) => {
  if (canCapture()) {
    posthog.capture('$pageview', {
      path,
      user_tier: userTier,
      timestamp: new Date().toISOString(),
    })
    if (process.env.NODE_ENV === 'development') {
      console.log('[Analytics] Page view:', path)
    }
  }
}

/**
 * Track custom events
 */
export const trackEvent = (eventName: string, properties?: Record<string, unknown>) => {
  if (canCapture()) {
    posthog.capture(eventName, {
      ...properties,
      timestamp: new Date().toISOString(),
    })
    if (process.env.NODE_ENV === 'development') {
      console.log('[Analytics] Event:', eventName, properties)
    }
  }
}

/**
 * Identify user (call after login)
 */
export const identifyUser = (userId: string, properties?: Record<string, unknown>) => {
  if (canCapture()) {
    posthog.identify(userId, {
      ...properties,
      identified_at: new Date().toISOString(),
    })
    if (process.env.NODE_ENV === 'development') {
      console.log('[Analytics] Identified:', userId, properties)
    }
  }
}

/**
 * Reset on logout
 */
export const resetAnalytics = () => {
  if (typeof window !== 'undefined' && analyticsReady) {
    posthog.reset()
    if (process.env.NODE_ENV === 'development') {
      console.log('[Analytics] Reset')
    }
  }
}
