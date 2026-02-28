import { NextRequest, NextResponse } from 'next/server'
import { getUserSession } from '@/lib/auth'
import { getServerSupabase } from '@/lib/server-supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/** GET: Fetch user's feedback trigger preferences */
export async function GET() {
  const session = await getUserSession()
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const db = getServerSupabase()
  const { data: prefsData, error } = await db
    .from('feedback_trigger_preferences')
    .select('dismissed_triggers, maybe_later_until')
    .eq('user_id', session.user.id)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ dismissedTriggers: {}, maybeLaterUntil: {} })
  }

  type FeedbackPrefsRow = {
    dismissed_triggers?: Record<string, boolean> | null
    maybe_later_until?: Record<string, string> | null
  }
  const data = prefsData as FeedbackPrefsRow | null

  return NextResponse.json({
    dismissedTriggers: data?.dismissed_triggers || {},
    maybeLaterUntil: data?.maybe_later_until || {},
  })
}

/** POST: Update "Don't show again" or "Maybe later" */
export async function POST(req: NextRequest) {
  const session = await getUserSession()
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const body = await req.json()
  const { action, triggerType } = body as { action: 'dismiss' | 'maybe_later'; triggerType: string }

  if (!triggerType) {
    return NextResponse.json({ error: 'triggerType required' }, { status: 400 })
  }

  const db = getServerSupabase()
  const { data: existingData } = await db
    .from('feedback_trigger_preferences')
    .select('dismissed_triggers, maybe_later_until')
    .eq('user_id', session.user.id)
    .maybeSingle()

  type TriggerPrefsRow = {
    dismissed_triggers?: Record<string, boolean> | null
    maybe_later_until?: Record<string, string> | null
  }
  const existing = existingData as TriggerPrefsRow | null

  const dismissed = existing?.dismissed_triggers || {}
  const maybeLater = existing?.maybe_later_until || {}

  if (action === 'dismiss') {
    dismissed[triggerType] = true
    delete maybeLater[triggerType]
  } else if (action === 'maybe_later') {
    const until = new Date()
    until.setDate(until.getDate() + 3)
    maybeLater[triggerType] = until.toISOString()
  }

  const upsertPayload = {
    user_id: session.user.id,
    dismissed_triggers: dismissed,
    maybe_later_until: maybeLater,
    updated_at: new Date().toISOString(),
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase DB types omit feedback_trigger_preferences
  const { error: upsertError } = await (db.from('feedback_trigger_preferences') as any).upsert(
    upsertPayload,
    { onConflict: 'user_id' }
  )

  if (upsertError) {
    return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
