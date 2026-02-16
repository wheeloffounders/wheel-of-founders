import { NextRequest, NextResponse } from 'next/server'
import { getUserSession } from '@/lib/auth'
import { recordFunnelStep } from '@/lib/analytics/funnels'

/**
 * POST: Record a funnel step
 * Auth: optional. If logged in, userId is stored; otherwise anonymous (sessionId recommended).
 * Body: { funnel_name, step_name, step_number, session_id?, metadata? }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getUserSession()
    const body = await req.json().catch(() => ({}))
    const { funnel_name, step_name, step_number } = body

    if (!funnel_name || !step_name || typeof step_number !== 'number') {
      return NextResponse.json({ error: 'Missing funnel_name, step_name, or step_number' }, { status: 400 })
    }

    await recordFunnelStep(funnel_name, step_name, step_number, {
      userId: session?.user?.id ?? null,
      sessionId: body.session_id ?? null,
      metadata: body.metadata ?? undefined,
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[api/analytics/funnel]', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
