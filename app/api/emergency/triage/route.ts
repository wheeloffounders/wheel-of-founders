import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'
import { withRateLimit } from '@/lib/rate-limit-middleware'
import { generateEmergencyTriage } from '@/lib/emergency-triage'
import { triageJsonFromRow } from '@/lib/emergency-triage-parse'
import type { EmergencyTriageJson } from '@/lib/types/emergency-triage'

export async function POST(req: NextRequest) {
  return withRateLimit(req, 'emergency', async () => {
    const session = await getServerSessionFromRequest(req)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    let body: { emergencyId?: string; description?: string; fireDate?: string }
    try {
      body = (await req.json()) as typeof body
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const emergencyId = typeof body.emergencyId === 'string' ? body.emergencyId.trim() : ''
    const description = typeof body.description === 'string' ? body.description.trim() : ''
    const fireDate = typeof body.fireDate === 'string' ? body.fireDate.trim() : ''

    if (!emergencyId || !description || !fireDate) {
      return NextResponse.json({ error: 'emergencyId, description, and fireDate are required' }, { status: 400 })
    }

    const db = getServerSupabase()
    const { data: row, error: fetchError } = await db
      .from('emergencies')
      .select('id, user_id, severity, triage_json')
      .eq('id', emergencyId)
      .single()

    if (fetchError || !row) {
      return NextResponse.json({ error: 'Emergency not found' }, { status: 404 })
    }

    const r = row as { id: string; user_id: string; severity: string; triage_json?: unknown }
    if (r.user_id !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (r.severity !== 'hot') {
      return NextResponse.json({ error: 'Triage is only generated for Hot severity' }, { status: 400 })
    }

    const existingTriage = triageJsonFromRow(r.triage_json)
    if (existingTriage) {
      return NextResponse.json({
        triage: existingTriage,
        emergencyId,
        persisted: true,
      })
    }

    let triage: EmergencyTriageJson
    try {
      triage = await generateEmergencyTriage(session.user.id, description, fireDate)
    } catch (e) {
      console.error('[emergency/triage] AI failed:', e)
      return NextResponse.json({ error: 'Failed to generate triage' }, { status: 502 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- triage_json column not in generated DB types yet
    const { data: updatedRow, error: updateError } = await (db.from('emergencies') as any)
      .update({
        triage_json: triage,
        updated_at: new Date().toISOString(),
      })
      .eq('id', emergencyId)
      .eq('user_id', session.user.id)
      .select('id, triage_json')
      .single()

    if (updateError) {
      console.error('[emergency/triage] DB update failed:', {
        message: updateError.message,
        code: (updateError as { code?: string }).code,
        details: (updateError as { details?: string }).details,
        hint: (updateError as { hint?: string }).hint,
        emergencyId,
      })
      return NextResponse.json(
        { error: 'Failed to save triage', details: updateError.message },
        { status: 500 }
      )
    }

    const verified = triageJsonFromRow(updatedRow?.triage_json)
    if (!verified) {
      console.error('[emergency/triage] Verification failed: triage_json empty or invalid after update', {
        emergencyId,
        hasRow: !!updatedRow,
      })
      return NextResponse.json({ error: 'Triage did not persist after save' }, { status: 500 })
    }

    console.log('[emergency/triage] Persisted triage_json for emergency', emergencyId)

    return NextResponse.json({ triage: verified, emergencyId, persisted: false })
  })
}
