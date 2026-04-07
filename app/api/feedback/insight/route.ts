import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'
import { INSIGHT_FEEDBACK_TONE_ADJUSTMENT, isInsightFeedbackValue } from '@/lib/insight-feedback'

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

    if (!isInsightFeedbackValue(feedback)) {
      return NextResponse.json({ error: 'Invalid feedback value' }, { status: 400 })
    }

    const textTrim = typeof feedbackText === 'string' ? feedbackText.trim() : ''
    if (feedback === INSIGHT_FEEDBACK_TONE_ADJUSTMENT) {
      if (textTrim.length < 2) {
        return NextResponse.json({ error: 'Tone adjustment requires feedback text' }, { status: 400 })
      }
      if (textTrim.length > 2000) {
        return NextResponse.json({ error: 'Feedback text too long' }, { status: 400 })
      }
    }

    const db = getServerSupabase()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- insight_feedback table not in generated types
    const { error } = await (db.from('insight_feedback') as any).insert({
      user_id: session.user.id,
      insight_id: insightId,
      insight_type: insightType,
      feedback,
      feedback_text: feedback === 'tone-adjustment' ? textTrim : feedbackText || null,
    })

    if (error) {
      console.error('[Feedback/insight] DB error:', error)
      return NextResponse.json({ error: 'Failed to save feedback' }, { status: 500 })
    }

    if (feedback === INSIGHT_FEEDBACK_TONE_ADJUSTMENT && textTrim) {
      const { data: row, error: fetchErr } = await (db.from('user_profiles') as any)
        .select('coach_preferences')
        .eq('id', session.user.id)
        .maybeSingle()

      if (!fetchErr) {
        const existing =
          row && typeof row === 'object' && row.coach_preferences && typeof row.coach_preferences === 'object'
            ? { ...(row.coach_preferences as Record<string, unknown>) }
            : {}

        const noteStored = textTrim.slice(0, 1200)
        const merged = {
          ...existing,
          tone_calibration_note: noteStored,
          tone_calibration_note_at: new Date().toISOString(),
          tone_calibration_insight_id: insightId,
          tone_calibration_insight_type: insightType,
        }

        const { error: updErr } = await (db.from('user_profiles') as any)
          .update({
            coach_preferences: merged,
            updated_at: new Date().toISOString(),
          })
          .eq('id', session.user.id)

        if (updErr) {
          console.error('[Feedback/insight] coach_preferences update', updErr)
        }
      }
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
