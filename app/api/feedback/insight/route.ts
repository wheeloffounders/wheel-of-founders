import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { insightId, insightType, feedback, feedbackText } = body

    if (!insightId || !insightType || !feedback) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!['helpful', 'not-helpful'].includes(feedback)) {
      return NextResponse.json({ error: 'Invalid feedback value' }, { status: 400 })
    }

    const db = getServerSupabase()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- insight_feedback table not in generated types
    const { error } = await (db.from('insight_feedback') as any).insert({
      user_id: session.user.id,
      insight_id: insightId,
      insight_type: insightType,
      feedback,
      feedback_text: feedbackText || null,
    })

    if (error) {
      console.error('[Feedback/insight] DB error:', error)
      return NextResponse.json({ error: 'Failed to save feedback' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Feedback/insight] Error:', error)
    return NextResponse.json(
      { error: 'Failed to save feedback' },
      { status: 500 }
    )
  }
}
