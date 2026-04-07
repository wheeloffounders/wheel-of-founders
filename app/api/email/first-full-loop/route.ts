import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'
import { renderEmailTemplate } from '@/lib/email/templates'
import { sendEmailWithTracking } from '@/lib/email/sender'
import { buildPersonalizedEmailContext } from '@/lib/email/personalization'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSessionFromRequest(req)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = (await req.json().catch(() => ({}))) as { reviewDate?: string }
    const reviewDate = body.reviewDate
    if (!reviewDate || !/^\d{4}-\d{2}-\d{2}$/.test(reviewDate)) {
      return NextResponse.json({ error: 'reviewDate is required (YYYY-MM-DD)' }, { status: 400 })
    }

    const userId = session.user.id
    const db = getServerSupabase()

    const [tasksRes, eveningRes] = await Promise.all([
      db.from('morning_tasks').select('completed').eq('user_id', userId).eq('plan_date', reviewDate),
      db.from('evening_reviews').select('id').eq('user_id', userId).eq('review_date', reviewDate).limit(1),
    ])
    const tasks = (tasksRes.data ?? []) as Array<{ completed?: boolean | null }>
    const morningCompleted = tasks.length > 0 && tasks.every((t) => t.completed === true)
    const eveningCompleted = (eveningRes.data ?? []).length > 0
    if (!morningCompleted || !eveningCompleted) {
      return NextResponse.json({ sent: false, reason: 'condition_not_met' })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- email_logs projection
    const { data: priorFullLoop } = await (db.from('email_logs') as any)
      .select('id')
      .eq('user_id', userId)
      .eq('email_type', 'first_full_loop')
      .limit(1)
      .maybeSingle()
    if (priorFullLoop) {
      return NextResponse.json({ sent: false, reason: 'already_sent' })
    }

    const ctx = await buildPersonalizedEmailContext(userId)
    const rendered = renderEmailTemplate('first_full_loop', {
      name: session.user.email?.split('@')[0],
      email: session.user.email,
      login_count: ctx.loginCount,
    })
    const result = await sendEmailWithTracking({
      userId,
      emailType: 'first_full_loop',
      dateKey: reviewDate,
      ...rendered,
    })
    return NextResponse.json(result)
  } catch (err) {
    console.error('[email/first-full-loop] error', err)
    return NextResponse.json({ error: 'Failed to send first full loop email' }, { status: 500 })
  }
}

