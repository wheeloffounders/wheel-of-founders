import { getServerSupabase } from '@/lib/server-supabase'

export type JourneyStats = {
  paths: Record<string, number>
  drops: Record<string, number>
  completedFlow: number
  totalSessions: number
}

/**
 * Record a page view (server-side)
 * userId is optional for anonymous sessions (onboarding); use sessionId to correlate.
 */
export async function recordPageView(
  path: string,
  options?: {
    userId?: string | null
    sessionId?: string | null
    referrer?: string | null
    metadata?: Record<string, unknown>
  }
) {
  const db = getServerSupabase()
  // session_id is FK to user_sessions; use null for anonymous. Client session id goes in metadata.
  const isUuid = (s: string) => /^[0-9a-f-]{36}$/i.test(s)
  const sessionId = options?.sessionId && isUuid(options.sessionId) ? options.sessionId : null
  const metadata: Record<string, unknown> = { ...(options?.metadata ?? {}) }
  if (options?.referrer) metadata.referrer = options.referrer
  if (options?.sessionId && !sessionId) metadata.client_session_id = options.sessionId

  const payload = {
    user_id: options?.userId ?? null,
    session_id: sessionId,
    path,
    metadata: Object.keys(metadata).length > 0 ? metadata : null,
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase DB types omit page_views
  const { error } = await (db.from('page_views') as any).insert(payload as any)
  if (error) {
    console.error('[analytics/journeys] recordPageView failed:', error)
  }
}

export type BatchPageViewInput = {
  path: string
  /** Unix ms or ISO string */
  timestamp?: number | string
  sessionId?: string | null
  referrer?: string | null
  metadata?: Record<string, unknown>
}

/**
 * Insert multiple page_views in one round-trip (same rules as recordPageView).
 */
export async function recordPageViewsBatch(items: BatchPageViewInput[], userId: string | null) {
  if (items.length === 0) return { error: null }
  const db = getServerSupabase()
  const isUuid = (s: string) => /^[0-9a-f-]{36}$/i.test(s)

  const rows = items.map((item) => {
    const sessionId = item.sessionId && isUuid(item.sessionId) ? item.sessionId : null
    const metadata: Record<string, unknown> = { ...(item.metadata ?? {}) }
    if (item.referrer) metadata.referrer = item.referrer
    if (item.sessionId && !sessionId) metadata.client_session_id = item.sessionId

    let enteredAt: string
    if (typeof item.timestamp === 'number' && Number.isFinite(item.timestamp)) {
      enteredAt = new Date(item.timestamp).toISOString()
    } else if (typeof item.timestamp === 'string' && item.timestamp) {
      enteredAt = new Date(item.timestamp).toISOString()
    } else {
      enteredAt = new Date().toISOString()
    }

    return {
      user_id: userId,
      session_id: sessionId,
      path: item.path,
      entered_at: enteredAt,
      metadata: Object.keys(metadata).length > 0 ? metadata : null,
    }
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase DB types omit page_views
  const { error } = await (db.from('page_views') as any).insert(rows as any)
  if (error) {
    console.error('[analytics/journeys] recordPageViewsBatch failed:', error)
    return { error }
  }
  return { error: null }
}

/**
 * Analyze user journeys from page_views for the last N days
 * Aggregates paths and drop-off points
 */
export async function analyzeJourneys(days = 7): Promise<JourneyStats> {
  const db = getServerSupabase()
  const since = new Date(Date.now() - days * 86400000).toISOString()

  const { data: views } = await db
    .from('page_views')
    .select('user_id, path, session_id, entered_at')
    .gte('entered_at', since)
    .order('entered_at', { ascending: true })

  type PageViewRow = {
    user_id?: string | null
    path?: string | null
    session_id?: string | null
    entered_at?: string | null
  }
  const viewRows = (views as PageViewRow[] | null) ?? []

  if (viewRows.length === 0) {
    return { paths: {}, drops: {}, completedFlow: 0, totalSessions: 0 }
  }

  // Group by user session (simplified: use user_id + date as session)
  const sessions = new Map<string, { paths: string[]; completed: boolean }>()
  for (const v of viewRows) {
    const day = v.entered_at?.slice(0, 10) ?? ''
    const key = `${v.user_id}|${day}`
    if (!sessions.has(key)) {
      sessions.set(key, { paths: [], completed: false })
    }
    const s = sessions.get(key)!
    if (!s.paths.includes(v.path ?? '')) {
      s.paths.push(v.path ?? '')
    }
    if (v.path === '/evening') {
      s.completed = s.paths.includes('/morning')
    }
  }

  const paths: Record<string, number> = {}
  const drops: Record<string, number> = {}
  let completedFlow = 0

  for (const [, { paths: p, completed }] of sessions) {
    const pathKey = p.join(' → ')
    paths[pathKey] = (paths[pathKey] ?? 0) + 1
    if (completed) completedFlow++
    if (!completed && p.length > 0) {
      const last = p[p.length - 1]!
      drops[last] = (drops[last] ?? 0) + 1
    }
  }

  return {
    paths,
    drops,
    completedFlow,
    totalSessions: sessions.size,
  }
}
