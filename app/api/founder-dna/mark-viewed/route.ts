import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSessionFromRequest(req)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getServerSupabase()
    const nowIso = new Date().toISOString()

    const { error } = await (db.from('user_profiles') as any)
      .update({ last_viewed_dna_at: nowIso })
      .eq('id', session.user.id)

    if (error) {
      console.error('[founder-dna/mark-viewed]', error)
      return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, last_viewed_dna_at: nowIso })
  } catch (err) {
    console.error('[founder-dna/mark-viewed] error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
