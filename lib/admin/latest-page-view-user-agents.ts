import type { SupabaseClient } from '@supabase/supabase-js'
import { userAgentFromPageViewRow } from '@/lib/admin/parse-device-type'

const RPC_MISSING = 'PGRST202'
const COLUMN_MISSING = 'PGRST204'

function isRpcOrSchemaError(code: string | undefined): boolean {
  return code === RPC_MISSING || code === COLUMN_MISSING
}

/**
 * Latest page view UA per user from `metadata.user_agent` (and optional `user_agent` column when migrated).
 * Uses RPC `admin_latest_page_view_ua_per_user` when present; otherwise scans recent rows (no migration required).
 */
async function fetchLatestUserAgentsFallback(
  db: SupabaseClient,
  userIds: string[]
): Promise<Map<string, string | null>> {
  const map = new Map<string, string | null>()
  for (const id of userIds) map.set(id, null)
  if (userIds.length === 0) return map

  const pending = new Set(userIds)
  const limit = Math.min(8000, Math.max(500, userIds.length * 40))

  const { data, error } = await (db as any)
    .from('page_views')
    .select('user_id, metadata, user_agent')
    .in('user_id', userIds)
    .order('entered_at', { ascending: false })
    .limit(limit)

  if (error) {
    if (error.code === COLUMN_MISSING) {
      const { data: rows, error: err2 } = await (db as any)
        .from('page_views')
        .select('user_id, metadata')
        .in('user_id', userIds)
        .order('entered_at', { ascending: false })
        .limit(limit)
      if (err2) {
        console.error('[admin] latest UA fallback (metadata-only) failed:', err2)
        return map
      }
      for (const row of rows ?? []) {
        const uid = typeof row.user_id === 'string' ? row.user_id : ''
        if (!uid || !pending.has(uid)) continue
        const ua = userAgentFromPageViewRow(row)
        if (ua) {
          map.set(uid, ua)
          pending.delete(uid)
        }
      }
      return map
    }
    console.error('[admin] latest UA fallback failed:', error)
    return map
  }

  for (const row of data ?? []) {
    const uid = typeof row.user_id === 'string' ? row.user_id : ''
    if (!uid || !pending.has(uid)) continue
    const ua = userAgentFromPageViewRow(row)
    if (ua) {
      map.set(uid, ua)
      pending.delete(uid)
    }
  }
  return map
}

export async function fetchLatestUserAgentsForUsers(
  db: SupabaseClient,
  userIds: string[]
): Promise<Map<string, string | null>> {
  const map = new Map<string, string | null>()
  for (const id of userIds) map.set(id, null)
  if (userIds.length === 0) return map

  let usedRpc = false
  for (let i = 0; i < userIds.length; i += 300) {
    const part = userIds.slice(i, i + 300)
    const { data, error } = await (db as any).rpc('admin_latest_page_view_ua_per_user', { p_user_ids: part })
    if (error) {
      if (isRpcOrSchemaError(error.code)) {
        const merged = await fetchLatestUserAgentsFallback(db, userIds)
        for (const [k, v] of merged) map.set(k, v)
        return map
      }
      console.error('[admin] admin_latest_page_view_ua_per_user:', error)
      continue
    }
    usedRpc = true
    for (const row of (data ?? []) as Array<{ user_id?: string; user_agent?: string | null; metadata?: unknown }>) {
      const uid = typeof row.user_id === 'string' ? row.user_id : ''
      if (!uid) continue
      map.set(uid, userAgentFromPageViewRow(row))
    }
  }

  if (!usedRpc && userIds.length > 0) {
    return fetchLatestUserAgentsFallback(db, userIds)
  }

  return map
}
