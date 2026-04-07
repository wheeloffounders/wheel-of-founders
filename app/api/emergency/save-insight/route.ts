import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'
import { withRateLimit } from '@/lib/rate-limit-middleware'

/**
 * Persists the streamed AI coach insight on the **`emergencies`** row (`insight` column).
 * Day-level brain dumps use **`emergency_logs`** — this route is only for per-fire coach text.
 */
type SaveInsightJson = {
  emergencyId?: unknown
  insightText?: unknown
}

export async function POST(req: NextRequest) {
  return withRateLimit(req, 'emergency', async () => {
    const session = await getServerSessionFromRequest(req)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    let body: SaveInsightJson
    try {
      body = (await req.json()) as SaveInsightJson
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const emergencyId = typeof body.emergencyId === 'string' ? body.emergencyId.trim() : ''
    const insightText = typeof body.insightText === 'string' ? body.insightText : ''

    if (!emergencyId || !insightText) {
      return NextResponse.json({ error: 'emergencyId and insightText are required' }, { status: 400 })
    }

    const db = getServerSupabase()
    const { data: row, error: fetchError } = await (db.from('emergencies') as any)
      .select('id, user_id')
      .eq('id', emergencyId)
      .single()

    if (fetchError || !row) {
      return NextResponse.json({ error: 'Emergency not found' }, { status: 404 })
    }

    const r = row as { id: string; user_id: string }
    if (r.user_id !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const now = new Date().toISOString()
    const { error: updateError } = await (db.from('emergencies') as any)
      .update({ insight: insightText, updated_at: now })
      .eq('id', emergencyId)
      .eq('user_id', session.user.id)

    if (updateError) {
      console.error('[emergency/save-insight] DB update failed:', updateError.message)
      return NextResponse.json({ error: 'Failed to save insight' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, emergencyId })
  })
}
