import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const DEFAULT_PREFS = {
  onboarding: true,
  weekly_digest: true,
  inactivity_reminders: true,
  nurture_emails: true,
  marketing_updates: false,
}

type EmailPrefs = typeof DEFAULT_PREFS

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSessionFromRequest(req)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getServerSupabase()
    const { data } = await (db.from('user_profiles') as any)
      .select('email_preferences')
      .eq('id', session.user.id)
      .maybeSingle()

    const raw = (data as { email_preferences?: Partial<EmailPrefs> } | null)?.email_preferences || {}
    const prefs: EmailPrefs = {
      onboarding: raw.onboarding ?? DEFAULT_PREFS.onboarding,
      weekly_digest: raw.weekly_digest ?? DEFAULT_PREFS.weekly_digest,
      inactivity_reminders: raw.inactivity_reminders ?? DEFAULT_PREFS.inactivity_reminders,
      nurture_emails: raw.nurture_emails ?? DEFAULT_PREFS.nurture_emails,
      marketing_updates: raw.marketing_updates ?? DEFAULT_PREFS.marketing_updates,
    }

    return NextResponse.json(prefs)
  } catch (err) {
    console.error('[email-preferences] GET error', err)
    return NextResponse.json({ error: 'Failed to load email preferences' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSessionFromRequest(req)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await req.json().catch(() => ({}))) as Partial<EmailPrefs>

    const sanitized: EmailPrefs = {
      onboarding: body.onboarding ?? DEFAULT_PREFS.onboarding,
      weekly_digest: body.weekly_digest ?? DEFAULT_PREFS.weekly_digest,
      inactivity_reminders: body.inactivity_reminders ?? DEFAULT_PREFS.inactivity_reminders,
      nurture_emails: body.nurture_emails ?? DEFAULT_PREFS.nurture_emails,
      marketing_updates: body.marketing_updates ?? DEFAULT_PREFS.marketing_updates,
    }

    const db = getServerSupabase()
    const { error } = await (db.from('user_profiles') as any)
      .update({
        email_preferences: sanitized,
        updated_at: new Date().toISOString(),
      })
      .eq('id', session.user.id)

    if (error) {
      console.error('[email-preferences] POST error', error)
      return NextResponse.json({ error: 'Failed to save email preferences' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[email-preferences] POST error', err)
    return NextResponse.json({ error: 'Failed to save email preferences' }, { status: 500 })
  }
}

