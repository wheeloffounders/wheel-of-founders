import { NextRequest, NextResponse } from 'next/server'
import { getUserSession } from '@/lib/auth'
import { recordPageView } from '@/lib/analytics/journeys'

/**
 * POST: Record a page view
 * Auth: optional. If logged in, userId is stored; otherwise anonymous (sessionId recommended).
 * Body: { path, session_id?, referrer? }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getUserSession()
    const body = await req.json().catch(() => ({}))
    const path =
      typeof body.path === 'string' && body.path
        ? body.path
        : (req.headers.get('referer') ?? '')
            .split('?')[0]
            ?.replace(/^https?:\/\/[^/]+/, '') || '/'

    await recordPageView(path, {
      userId: session?.user?.id ?? null,
      sessionId: body.session_id ?? null,
      referrer: body.referrer ?? req.headers.get('referer') ?? null,
      metadata: body.metadata ?? undefined,
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[api/analytics/page-view]', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
