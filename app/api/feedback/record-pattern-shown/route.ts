import { NextRequest, NextResponse } from 'next/server'
import { getUserSession } from '@/lib/auth'
import { getServerSupabase } from '@/lib/server-supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

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

    const { data: existingData } = await db
      .from('feedback_trigger_preferences')
      .select('pattern_prompted_at, dismissed_triggers, maybe_later_until')
      .eq('user_id', session.user.id)
      .maybeSingle()

    type FeedbackPrefsRow = {
      pattern_prompted_at?: Record<string, string> | null
      dismissed_triggers?: Record<string, boolean> | null
      maybe_later_until?: Record<string, string> | null
    }
    const existing = existingData as FeedbackPrefsRow | null

    const promptedAt = { ...(existing?.pattern_prompted_at || {}) }
    promptedAt[patternType] = new Date().toISOString()

    const upsertPayload = {
      user_id: session.user.id,
      pattern_prompted_at: promptedAt,
      dismissed_triggers: existing?.dismissed_triggers ?? {},
      maybe_later_until: existing?.maybe_later_until ?? {},
      updated_at: new Date().toISOString(),
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase DB types omit feedback_trigger_preferences
    const { error } = await (db.from('feedback_trigger_preferences') as any).upsert(upsertPayload, {
      onConflict: 'user_id',
    })

    if (error) {
      return NextResponse.json({ error: 'Failed to record' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[Record pattern shown]', err)
    return NextResponse.json({ error: 'Failed to record' }, { status: 500 })
  }
}
