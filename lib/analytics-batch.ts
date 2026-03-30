/**
 * Client-only batched page view queue → POST /api/analytics/batch-page-views
 * Reduces serverless invocations vs one request per navigation.
 */

const BATCH_SIZE = 5
const BATCH_INTERVAL_MS = 30_000
const MAX_PER_REQUEST = 50

export type QueuedPageView = {
  path: string
  timestamp: number
  session_id?: string
  referrer?: string | null
  metadata?: Record<string, unknown>
}

let queue: QueuedPageView[] = []
let flushTimer: ReturnType<typeof setInterval> | null = null
let flushing = false
let unloadListenersAttached = false

/** Stable anonymous correlation id (stored in sessionStorage). */
export function getOrCreatePageViewClientSessionId(): string {
  if (typeof window === 'undefined') return ''
  let id = sessionStorage.getItem('wof_pageview_session')
  if (!id) {
    id = `anon_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
    sessionStorage.setItem('wof_pageview_session', id)
  }
  return id
}

function attachUnloadFlush() {
  if (typeof window === 'undefined' || unloadListenersAttached) return
  unloadListenersAttached = true
  const run = () => {
    if (queue.length > 0) void flushBatch()
  }
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') run()
  })
  window.addEventListener('pagehide', run)
}

function ensureFlushTimer() {
  if (typeof window === 'undefined') return
  if (flushTimer) return
  flushTimer = setInterval(() => void flushBatch(), BATCH_INTERVAL_MS)
}

async function postBatch(chunk: QueuedPageView[]): Promise<boolean> {
  try {
    const res = await fetch('/api/analytics/batch-page-views', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ pageViews: chunk }),
      keepalive: true,
    })
    return res.ok
  } catch {
    return false
  }
}

/**
 * Flush queued page views. Sends up to MAX_PER_REQUEST per HTTP call.
 */
export async function flushBatch(): Promise<void> {
  if (typeof window === 'undefined' || queue.length === 0 || flushing) return
  flushing = true
  try {
    while (queue.length > 0) {
      const size = Math.min(queue.length, MAX_PER_REQUEST)
      const chunk = queue.splice(0, size)
      const ok = await postBatch(chunk)
      if (!ok) {
        queue.unshift(...chunk)
        break
      }
    }
  } finally {
    flushing = false
  }
}

/**
 * Queue a page view. Flushes when queue reaches BATCH_SIZE or on interval / tab hide.
 */
export function trackPageView(
  path: string,
  options?: { session_id?: string; referrer?: string | null; metadata?: Record<string, unknown> }
) {
  if (typeof window === 'undefined') return
  const p = typeof path === 'string' ? path.trim() : ''
  if (!p) return
  if (typeof navigator !== 'undefined' && !navigator.onLine) return

  queue.push({
    path: p,
    timestamp: Date.now(),
    session_id: options?.session_id,
    referrer: options?.referrer,
    metadata: options?.metadata,
  })

  if (queue.length >= BATCH_SIZE) void flushBatch()
  ensureFlushTimer()
  attachUnloadFlush()
}
