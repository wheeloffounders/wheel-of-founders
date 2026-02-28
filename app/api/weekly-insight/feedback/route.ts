import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/** POST: Store feedback on weekly insight */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSessionFromRequest(req)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { weekStart, feedbackType, feedbackText } = body as {
      weekStart: string
      feedbackType: 'helpful' | 'not_quite_right' | 'custom'
      feedbackText?: string
    }

    if (!weekStart || !feedbackType) {
      return NextResponse.json(
        { error: 'weekStart and feedbackType required' },
        { status: 400 }
      )
    }

    if (!['helpful', 'not_quite_right', 'custom'].includes(feedbackType)) {
      return NextResponse.json({ error: 'Invalid feedbackType' }, { status: 400 })
    }

    if (feedbackType === 'custom' && !feedbackText?.trim()) {
      return NextResponse.json(
        { error: 'feedbackText required for custom feedback' },
        { status: 400 }
      )
    }

    const db = getServerSupabase()
    const { error } = await (db.from('weekly_insight_feedback') as any).insert({
      user_id: session.user.id,
      week_start: weekStart,
      feedback_type: feedbackType,
      feedback_text: feedbackText?.trim() || null,
    })

    if (error) {
      console.error('[weekly-insight-feedback] Insert failed:', error)
      return NextResponse.json({ error: 'Failed to save feedback' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[weekly-insight-feedback]', err)
    return NextResponse.json({ error: 'Failed to save feedback' }, { status: 500 })
  }
}
