import { NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'
import { sendTransactionalEmail } from '@/lib/email/transactional'

export async function POST(req: Request) {
  try {
    const session = await getServerSessionFromRequest(req)

    if (!session) {
      return NextResponse.json(
        { error: 'Please log in to submit feedback' },
        { status: 401 }
      )
    }

    const body = await req.json()

    let description = ''
    let feedbackType: 'bug' | 'long_form' | 'popup' | 'mrs_deer' = 'long_form'
    const screenLocation = body.screenLocation || body.page || '/feedback'

    // Handle different feedback formats
    if (body.feedbackType === 'popup') {
      feedbackType = 'popup'
      description = body.description || 'Quick feedback'
    } else if (body.feedbackType === 'long_form') {
      feedbackType = 'long_form'
      const parts = []
      if (body.whatsWorking) parts.push(`👍 Working: ${body.whatsWorking}`)
      if (body.whatsConfusing) parts.push(`❓ Confusing: ${body.whatsConfusing}`)
      if (body.featuresRequest) parts.push(`💡 Feature request: ${body.featuresRequest}`)
      if (body.npsScore) parts.push(`📊 NPS: ${body.npsScore}/5`)
      if (body.otherThoughts) parts.push(`💬 Other: ${body.otherThoughts}`)
      if (body.email) parts.push(`📧 Contact: ${body.email}`)
      description = parts.join('\n\n') || 'Long form feedback'
    } else {
      description = body.feedback || body.description || 'Feedback'
    }

    if (!description.trim()) {
      return NextResponse.json(
        { error: 'Feedback message is required' },
        { status: 400 }
      )
    }

    const db = getServerSupabase()

    // Insert using schema columns: feedback_type, description, screen_location, email, long_form fields
    const { data: feedback, error: dbError } = await (db.from('feedback') as any)
      .insert({
        user_id: session.user.id,
        feedback_type: feedbackType,
        description: description.trim(),
        screen_location: screenLocation,
        email: body.email || session.user.email || null,
        whats_working: body.whatsWorking?.trim() || null,
        whats_confusing: body.whatsConfusing?.trim() || null,
        features_request: body.featuresRequest?.trim() || null,
        nps_score: body.npsScore ?? null,
        other_thoughts: body.otherThoughts?.trim() || null,
      })
      .select()
      .single()

    if (dbError) {
      console.error('[Feedback] DB Error:', dbError)
      return NextResponse.json(
        { error: 'Failed to save feedback' },
        { status: 500 }
      )
    }

    // Send email notification (non-blocking)
    try {
      await sendTransactionalEmail({
        to: 'wttmotivation@gmail.com',
        subject: `New Feedback: ${feedbackType}`,
        html: `
          <h2>New Feedback Received</h2>
          <p><strong>From:</strong> ${body.email || session.user.email || 'No email'}</p>
          <p><strong>Type:</strong> ${feedbackType}</p>
          <p><strong>Message:</strong></p>
          <p>${description.replace(/\n/g, '<br>')}</p>
          <hr>
          <p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://wheeloffounders.com'}/admin/feedback">View in Admin</a></p>
        `,
        text: `New Feedback: ${feedbackType}\nFrom: ${body.email || session.user.email || 'No email'}\n\n${description}`,
      })
    } catch (emailError) {
      console.error('[Feedback] Email notification failed (non-blocking):', emailError)
    }

    return NextResponse.json({
      success: true,
      message: 'Feedback sent successfully! Thank you.',
    })
  } catch (error) {
    console.error('[Feedback] Error:', error)
    return NextResponse.json(
      { error: 'Failed to save feedback' },
      { status: 500 }
    )
  }
}
