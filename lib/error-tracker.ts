/**
 * Code Scary - Comprehensive error tracking.
 * Catches API, UI, business logic, and unhandled failures.
 * Sends to Sentry (production) and our database for dashboards.
 */

const isDev = process.env.NODE_ENV === 'development'

/**
 * Coerce any thrown/rejected value into an Error with a readable message.
 * Avoids `[object Object]` when libraries reject with plain objects or `{}`.
 */
export function toTrackedError(input: unknown): Error {
  if (input instanceof Error) return input
  if (typeof input === 'string') return new Error(input)
  if (input == null) {
    return new Error(input === null ? 'Promise rejected with null' : 'Promise rejected with undefined')
  }
  if (typeof input === 'object') {
    const o = input as Record<string, unknown>
    const msg = o.message
    if (typeof msg === 'string' && msg.trim()) {
      const err = new Error(msg)
      if (typeof o.stack === 'string') err.stack = o.stack
      err.cause = o.cause
      return err
    }
    try {
      const s = JSON.stringify(input)
      if (s === '{}') {
        return new Error(
          'Promise rejected with empty object {} — often a mistaken reject({}) or res.json().catch(() => ({})) passed to throw'
        )
      }
      return new Error(`Promise rejected (object): ${s}`)
    } catch {
      return new Error('Promise rejected with a non-serializable object')
    }
  }
  return new Error(`Promise rejected: ${String(input)}`)
}

export interface ErrorContext {
  userId?: string
  component?: string
  action?: string
  metadata?: Record<string, unknown>
  severity: 'low' | 'medium' | 'high' | 'critical'
  url?: string
}

export async function trackError(
  error: unknown,
  context: ErrorContext
): Promise<void> {
  const errorObj =
    typeof error === 'string' ? new Error(error) : toTrackedError(error)

  if (isDev) {
    console.error(
      `🔥 CODE SCARY [DEV]: ${errorObj.name}: ${errorObj.message}`,
      '\nstack:',
      errorObj.stack,
      '\ncontext:',
      context
    )
  }

  // Sentry (production only - we skip in dev via beforeSend)
  if (typeof window !== 'undefined') {
    try {
      const Sentry = await import('@sentry/nextjs')
      Sentry.captureException(errorObj, {
        tags: {
          severity: context.severity,
          component: context.component ?? 'unknown',
          action: context.action ?? 'unknown',
        },
        extra: {
          ...context.metadata,
          userId: context.userId,
        },
        user: context.userId ? { id: context.userId } : undefined,
      })
    } catch {
      // Sentry not loaded or failed
    }
  }

  // Save to our database (client calls API)
  try {
    await fetch('/api/error-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        error_type: errorObj.name,
        error_message: errorObj.message,
        stack_trace: errorObj.stack,
        url: typeof window !== 'undefined' ? window.location.href : context.url,
        component: context.component,
        severity: context.severity,
        metadata: context.metadata,
      }),
    })
  } catch {
    // Non-blocking - don't throw
  }
}

export function trackErrorSync(error: unknown, context: ErrorContext): void {
  trackError(error, context).catch(() => {})
}
