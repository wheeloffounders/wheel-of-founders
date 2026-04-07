import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/server-supabase'
import { completeAbTest, getAbTestResults } from '@/lib/email/ab-testing'
import { authorizeAdminApiRequest } from '@/lib/admin'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: NextRequest, ctx: { params: Promise<{ testId: string }> }) {
  try {
    if (!(await authorizeAdminApiRequest(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { testId } = await ctx.params
    const db = getServerSupabase()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- table not in generated types yet
    const { data } = await (db.from('email_ab_tests') as any)
      .select('*')
      .eq('id', testId)
      .maybeSingle()
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const results = await getAbTestResults(testId)
    return NextResponse.json({ test: data, results })
  } catch (err) {
    console.error('[admin/email-tests/:id] GET error', err)
    return NextResponse.json({ error: 'Failed to load test' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ testId: string }> }) {
  try {
    if (!(await authorizeAdminApiRequest(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { testId } = await ctx.params
    const body = (await req.json().catch(() => ({}))) as {
      action?: 'pause' | 'resume' | 'complete'
      winnerVariant?: 'A' | 'B'
    }
    const db = getServerSupabase()

    if (body.action === 'complete') {
      const winner = body.winnerVariant === 'B' ? 'B' : 'A'
      await completeAbTest(testId, winner)
    } else if (body.action === 'pause' || body.action === 'resume') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- table not in generated types yet
      await (db.from('email_ab_tests') as any)
        .update({ status: body.action === 'pause' ? 'paused' : 'active' })
        .eq('id', testId)
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- table not in generated types yet
    const { data } = await (db.from('email_ab_tests') as any)
      .select('*')
      .eq('id', testId)
      .maybeSingle()
    const results = await getAbTestResults(testId)
    return NextResponse.json({ test: data, results })
  } catch (err) {
    console.error('[admin/email-tests/:id] PATCH error', err)
    return NextResponse.json({ error: 'Failed to update test' }, { status: 500 })
  }
}

