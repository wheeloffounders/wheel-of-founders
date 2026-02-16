import { NextRequest, NextResponse } from 'next/server'
import { getUserSession } from '@/lib/auth'
import { getServerSupabase } from '@/lib/server-supabase'

/** POST: Record that we showed Mrs. Deer pattern feedback for this pattern type */
export async function POST(req: NextRequest) {
  try {
    const session = await getUserSession()
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await req.json()
    const { patternType } = body as { patternType: string }
    if (!patternType) {
      return NextResponse.json({ error: 'patternType required' }, { status: 400 })
    }

    const db = getServerSupabase()

    const { data: existing } = await db
      .from('feedback_trigger_preferences')
      .select('pattern_prompted_at, dismissed_triggers, maybe_later_until')
      .eq('user_id', session.user.id)
      .maybeSingle()

    const promptedAt = { ...((existing?.pattern_prompted_at as Record<string, string>) || {}) }
    promptedAt[patternType] = new Date().toISOString()

    const { error } = await db
      .from('feedback_trigger_preferences')
      .upsert(
        {
          user_id: session.user.id,
          pattern_prompted_at: promptedAt,
          dismissed_triggers: existing?.dismissed_triggers ?? {},
          maybe_later_until: existing?.maybe_later_until ?? {},
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )

    if (error) {
      return NextResponse.json({ error: 'Failed to record' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[Record pattern shown]', err)
    return NextResponse.json({ error: 'Failed to record' }, { status: 500 })
  }
}
