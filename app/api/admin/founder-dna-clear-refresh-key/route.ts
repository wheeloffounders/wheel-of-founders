import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'
import { LAST_REFRESH_KEYS, normalizeLastRefreshed } from '@/lib/founder-dna/update-schedule'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const ALLOWED = new Set<string>(Object.values(LAST_REFRESH_KEYS))

async function assertAdmin(req: NextRequest): Promise<string | null> {
  const session = await getServerSessionFromRequest(req)
  if (!session) return null
  const db = getServerSupabase()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- admin flags are custom columns
  const { data } = await (db.from('user_profiles') as any)
    .select('is_admin, admin_role')
    .eq('id', session.user.id)
    .maybeSingle()
  const row = (data as { is_admin?: boolean; admin_role?: string } | null) ?? null
  if (row?.is_admin || row?.admin_role === 'super_admin') return session.user.id
  return null
}

/**
 * Admin: remove one key from user_profiles.last_refreshed so the next API visit runs a "first" refresh.
 * POST { userId: string, key: string } — key must be a LAST_REFRESH_KEYS value.
 */
export async function POST(req: NextRequest) {
  try {
    if (!(await assertAdmin(req))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const body = (await req.json().catch(() => ({}))) as { userId?: string; key?: string }
    if (!body.userId || !body.key || !ALLOWED.has(body.key)) {
      return NextResponse.json(
        { error: 'userId and valid key required (see LAST_REFRESH_KEYS)' },
        { status: 400 },
      )
    }

    const db = getServerSupabase()
    const { data: row, error } = await db.from('user_profiles').select('last_refreshed').eq('id', body.userId).maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const cur = normalizeLastRefreshed((row as { last_refreshed?: unknown } | null)?.last_refreshed)
    const next = { ...cur }
    delete next[body.key]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- JSONB column typing lag
    const { error: upErr } = await (db.from('user_profiles') as any)
      .update({ last_refreshed: next, updated_at: new Date().toISOString() })
      .eq('id', body.userId)
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })
    return NextResponse.json({ success: true, removedKey: body.key, userId: body.userId })
  } catch (e) {
    console.error('[admin/founder-dna-clear-refresh-key]', e)
    return NextResponse.json({ error: 'Failed to clear refresh key' }, { status: 500 })
  }
}
