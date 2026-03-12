/**
 * Code Scary - Comprehensive error tracking.
 * Catches API, UI, business logic, and unhandled failures.
 * Sends to Sentry (production) and our database for dashboards.
 */

const isDev = process.env.NODE_ENV === 'development'

export interface ErrorContext {
  userId?: string
  component?: string
  action?: string
  metadata?: Record<string, unknown>
  severity: 'low' | 'medium' | 'high' | 'critical'
  url?: string
}

export async function trackError(
  error: Error | string,
  context: ErrorContext
): Promise<void> {
  const errorObj = typeof error === 'string' ? new Error(error) : error

  if (isDev) {
    console.error('🔥 CODE SCARY [DEV]:', {
      error: errorObj.message,
      stack: errorObj.stack,
      context,
    })
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

export function trackErrorSync(error: Error | string, context: ErrorContext): void {
  trackError(error, context).catch(() => {})
}
