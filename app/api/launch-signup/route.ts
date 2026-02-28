import { NextRequest, NextResponse } from 'next/server'
import { addOrUpdateSubscriber } from '@/lib/mailerlite'

/**
 * Launch notification signup - adds email to MailerLite "Launch Notifications" group.
 * Set MAILERLITE_GROUP_LAUNCH in env, or falls back to MAILERLITE_GROUP_ACTIVE.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const email = typeof body?.email === 'string' ? body.email.trim() : null

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
    }

    const groupId = process.env.MAILERLITE_GROUP_LAUNCH || process.env.MAILERLITE_GROUP_ACTIVE
    if (!groupId) {
      console.warn('MAILERLITE_GROUP_LAUNCH and MAILERLITE_GROUP_ACTIVE not set')
      return NextResponse.json({ success: true, message: "We'll email you on launch day!" })
    }

    await addOrUpdateSubscriber(
      {
        email,
        fields: {
          launch_signup_date: new Date().toISOString().split('T')[0],
        },
      },
      [groupId]
    )

    return NextResponse.json({ success: true, message: "We'll email you on launch day!" })
  } catch (error) {
    console.error('Launch signup error:', error)
    return NextResponse.json({ error: 'Signup failed. Please try again.' }, { status: 500 })
  }
}
