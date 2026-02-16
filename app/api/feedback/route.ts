import { NextRequest, NextResponse } from 'next/server'
import { getUserSession } from '@/lib/auth'
import { getServerSupabase } from '@/lib/server-supabase'

export type FeedbackType = 'bug' | 'long_form' | 'popup' | 'mrs_deer'

export async function POST(req: NextRequest) {
  try {
    const session = await getUserSession()
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await req.json()

    const feedbackType = body.feedbackType as FeedbackType
    if (!['bug', 'long_form', 'popup', 'mrs_deer'].includes(feedbackType)) {
      return NextResponse.json({ error: 'Invalid feedback type' }, { status: 400 })
    }

    const description = body.description?.trim() || ''
    if (!description && feedbackType !== 'long_form') {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 })
    }

    const insertData: Record<string, unknown> = {
      user_id: session.user.id,
      feedback_type: feedbackType,
      screen_location: body.screenLocation || null,
      description: description || body.otherThoughts || 'No description',
      email: body.email || null,
      screenshot_url: body.screenshotUrl || null,
      context_prefilled: body.contextPrefilled || null,
    }

    if (feedbackType === 'long_form') {
      insertData.whats_working = body.whatsWorking || null
      insertData.whats_confusing = body.whatsConfusing || null
      insertData.features_request = body.featuresRequest || null
      insertData.nps_score = body.npsScore || null
      insertData.other_thoughts = body.otherThoughts || null
    }

    const db = getServerSupabase()
    const { data, error } = await db.from('feedback').insert(insertData).select('id').single()

    if (error) {
      console.error('[Feedback API] Insert error:', error)
      return NextResponse.json({ error: 'Failed to save feedback' }, { status: 500 })
    }

    return NextResponse.json({ success: true, id: data?.id })
  } catch (err) {
    console.error('[Feedback API] Error:', err)
    return NextResponse.json({ error: 'Failed to save feedback' }, { status: 500 })
  }
}
