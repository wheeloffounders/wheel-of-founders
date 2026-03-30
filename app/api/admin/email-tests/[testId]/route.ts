import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/server-supabase'
import { completeAbTest, getAbTestResults } from '@/lib/email/ab-testing'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const FOUNDER_EMAIL = 'wttmotivation@gmail.com'

async function assertAdmin(req: NextRequest): Promise<boolean> {
  const authHeader = req.headers.get('authorization')
  const adminSecret = process.env.ADMIN_SECRET
  if (adminSecret && authHeader === `Bearer ${adminSecret}`) return true

  const { createServerClient } = await import('@supabase/ssr')
  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (c: { name: string; value: string; options?: object }[]) =>
          c.forEach(({ name, value, options }) => cookieStore.set(name, value, options as object)),
      },
    }
  )
  const { data: { session } } = await authClient.auth.getSession()
  return session?.user?.email === FOUNDER_EMAIL
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ testId: string }> }) {
  try {
    if (!(await assertAdmin(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
    if (!(await assertAdmin(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

