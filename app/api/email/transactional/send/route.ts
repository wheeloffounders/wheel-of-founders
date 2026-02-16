import { NextRequest, NextResponse } from 'next/server'
import { getUserSession } from '@/lib/auth'
import { sendTransactionalEmail } from '@/lib/email/transactional'
import { getServerSupabase } from '@/lib/server-supabase'

const VALID_TEMPLATES = ['welcome', 'export_ready', 'weekly_digest'] as const

/**
 * POST /api/email/transactional/send
 * Send transactional email. Protected by CRON_SECRET (internal) or session (user must own email).
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`

    let email: string
    let template: (typeof VALID_TEMPLATES)[number]
    let variables: Record<string, unknown>

    const body = await req.json().catch(() => ({}))
    template = body.template
    email = body.email
    variables = body.variables ?? {}

    if (!template || !VALID_TEMPLATES.includes(template)) {
      return NextResponse.json(
        { error: 'Invalid template. Use: welcome, export_ready, weekly_digest' },
        { status: 400 }
      )
    }

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'email is required' }, { status: 400 })
    }

    if (isCron) {
      // Internal/cron call - allowed
    } else {
      // User-initiated: must be authenticated and email must match user
      const session = await getUserSession()
      if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      const db = getServerSupabase()
      const { data: profile } = await db
        .from('user_profiles')
        .select('email_address')
        .eq('id', session.user.id)
        .maybeSingle()
      const userEmail = profile?.email_address || session.user.email
      if (!userEmail || email.toLowerCase() !== userEmail.toLowerCase()) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const { subject, html, text } = buildTemplate(template, email, variables)
    const result = await sendTransactionalEmail({
      to: email,
      subject,
      html,
      text,
    })

    if (!result.ok) {
      console.error('[api/email/transactional]', result.error)
      return NextResponse.json(
        { error: result.error || 'Failed to send' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      messageId: result.messageId,
    })
  } catch (e) {
    console.error('[api/email/transactional]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal error' },
      { status: 500 }
    )
  }
}

function buildTemplate(
  template: (typeof VALID_TEMPLATES)[number],
  email: string,
  vars: Record<string, unknown>
): { subject: string; html: string; text: string } {
  const name = (vars.name as string) || email.split('@')[0]
  const baseCss = `
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f3f4f6; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .card { background: #fff; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #152b50 0%, #1a3565 100%); color: #ef725c; padding: 24px; border-radius: 12px 12px 0 0; text-align: center; }
    h1 { margin: 0; font-size: 24px; }
    .btn { display: inline-block; padding: 12px 24px; background: #ef725c; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600; margin-top: 16px; }
    p { color: #374151; line-height: 1.6; margin: 0 0 16px 0; }
  `

  switch (template) {
    case 'welcome': {
      const subject = 'Welcome to Wheel of Founders!'
      const html = `
<!DOCTYPE html><html><head><meta charset="utf-8"><style>${baseCss}</style></head><body>
<div class="container"><div class="card"><div class="header"><h1>Wheel of Founders</h1></div>
<div style="padding: 24px;">
<p>Hi ${name},</p>
<p>Welcome! You're all set. Start your day with the Morning Power List, capture decisions, and end with an Evening Review.</p>
<p>Mrs. Deer will share insights as you build your pattern.</p>
<a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://wheeloffounders.com'}" class="btn">Open App</a>
</div></div></div></body></html>`
      const text = `Hi ${name}, Welcome to Wheel of Founders! Start your day with the Morning Power List, capture decisions, and end with an Evening Review. Open: ${process.env.NEXT_PUBLIC_APP_URL || 'https://wheeloffounders.com'}`
      return { subject, html, text }
    }

    case 'export_ready': {
      const downloadUrl = (vars.downloadUrl as string) || ''
      const subject = 'Your export is ready'
      const html = `
<!DOCTYPE html><html><head><meta charset="utf-8"><style>${baseCss}</style></head><body>
<div class="container"><div class="card"><div class="header"><h1>Export Ready</h1></div>
<div style="padding: 24px;">
<p>Hi ${name},</p>
<p>Your data export is ready.</p>
${downloadUrl ? `<a href="${downloadUrl}" class="btn">Download Export</a>` : '<p>Open the app to download.</p>'}
<p style="font-size: 12px; color: #6b7280;">This link expires in 24 hours.</p>
</div></div></div></body></html>`
      const text = `Hi ${name}, Your export is ready. ${downloadUrl ? `Download: ${downloadUrl}` : 'Open the app to download.'}`
      return { subject, html, text }
    }

    case 'weekly_digest': {
      const insight = (vars.insight as string) || ''
      const subject = 'Your weekly summary'
      const html = `
<!DOCTYPE html><html><head><meta charset="utf-8"><style>${baseCss}</style></head><body>
<div class="container"><div class="card"><div class="header"><h1>Weekly Summary</h1></div>
<div style="padding: 24px;">
<p>Hi ${name},</p>
<p>Here's your weekly reflection.</p>
${insight ? `<p style="background: #fef3f2; padding: 16px; border-left: 4px solid #ef725c; border-radius: 8px;">${insight}</p>` : ''}
<a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://wheeloffounders.com'}/weekly" class="btn">View Weekly</a>
</div></div></div></body></html>`
      const text = `Hi ${name}, Your weekly summary is ready. ${insight ? insight : ''} View: ${process.env.NEXT_PUBLIC_APP_URL || 'https://wheeloffounders.com'}/weekly`
      return { subject, html, text }
    }

    default:
      throw new Error('Unknown template')
  }
}
