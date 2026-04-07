import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/server-supabase'
import { getAbTestResults } from '@/lib/email/ab-testing'
import { authorizeAdminApiRequest } from '@/lib/admin'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: NextRequest) {
  try {
    if (!(await authorizeAdminApiRequest(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const db = getServerSupabase()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- table not in generated types yet
    const { data } = await (db.from('email_ab_tests') as any)
      .select('*')
      .order('created_at', { ascending: false })

    const tests = (data || []) as Array<{ id: string }>
    const withResults = await Promise.all(
      tests.map(async (t) => ({
        ...t,
        results: await getAbTestResults(t.id),
      }))
    )
    return NextResponse.json({ tests: withResults })
  } catch (err) {
    console.error('[admin/email-tests] GET error', err)
    return NextResponse.json({ error: 'Failed to load email tests' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!(await authorizeAdminApiRequest(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = (await req.json().catch(() => ({}))) as {
      name?: string
      email_type?: string
      variant_a_subject?: string
      variant_b_subject?: string
      variant_a_content?: string
      variant_b_content?: string
    }
    if (!body.name || !body.email_type || !body.variant_a_subject || !body.variant_b_subject) {
      return NextResponse.json({ error: 'name, email_type, variant_a_subject, variant_b_subject are required' }, { status: 400 })
    }
    const db = getServerSupabase()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- table not in generated types yet
    const { data, error } = await (db.from('email_ab_tests') as any)
      .insert({
        name: body.name,
        email_type: body.email_type,
        variant_a_subject: body.variant_a_subject,
        variant_b_subject: body.variant_b_subject,
        variant_a_content: body.variant_a_content || null,
        variant_b_content: body.variant_b_content || null,
        status: 'active',
      })
      .select('*')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ test: data })
  } catch (err) {
    console.error('[admin/email-tests] POST error', err)
    return NextResponse.json({ error: 'Failed to create test' }, { status: 500 })
  }
}

