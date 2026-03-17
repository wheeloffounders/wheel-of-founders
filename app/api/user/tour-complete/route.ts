/**
 * Mark tour as completed (has_seen_tour = true).
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { serverSupabase } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSessionFromRequest(req)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const db = serverSupabase()
    await (db.from('user_profiles') as any)
      .update({ has_seen_tour: true, updated_at: new Date().toISOString() })
      .eq('id', session.user.id)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[tour-complete] Error:', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
