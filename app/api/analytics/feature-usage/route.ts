import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Record feature usage for founder analytics. Requires authenticated session.
 * RLS allows only service_role to write feature_usage, so we insert via server client.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      feature_name: string
      action: string
      page?: string
      duration_seconds?: number
      metadata?: Record<string, unknown>
    }
    const { feature_name, action, page, duration_seconds, metadata } = body
    if (!feature_name || !action) {
      return NextResponse.json({ error: 'feature_name and action required' }, { status: 400 })
    }

    const session = await getServerSession()
    if (!session) {
      // Return 200 to avoid 401 breaking UI; analytics is non-critical
      return NextResponse.json({ ok: false, skipped: 'not_authenticated' })
    }

    const db = getServerSupabase()
    const row = {
      user_id: session.user.id,
      feature_name,
      action,
      page: page ?? null,
      duration_seconds: duration_seconds ?? null,
      metadata: metadata ?? null,
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase DB types omit feature_usage
    await db.from('feature_usage').insert(row as any)
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[feature-usage]', e)
    return NextResponse.json({ error: 'Failed to record' }, { status: 500 })
  }
}
