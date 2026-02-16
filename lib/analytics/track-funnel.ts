/**
 * Client-side funnel step tracking.
 * Calls /api/analytics/funnel with funnel_name, step_name, step_number.
 * Fire-and-forget; no retry for simplicity.
 */

function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return ''
  let id = sessionStorage.getItem('wof_session_id')
  if (!id) {
    id = `anon_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
    sessionStorage.setItem('wof_session_id', id)
  }
  return id
}

export function trackFunnelStep(
  funnelName: string,
  stepName: string,
  stepNumber: number,
  metadata?: Record<string, unknown>
) {
  if (typeof window === 'undefined') return
  const sessionId = getOrCreateSessionId()
  fetch('/api/analytics/funnel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      funnel_name: funnelName,
      step_name: stepName,
      step_number: stepNumber,
      session_id: sessionId || undefined,
      metadata: metadata ?? undefined,
    }),
  }).catch(() => {})
}
