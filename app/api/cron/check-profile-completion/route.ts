import { NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/server-supabase'
import { sendTransactionalEmail } from '@/lib/email/transactional'
import { addDays } from 'date-fns'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Profile completion reminder cron.
 * Runs daily at 9am. Finds users who signed up 7 days ago with incomplete profiles,
 * sends a gentle reminder email, and marks profile_reminder_sent_at.
 * Note: Also handled by send-notifications cron; this route can be deprecated.
 */
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization')
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getServerSupabase()
    const now = new Date()
    const sevenDaysAgo = addDays(now, -7)

    // Users who: signed up 7 days ago, profile not completed, reminder not sent yet
    const { data: users, error } = await db
      .from('user_profiles')
      .select('id, email_address, name, preferred_name, created_at')
      .is('profile_completed_at', null)
      .is('profile_reminder_sent_at', null)
      .lte('created_at', sevenDaysAgo.toISOString())
      .limit(50)

    if (error) {
      console.error('[check-profile-completion] Query error:', error)
      throw error
    }

    const results: Array<{ userId: string; status: string; error?: string }> = []
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://wheeloffounders.com'

    type UserRow = { id: string; email_address?: string; preferred_name?: string; name?: string }
    for (const user of (users || []) as UserRow[]) {
      const email = user.email_address
      if (!email?.trim()) {
        results.push({ userId: user.id, status: 'skipped_no_email' })
        continue
      }

      const displayName = (user.preferred_name || user.name || 'founder').trim() || 'founder'

      try {
        const { ok, error: sendError } = await sendTransactionalEmail({
          to: email.trim(),
          toName: displayName,
          subject: 'Help Mrs. Deer get to know you better',
          html: `
<!DOCTYPE html>
<html>
<body style="font-family:sans-serif;background:#f3f4f6;padding:40px;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
    <div style="background:linear-gradient(135deg,#152b50 0%,#1a3565 100%);color:#fff;padding:24px;border-radius:12px 12px 0 0;text-align:center;">
      <h1 style="margin:0;color:#ef725c;">Wheel of Founders</h1>
    </div>
    <div style="padding:24px;">
      <p>Hi ${displayName},</p>
      <p>Mrs. Deer here 🦌</p>
      <p>I'd love to get to know you better so I can personalize your insights even more. A few quick details about your founder journey would help me understand:</p>
      <ul style="margin-bottom:20px;">
        <li>What you're struggling with</li>
        <li>Your founder stage and role</li>
        <li>How you like to destress</li>
        <li>Anything you'd like me to know</li>
      </ul>
      <p>It only takes 2 minutes, and it makes our time together so much richer.</p>
      <a href="${appUrl}/profile" style="display:inline-block;padding:12px 24px;background:#ef725c;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;margin:16px 0;">Complete Your Profile</a>
    </div>
  </div>
</body>
</html>
          `,
          text: `Hi ${displayName},\n\nMrs. Deer here 🦌\n\nI'd love to get to know you better so I can personalize your insights. A few quick details about your founder journey would help me understand what you're struggling with, your stage, and how you like to destress.\n\nIt only takes 2 minutes: ${appUrl}/profile`,
        })

        if (!ok) {
          results.push({ userId: user.id, status: 'failed', error: sendError })
          continue
        }

        await (db.from('user_profiles') as any).update({
          profile_reminder_sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq('id', user.id)

        results.push({ userId: user.id, status: 'reminder_sent' })
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error(`[check-profile-completion] Failed for user ${user.id}:`, msg)
        results.push({ userId: user.id, status: 'failed', error: msg })
      }
    }

    return NextResponse.json({
      success: true,
      processed: users?.length ?? 0,
      results,
    })
  } catch (error) {
    console.error('[check-profile-completion] Error:', error)
    return NextResponse.json(
      { error: 'Failed to process profile reminders' },
      { status: 500 }
    )
  }
}
