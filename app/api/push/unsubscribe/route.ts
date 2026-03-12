import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'

export const dynamic = 'force-dynamic'

/** POST: Remove push subscription */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSessionFromRequest(req)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const endpoint = typeof body?.endpoint === 'string' ? body.endpoint.trim() : ''
    if (!endpoint) {
      return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 })
    }

    const db = getServerSupabase()
    const { error } = await (db.from('push_subscriptions') as any)
      .delete()
      .eq('user_id', session.user.id)
      .eq('endpoint', endpoint)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[push/unsubscribe] Error:', err)
    return NextResponse.json(
      { error: 'Failed to unsubscribe' },
      { status: 500 }
    )
  }
}
