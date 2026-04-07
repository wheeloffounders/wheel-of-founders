import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/server-supabase'
import { sendEmailWithTracking } from '@/lib/email/sender'
import { renderEmailTemplate } from '@/lib/email/templates'
import * as Sentry from '@sentry/nextjs'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization')
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getServerSupabase()
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    // Users inactive for >= 7 days who haven't opted out of inactivity_reminders.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- table has JSONB field missing in generated types
    const { data: users, error } = await (db.from('user_profiles') as any)
      .select('id, email_address, preferred_name, name, last_active_at, email_preferences, login_count')
      .lte('last_active_at', sevenDaysAgo.toISOString())

    if (error) {
      console.error('[send-inactivity-reminders] Query error:', error)
      throw error
    }

    type UserRow = {
      id: string
      email_address?: string | null
      preferred_name?: string | null
      name?: string | null
      last_active_at?: string | null
      login_count?: number | null
      email_preferences?: {
        inactivity_reminders?: boolean
      } | null
    }

    const results: Array<{ userId: string; status: string; error?: string }> = []

    for (const u of (users || []) as UserRow[]) {
      const email = u.email_address?.trim()
      if (!email) {
        results.push({ userId: u.id, status: 'skipped_no_email' })
        continue
      }

      const prefs = u.email_preferences || {}
      if (prefs.inactivity_reminders === false) {
        results.push({ userId: u.id, status: 'skipped_opted_out' })
        continue
      }

      try {
        // Avoid re-sending within last 7 days.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- legacy email_logs schema typing mismatch
        const { data: recentLog } = await (db.from('email_logs') as any)
          .select('sent_at')
          .eq('user_id', u.id)
          .eq('type', 'inactivity_reminder_7d')
          .gte(
            'sent_at',
            new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
          )
          .maybeSingle()

        if (recentLog) {
          results.push({ userId: u.id, status: 'skipped_recent' })
          continue
        }

        const name =
          (u.preferred_name || u.name || email.split('@')[0]).trim() || 'Founder'

        const rendered = renderEmailTemplate('inactivity_reminder', {
          name,
          email,
          login_count: Math.max(0, Number(u.login_count ?? 0) || 0),
        })
        const sendResult = await sendEmailWithTracking({
          userId: u.id,
          emailType: 'inactivity_reminder',
          dateKey: new Date().toISOString().slice(0, 10),
          subject: rendered.subject,
          html: rendered.html,
          text: rendered.text,
          force: false,
        })

        if (!sendResult.sent) {
          Sentry.captureException(
            new Error(sendResult.reason || 'Inactivity reminder send failed'),
            {
              tags: {
                email_type: 'inactivity_reminder_7d',
                route: '/api/cron/send-inactivity-reminders',
              },
              extra: { userId: u.id },
            }
          )
          results.push({ userId: u.id, status: 'failed', error: sendResult.reason })
          continue
        }

        results.push({ userId: u.id, status: 'sent' })
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        Sentry.captureException(err, {
          tags: {
            email_type: 'inactivity_reminder_7d',
            route: '/api/cron/send-inactivity-reminders',
          },
          extra: { userId: u.id },
        })
        console.error('[send-inactivity-reminders] Error per user', u.id, msg)
        results.push({ userId: u.id, status: 'error', error: msg })
      }
    }

    return NextResponse.json({
      success: true,
      processed: users?.length ?? 0,
      results,
    })
  } catch (err) {
    console.error('[send-inactivity-reminders] Error', err)
    Sentry.captureException(err, {
      tags: {
        email_type: 'inactivity_reminder_7d',
        route: '/api/cron/send-inactivity-reminders',
      },
    })
    return NextResponse.json(
      { error: 'Failed to process inactivity reminders' },
      { status: 500 }
    )
  }
}

