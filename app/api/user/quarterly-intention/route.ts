import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { serverSupabase } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const MAX_LEN = 4000

/**
 * GET — current quarterly_intention for the authenticated user.
 * PATCH — body { quarterlyIntention: string | null }
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSessionFromRequest(req)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const db = serverSupabase()
    const { data, error } = await (db.from('user_profiles') as any)
      .select('quarterly_intention')
      .eq('id', session.user.id)
      .maybeSingle()

    if (error) {
      console.error('[quarterly-intention GET]', error)
      return NextResponse.json({ error: 'Failed to load' }, { status: 500 })
    }

    const row = data as { quarterly_intention?: string | null } | null
    return NextResponse.json({
      quarterlyIntention: (row?.quarterly_intention ?? '').trim(),
    })
  } catch (e) {
    console.error('[quarterly-intention GET]', e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSessionFromRequest(req)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = (await req.json().catch(() => ({}))) as { quarterlyIntention?: string | null }
    const raw =
      typeof body.quarterlyIntention === 'string'
        ? body.quarterlyIntention.trim().slice(0, MAX_LEN)
        : body.quarterlyIntention === null
          ? ''
          : null

    if (raw === null) {
      return NextResponse.json({ error: 'quarterlyIntention must be a string or null' }, { status: 400 })
    }

    const db = serverSupabase()
    const { error } = await (db.from('user_profiles') as any)
      .update({
        quarterly_intention: raw.length > 0 ? raw : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', session.user.id)

    if (error) {
      console.error('[quarterly-intention PATCH]', error)
      return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, quarterlyIntention: raw })
  } catch (e) {
    console.error('[quarterly-intention PATCH]', e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
