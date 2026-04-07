import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'
import { ALL_RETENTION_EMAIL_TYPES, type RetentionEmailType } from '@/lib/email/triggers'
import { getUserEmailPreferencesV1 } from '@/lib/email/preferences-v1'
import { renderEmailTemplate } from '@/lib/email/templates'
import { buildPersonalizedEmailContext } from '@/lib/email/personalization'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function isAllowedType(v: string): v is RetentionEmailType {
  return (ALL_RETENTION_EMAIL_TYPES as string[]).includes(v)
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      userId?: string
      emailType?: string
      dateKey?: string
      data?: Record<string, unknown>
    }

    if (!body.userId || !body.emailType || !isAllowedType(body.emailType)) {
      return NextResponse.json({ error: 'userId and valid emailType are required' }, { status: 400 })
    }

    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization')
    const cronSecret = process.env.CRON_SECRET
    const isCron = !!cronSecret && authHeader === `Bearer ${cronSecret}`

    if (!isCron) {
      const session = await getServerSessionFromRequest(req)
      if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      const db = getServerSupabase()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- admin flags are custom columns
      const { data } = await (db.from('user_profiles') as any)
        .select('is_admin, admin_role')
        .eq('id', session.user.id)
        .maybeSingle()
      const admin = (data as { is_admin?: boolean; admin_role?: string } | null)
      if (!admin?.is_admin && admin?.admin_role !== 'super_admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const db = getServerSupabase()
    const userRes = await db.auth.admin.getUserById(body.userId)
    const user = userRes.data.user
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const prefs = await getUserEmailPreferencesV1(body.userId)
    const context = await buildPersonalizedEmailContext(body.userId)
    const rendered = renderEmailTemplate(
      body.emailType,
      {
        name: user.user_metadata?.full_name || user.user_metadata?.name || user.email,
        email: user.email,
        login_count: context.loginCount,
      },
      { ...context, ...(body.data || {}) }
    )

    const dateKey = body.dateKey || new Date().toISOString().slice(0, 10)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- email_logs projection
    const { data: existing } = await (db.from('email_logs') as any)
      .select('id')
      .eq('user_id', body.userId)
      .eq('email_type', body.emailType)
      .eq('date_key', dateKey)
      .maybeSingle()

    const frequencyAllowed = {
      daily: true,
      weekly_only: [
        'welcome',
        'weekly_insight',
        'monthly_insight',
        'quarterly_insight_first',
        'insights_bundle',
        'founder_archetype_full',
        'inactivity_reminder',
      ].includes(body.emailType),
      achievements_only: [
        'welcome',
        'weekly_insight',
        'monthly_insight',
        'quarterly_insight_first',
        'insights_bundle',
        'badge_earned',
        'streak_milestone',
        'feature_unlock',
        'founder_archetype_full',
        'inactivity_reminder',
      ].includes(body.emailType),
      none: ['welcome', 'inactivity_reminder'].includes(body.emailType),
    }[prefs.frequency]

    const reason =
      process.env.EMAIL_RETENTION_V1 !== 'true'
        ? 'feature_flag_off'
        : prefs.unsubscribedAt
          ? 'unsubscribed'
          : !frequencyAllowed
            ? 'frequency_blocked'
            : existing
              ? 'already_sent'
              : undefined

    return NextResponse.json({
      wouldSend: !reason,
      reason,
      userId: body.userId,
      emailType: body.emailType,
      dateKey,
      preferences: prefs,
      personalizationContext: context,
      preview: rendered,
    })
  } catch (err) {
    console.error('[email/dry-run] error', err)
    return NextResponse.json({ error: 'Failed to run email preview' }, { status: 500 })
  }
}

