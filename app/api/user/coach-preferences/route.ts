import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'

const TONE_KEYS = ['more_direct', 'more_strategic', 'more_encouraging'] as const
type ToneDirective = (typeof TONE_KEYS)[number]

function isToneDirective(v: unknown): v is ToneDirective {
  return typeof v === 'string' && (TONE_KEYS as readonly string[]).includes(v)
}

/**
 * PATCH { toneDirective: "more_direct" | "more_strategic" | "more_encouraging" }
 * Merges into user_profiles.coach_preferences
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const toneDirective = body?.toneDirective

    if (!isToneDirective(toneDirective)) {
      return NextResponse.json({ error: 'Invalid toneDirective' }, { status: 400 })
    }

    const db = getServerSupabase()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- coach_preferences column may lag generated types
    const { data: row, error: fetchErr } = await (db.from('user_profiles') as any)
      .select('coach_preferences')
      .eq('id', session.user.id)
      .maybeSingle()

    if (fetchErr) {
      console.error('[coach-preferences] fetch', fetchErr)
      return NextResponse.json({ error: 'Failed to load preferences' }, { status: 500 })
    }

    const existing =
      row && typeof row === 'object' && row.coach_preferences && typeof row.coach_preferences === 'object'
        ? { ...(row.coach_preferences as Record<string, unknown>) }
        : {}

    const merged = {
      ...existing,
      tone_directive: toneDirective,
      tone_directive_at: new Date().toISOString(),
    }

    const { error: updErr } = await (db.from('user_profiles') as any).update({
      coach_preferences: merged,
      updated_at: new Date().toISOString(),
    }).eq('id', session.user.id)

    if (updErr) {
      // Column may not exist until migration applied — surface clearly in dev
      console.error('[coach-preferences] update', updErr)
      return NextResponse.json({ error: 'Failed to save preferences' }, { status: 500 })
    }

    return NextResponse.json({ success: true, coach_preferences: merged })
  } catch (e) {
    console.error('[coach-preferences]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
