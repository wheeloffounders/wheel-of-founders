import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'
import {
  buildUserAcquisitionSnapshot,
  normalizeInboundFromBody,
} from '@/lib/acquisition-snapshot'

export const dynamic = 'force-dynamic'

function authProviderFromUser(user: { app_metadata?: Record<string, unknown> }): string | null {
  const provider = user.app_metadata?.provider
  return typeof provider === 'string' && provider.trim() ? provider.trim().slice(0, 64) : null
}

/**
 * Backfill acquisition_snapshot when profile was created before callback could read the cookie.
 * Body: { inbound: InboundTouchSnapshot }
 * Only writes when acquisition_snapshot is currently null.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSessionFromRequest(req)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await req.json().catch(() => null)) as { inbound?: unknown } | null
    const inbound = normalizeInboundFromBody(body?.inbound)
    if (!inbound) {
      return NextResponse.json({ ok: true, skipped: 'no_inbound' })
    }

    const db = getServerSupabase()
    const { data: profile } = await db
      .from('user_profiles')
      .select('acquisition_snapshot')
      .eq('id', session.user.id)
      .maybeSingle()

    if ((profile as { acquisition_snapshot?: unknown } | null)?.acquisition_snapshot) {
      return NextResponse.json({ ok: true, skipped: 'already_set' })
    }

    const snapshot = buildUserAcquisitionSnapshot(inbound, 'client_backfill', {
      auth_provider: authProviderFromUser(session.user),
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (db.from('user_profiles') as any)
      .update({ acquisition_snapshot: snapshot, updated_at: new Date().toISOString() })
      .eq('id', session.user.id)
      .is('acquisition_snapshot', null)

    if (error) {
      console.error('[api/user/acquisition-snapshot]', error.message)
      return NextResponse.json({ error: 'Update failed' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, recorded: true })
  } catch (e) {
    console.error('[api/user/acquisition-snapshot]', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
