/**
 * Search User: User list/search API (dev-only).
 * GET (no q): return all users
 * GET ?q=...: filter by email, user ID, or name
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireDevOnly } from '@/lib/admin'
import { adminSupabase } from '@/lib/supabase/admin'
import { getServerSupabase } from '@/lib/server-supabase'

export const dynamic = 'force-dynamic'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function matchesQuery(
  q: string,
  user: { id: string; email: string | null; name: string | null }
): boolean {
  const lower = q.toLowerCase()
  if (user.email?.toLowerCase().includes(lower)) return true
  if (user.id.toLowerCase().includes(lower)) return true
  if (user.name?.toLowerCase().includes(lower)) return true
  return false
}

export async function GET(req: NextRequest) {
  try {
    requireDevOnly()
  } catch {
    return NextResponse.json({ error: 'Search User is only available in development' }, { status: 403 })
  }

  const q = req.nextUrl.searchParams.get('q')?.trim()

  const db = getServerSupabase()
  const admin = adminSupabase
  if (!admin) {
    return NextResponse.json({ error: 'Admin client not configured' }, { status: 500 })
  }

  const results: Array<{
    id: string
    email: string | null
    name: string | null
    last_active: string | null
    streak: number | null
    profile: Record<string, unknown> | null
  }> = []

  const isUuid = q && UUID_REGEX.test(q)

  if (isUuid && q) {
    // Lookup by exact user ID
    const [authRes, profileRes] = await Promise.all([
      admin.auth.admin.getUserById(q),
      db.from('user_profiles').select('*').eq('id', q).maybeSingle(),
    ])
    const user = authRes.data?.user
    const profile = profileRes.data as Record<string, unknown> | null
    if (user || profile) {
      results.push({
        id: q,
        email: user?.email ?? null,
        name: (profile?.preferred_name as string) ?? (profile?.name as string) ?? null,
        last_active: (profile?.last_review_date as string) ?? null,
        streak: (profile?.current_streak as number) ?? null,
        profile,
      })
    }
  } else {
    // Fetch all users (auth + profiles)
    const { data, error } = await admin.auth.admin.listUsers({ perPage: 500 })
    if (error) {
      console.error('[list/users] auth.admin.listUsers error:', error)
      return NextResponse.json({ error: 'Failed to list users' }, { status: 500 })
    }

    const userList = data?.users ?? []
    const ids = userList.map((u) => u.id)
    const { data: profiles } = await db.from('user_profiles').select('*').in('id', ids)
    const profileMap = new Map((profiles ?? []).map((p: { id: string }) => [p.id, p]))

    for (const user of userList) {
      const profile = profileMap.get(user.id) as Record<string, unknown> | undefined
      const name = (profile?.preferred_name as string) ?? (profile?.name as string) ?? null
      const row = {
        id: user.id,
        email: user.email ?? null,
        name,
        last_active: (profile?.last_review_date as string) ?? null,
        streak: (profile?.current_streak as number) ?? null,
        profile: profile ?? null,
      }
      if (!q || q.length < 2 || matchesQuery(q, { id: row.id, email: row.email, name: row.name })) {
        results.push(row)
      }
    }
  }

  return NextResponse.json({ users: results })
}
