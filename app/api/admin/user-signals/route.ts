import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/server-supabase'
import { adminSupabase } from '@/lib/supabase/admin'
import { fetchUserSignals } from '@/lib/admin/get-user-signals'
import { computeShadowFromUserSignals } from '@/lib/admin/shadow-engine'
import { authorizeAdminApiRequest } from '@/lib/admin'

export const dynamic = 'force-dynamic'

/** GET ?userId= — AI-ready snapshot: first 72h signals + shadow engine (admin only). */
export async function GET(req: NextRequest) {
  try {
    if (!(await authorizeAdminApiRequest(req))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = req.nextUrl.searchParams.get('userId')?.trim()
    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    if (!adminSupabase) {
      return NextResponse.json({ error: 'Admin client not configured' }, { status: 500 })
    }

    const signals = await fetchUserSignals(adminSupabase, userId)
    if (!signals) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const shadow = computeShadowFromUserSignals(signals)

    return NextResponse.json({
      signals,
      shadow,
    })
  } catch (e) {
    console.error('[admin/user-signals]', e)
    return NextResponse.json({ error: 'Failed to load signals' }, { status: 500 })
  }
}
