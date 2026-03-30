import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'
import { ALL_RETENTION_EMAIL_TYPES, type RetentionEmailType } from '@/lib/email/triggers'
import { renderEmailTemplate } from '@/lib/email/templates'
import { buildPersonalizedEmailContext } from '@/lib/email/personalization'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const SPAM_TERMS = [/free/gi, /guarantee/gi, /click here/gi, /urgent/gi, /!!!/g]

function countSpamTerms(input: string): number {
  let n = 0
  for (const re of SPAM_TERMS) {
    n += (input.match(re) || []).length
  }
  return n
}

function isAllowedType(v: string): v is RetentionEmailType {
  return (ALL_RETENTION_EMAIL_TYPES as string[]).includes(v)
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSessionFromRequest(req)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db = getServerSupabase()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- admin flags are custom columns
    const { data: adminRow } = await (db.from('user_profiles') as any)
      .select('is_admin, admin_role')
      .eq('id', session.user.id)
      .maybeSingle()
    const admin = (adminRow as { is_admin?: boolean; admin_role?: string } | null) ?? null
    if (!admin?.is_admin && admin?.admin_role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = (await req.json().catch(() => ({}))) as { emailType?: string; userId?: string }
    if (!body.userId || !body.emailType || !isAllowedType(body.emailType)) {
      return NextResponse.json({ error: 'userId and valid emailType are required' }, { status: 400 })
    }

    const userRes = await db.auth.admin.getUserById(body.userId)
    const user = userRes.data.user
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const ctx = await buildPersonalizedEmailContext(body.userId)
    const rendered = renderEmailTemplate(
      body.emailType,
      { name: user.user_metadata?.full_name || user.user_metadata?.name || user.email, email: user.email },
      ctx as unknown as Record<string, unknown>
    )

    const spamTermCount = countSpamTerms(`${rendered.subject}\n${rendered.html}\n${rendered.text}`)
    const htmlLen = rendered.html.length || 1
    const textLen = rendered.text.length || 0
    const textToHtmlRatio = textLen / htmlLen
    const warnings: string[] = []
    if (!rendered.text.trim()) warnings.push('Missing plain-text fallback')
    if (!/display:none/i.test(rendered.html)) warnings.push('Missing hidden preheader')
    if (!/<table/i.test(rendered.html)) warnings.push('Missing table-based structure for email clients')
    if (textToHtmlRatio < 0.1) warnings.push('Low text-to-HTML ratio')
    if (spamTermCount > 0) warnings.push(`Detected ${spamTermCount} spam-trigger term matches`)

    const spamScore = Math.max(0, 100 - warnings.length * 15 - spamTermCount * 8 - (textToHtmlRatio < 0.1 ? 10 : 0))

    return NextResponse.json({
      success: true,
      emailType: body.emailType,
      userId: body.userId,
      spamScore,
      warnings,
      metrics: {
        htmlLength: htmlLen,
        textLength: textLen,
        textToHtmlRatio: Number(textToHtmlRatio.toFixed(3)),
        spamTermCount,
      },
    })
  } catch (err) {
    console.error('[email/spam-test] error', err)
    return NextResponse.json({ error: 'Failed to run spam test' }, { status: 500 })
  }
}

