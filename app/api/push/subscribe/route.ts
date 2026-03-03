import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'

export const dynamic = 'force-dynamic'

/** POST: Save push subscription for the logged-in user */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSessionFromRequest(req)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const subscription = await req.json()
    const endpoint = subscription?.endpoint
    if (!endpoint || typeof endpoint !== 'string') {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
    }

    const db = getServerSupabase()
    const { error } = await (db.from('push_subscriptions') as any).upsert(
      {
        user_id: session.user.id,
        endpoint,
        subscription,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,endpoint' }
    )

    if (error) {
      console.error('[push/subscribe] Error:', error)
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[push/subscribe] Error:', err)
    return NextResponse.json(
      { error: 'Failed to save subscription' },
      { status: 500 }
    )
  }
}
