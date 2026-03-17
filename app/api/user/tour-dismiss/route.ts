/**
 * Track "Maybe later" click (tour_dismissed_at).
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { serverSupabase } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSessionFromRequest(req)
    if (!session?.user?.id) return NextResponse.json({ ok: true })

    const db = serverSupabase()
    await (db.from('user_profiles') as any)
      .update({ tour_dismissed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', session.user.id)

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true })
  }
}
