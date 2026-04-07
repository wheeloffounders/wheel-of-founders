import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'
import { getEveningEmergencyContextForDate } from '@/lib/evening/emergency-context'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET ?date=yyyy-MM-dd — emergency summary + tomorrow task debt for evening UI & coaching.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSessionFromRequest(req)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const date = req.nextUrl.searchParams.get('date')
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'Invalid or missing date' }, { status: 400 })
    }

    const db = getServerSupabase() as any
    const ctx = await getEveningEmergencyContextForDate(db, session.user.id, date)
    return NextResponse.json(ctx)
  } catch {
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}
