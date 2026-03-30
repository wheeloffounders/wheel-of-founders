import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { sendTransactionalEmail } from '@/lib/email/transactional'

export const dynamic = 'force-dynamic'

const MAX_HTML_CHARS = 2_000_000
const MAX_SUBJECT_CHARS = 500

function looksLikeEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
}

function plainFromHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 })
  }

  const session = await getServerSessionFromRequest(req)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: {
    subject?: string
    fullHtml?: string
    text?: string
    defaultTo?: string
    toOverride?: string
    emailType?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const subject =
    typeof body.subject === 'string' ? body.subject.trim().slice(0, MAX_SUBJECT_CHARS) : ''
  const fullHtml = typeof body.fullHtml === 'string' ? body.fullHtml : ''
  if (!subject) {
    return NextResponse.json({ error: 'subject is required' }, { status: 400 })
  }
  if (!fullHtml || fullHtml.length > MAX_HTML_CHARS) {
    return NextResponse.json({ error: 'fullHtml missing or too large' }, { status: 400 })
  }

  const override =
    typeof body.toOverride === 'string' && body.toOverride.trim() && looksLikeEmail(body.toOverride.trim())
      ? body.toOverride.trim()
      : null
  const fallback =
    typeof body.defaultTo === 'string' && body.defaultTo.trim() && looksLikeEmail(body.defaultTo.trim())
      ? body.defaultTo.trim()
      : null
  const to = override ?? fallback
  if (!to) {
    return NextResponse.json({ error: 'No valid recipient (defaultTo or toOverride)' }, { status: 400 })
  }

  const text =
    typeof body.text === 'string' && body.text.trim() ? body.text.trim() : plainFromHtml(fullHtml)

  const emailType = typeof body.emailType === 'string' ? body.emailType : 'unknown'

  console.log('[send-test-email]', {
    userId: session.user.id,
    emailType,
    to,
    usedOverride: Boolean(override),
    subjectPreview: subject.slice(0, 80),
  })

  const sendRes = await sendTransactionalEmail({
    to,
    subject,
    html: fullHtml,
    text,
  })

  if (!sendRes.ok) {
    return NextResponse.json(
      { success: false, error: sendRes.error || 'Send failed' },
      { status: 502 }
    )
  }

  return NextResponse.json({
    success: true,
    to,
    messageId: sendRes.messageId,
  })
}
