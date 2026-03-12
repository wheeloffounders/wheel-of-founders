'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

/**
 * Captures errors from Server Components, middleware, and the App Router.
 * Required for Sentry to catch React render errors.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
          <div className="max-w-md w-full text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Something went wrong
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              We&apos;ve been notified and are looking into it.
            </p>
            <button
              type="button"
              onClick={reset}
              className="px-6 py-3 rounded-lg bg-[#ef725c] text-white font-medium hover:opacity-90"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
