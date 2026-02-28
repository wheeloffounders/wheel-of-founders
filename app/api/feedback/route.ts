import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getServerSessionFromRequest } from '@/lib/server-auth'

export async function POST(req: Request) {
  console.log('[feedback] API called')
  console.log('[feedback] Auth header:', req.headers.get('authorization') ? '(present)' : '(absent)')
  const cookieHeader = req.headers.get('cookie')
  console.log('[feedback] Cookies:', cookieHeader ? `present (${cookieHeader.length} chars)` : '(none)')

  try {
    const session = await getServerSessionFromRequest(req)
    console.log('[feedback] Session result:', session ? `found user ${session.user.id}` : 'No session')

    if (!session) {
      console.log('[feedback] Unauthorized - no session from cookies or Bearer token')
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const body = await req.json()
    console.log('🔍 Received feedback body:', body)

    let feedbackText = ''
    let pageUrl = body.screenLocation || body.page || '/feedback'

    // Handle different feedback formats
    if (body.feedbackType === 'popup') {
      // From FeedbackPopUp.tsx
      feedbackText = body.description || 'Quick feedback'
    } else if (body.feedbackType === 'long_form') {
      // From /feedback page
      const parts = []
      if (body.whatsWorking) parts.push(`👍 Working: ${body.whatsWorking}`)
      if (body.whatsConfusing) parts.push(`❓ Confusing: ${body.whatsConfusing}`)
      if (body.featuresRequest) parts.push(`💡 Feature request: ${body.featuresRequest}`)
      if (body.npsScore) parts.push(`📊 NPS: ${body.npsScore}/5`)
      if (body.otherThoughts) parts.push(`💬 Other: ${body.otherThoughts}`)
      if (body.email) parts.push(`📧 Contact: ${body.email}`)
      
      feedbackText = parts.join('\n\n') || 'Long form feedback'
    } else {
      // Simple format from other components
      feedbackText = body.feedback || body.description || 'Feedback'
      pageUrl = body.page || pageUrl
    }

    console.log('[feedback] Saving:', { feedbackText: feedbackText.slice(0, 50), pageUrl, userId: session.user.id })

    const { error } = await supabase
      .from('feedback')
      .insert({
        user_id: session.user.id,
        feedback_text: feedbackText,
        page_url: pageUrl
      })

    if (error) {
      console.error('[feedback] Supabase insert error:', error)
      throw error
    }

    console.log('[feedback] Saved successfully')
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[feedback] Error:', error)
    return NextResponse.json(
      { error: 'Failed to save feedback' },
      { status: 500 }
    )
  }
}
