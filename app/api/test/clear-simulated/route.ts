import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'
import { clearSimulatedEntries } from '@/lib/test/clearSimulatedEntries'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 })
  }

  const session = await getServerSessionFromRequest(req)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { userId?: string } = {}
  try {
    body = await req.json()
  } catch {
    body = {}
  }

  const targetUserId =
    typeof body.userId === 'string' && body.userId === session.user.id ? body.userId : session.user.id

  try {
    const db = getServerSupabase()
    const result = await clearSimulatedEntries(db, targetUserId)
    return NextResponse.json({ success: true, ...result })
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : 'Clear failed' },
      { status: 500 }
    )
  }
}
