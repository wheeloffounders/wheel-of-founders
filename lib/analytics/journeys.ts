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

  const { error } = await db.from('page_views').insert({
    user_id: options?.userId ?? null,
    session_id: sessionId,
    path,
    metadata: Object.keys(metadata).length > 0 ? metadata : null,
  })
  if (error) {
    console.error('[analytics/journeys] recordPageView failed:', error)
  }
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

  if (!views || views.length === 0) {
    return { paths: {}, drops: {}, completedFlow: 0, totalSessions: 0 }
  }

  // Group by user session (simplified: use user_id + date as session)
  const sessions = new Map<string, { paths: string[]; completed: boolean }>()
  for (const v of views) {
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
