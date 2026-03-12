import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'

export const dynamic = 'force-dynamic'

/** POST: Save push subscription for the logged-in user (endpoint + p256dh + auth columns) */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSessionFromRequest(req)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const endpoint = typeof body?.endpoint === 'string' ? body.endpoint.trim() : ''
    const keys = body?.keys
    const p256dh = typeof keys?.p256dh === 'string' ? keys.p256dh.trim() : ''
    const auth = typeof keys?.auth === 'string' ? keys.auth.trim() : ''

    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json(
        { error: 'Invalid subscription: endpoint, keys.p256dh, and keys.auth required' },
        { status: 400 }
      )
    }

    const db = getServerSupabase()
    const { error } = await (db.from('push_subscriptions') as any).upsert(
      {
        user_id: session.user.id,
        endpoint,
        p256dh,
        auth,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,endpoint' }
    )

    if (error) {
      console.error('[push/subscribe] Error:', error)
      const err = error as { code?: string; message?: string }
      if (err.code === '23505' && String(err.message ?? '').includes('push_subscriptions_user_id_key')) {
        return NextResponse.json(
          {
            error:
              'Database schema needs update: run migration 073 (drop push_subscriptions_user_id_key, use unique user_id+endpoint).',
          },
          { status: 409 }
        )
      }
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
