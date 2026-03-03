import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'
import { sendTransactionalEmail } from '@/lib/email/transactional'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://wheeloffounders.com'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { email } = await request.json()

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    const db = getServerSupabase()

    // Check if user already has an active duo
    const { data: existingActive } = await db
      .from('duo_relationships')
      .select('id, status')
      .eq('primary_user_id', session.user.id)
      .in('status', ['pending', 'active'])
      .maybeSingle()

    if (existingActive) {
      return NextResponse.json(
        { error: 'You already have a pending or active duo invitation' },
        { status: 400 }
      )
    }

    // Check if trying to invite themselves
    if (email.toLowerCase() === (session.user.email || '').toLowerCase()) {
      return NextResponse.json({ error: 'You cannot invite yourself' }, { status: 400 })
    }

    // Create invite record (secondary_user_id set when they accept)
    const { data: invite, error } = await (db.from('duo_relationships') as any)
      .insert({
        primary_user_id: session.user.id,
        secondary_user_id: null,
        invited_email: email.toLowerCase(),
        status: 'pending',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single()

    if (error) throw error

    // Get primary user's name for email
    const { data: primaryProfile } = await db
      .from('user_profiles')
      .select('name, preferred_name')
      .eq('id', session.user.id)
      .maybeSingle()

    const primaryName =
      (primaryProfile as { preferred_name?: string; name?: string } | null)?.preferred_name ||
      (primaryProfile as { preferred_name?: string; name?: string } | null)?.name ||
      session.user.email?.split('@')[0] ||
      'A founder'

    // Send invite email
    const result = await sendTransactionalEmail({
      to: email,
      subject: `${primaryName} invited you to join Wheel of Founders Duo`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family:sans-serif;background:#f3f4f6;padding:40px;">
          <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
            <div style="background:linear-gradient(135deg,#152b50 0%,#1a3565 100%);color:#ef725c;padding:24px;border-radius:12px 12px 0 0;text-align:center;">
              <h1 style="margin:0;">Wheel of Founders</h1>
            </div>
            <div style="padding:24px;">
              <h2>You're invited to join Duo! 🦌</h2>
              <p><strong>${primaryName}</strong> has invited you to share their Wheel of Founders Duo plan.</p>
              
              <div style="background:#f8f4f0;padding:16px;border-radius:8px;margin:24px 0;">
                <h3 style="margin:0 0 12px 0;">With Duo, you both get:</h3>
                <ul style="margin:0;padding-left:20px;">
                  <li>✨ All Pro features</li>
                  <li>🔒 Separate, private accounts</li>
                  <li>💰 Single bill (they're the primary)</li>
                  <li>📊 Your own insights and history</li>
                </ul>
              </div>

              <a href="${APP_URL}/duo/accept?invite=${invite.id}" 
                 style="display:inline-block;padding:12px 24px;background:#ef725c;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;margin:16px 0;">
                Accept Invitation
              </a>

              <p style="color:#6b7280;font-size:14px;margin-top:24px;">
                This invitation will expire in 7 days. If you don't have an account yet, you'll create one when you accept.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    })

    if (!result.ok) {
      console.error('[Duo Invite] Email send failed:', result.error)
      // Rollback: delete the invite
      await db.from('duo_relationships').delete().eq('id', invite.id)
      return NextResponse.json(
        { error: 'Failed to send invite email' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, inviteId: invite.id })
  } catch (error) {
    console.error('[Duo Invite] Error:', error)
    return NextResponse.json({ error: 'Failed to send invite' }, { status: 500 })
  }
}
