/**
 * Sentry client-side configuration (Code Scary).
 * Runs in the browser. Set NEXT_PUBLIC_SENTRY_DSN to enable.
 *
 * In development we skip initializing Sentry by default so the SDK does not wrap
 * the DOM (sentryWrapped) and clutter stacks. Next.js RSC navigations often throw
 * transient "Failed to fetch (localhost)" while Turbopack compiles or the dev server
 * restarts — that is environmental, not an application bug.
 * Set NEXT_PUBLIC_SENTRY_DEV=1 to load Sentry in dev anyway.
 */
import * as Sentry from '@sentry/nextjs'

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN
const allowDevSentry = process.env.NEXT_PUBLIC_SENTRY_DEV === '1'
const shouldInit = Boolean(dsn) && (process.env.NODE_ENV === 'production' || allowDevSentry)

if (shouldInit) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    // Next.js soft navigation to the dev server — flaky while Turbopack compiles or the server restarts
    ignoreErrors: [
      /Failed to fetch.*localhost/i,
      /Failed to fetch.*127\.0\.0\.1/i,
      'Load failed',
      /^NetworkError when attempting to fetch resource$/i,
      /Importing a module script failed/i,
    ],
    beforeSend(event, hint) {
      if (process.env.NODE_ENV === 'development' && !allowDevSentry) return null
      return event
    },
  })
}
