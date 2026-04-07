import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { getServerSupabase } from '@/lib/server-supabase'
import { adminSupabase } from '@/lib/supabase/admin'
import { buildFounderJourneyCommandCenter } from '@/lib/admin/tracking'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const FOUNDER_EMAIL = 'wttmotivation@gmail.com'

async function isAuthorizedAdmin(req: NextRequest): Promise<boolean> {
  const authHeader = req.headers.get('authorization')
  const adminSecret = process.env.ADMIN_SECRET
  if (adminSecret && authHeader === `Bearer ${adminSecret}`) return true

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
  const {
    data: { user },
  } = await authClient.auth.getUser()
  if (!user?.id) return false

  const db = getServerSupabase()
  const { data: profile } = await db.from('user_profiles').select('is_admin').eq('id', user.id).maybeSingle()

  const row = profile as { is_admin?: boolean | null } | null
  if (row?.is_admin) return true

  return user.email === FOUNDER_EMAIL
}

export async function GET(req: NextRequest) {
  try {
    if (!(await isAuthorizedAdmin(req))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!adminSupabase) {
      return NextResponse.json({ error: 'Admin client not configured' }, { status: 500 })
    }

    const pulseUserCap = parseInt(req.nextUrl.searchParams.get('pulseCap') ?? '400', 10)
    const startDate = req.nextUrl.searchParams.get('startDate')?.trim()
    const endDate = req.nextUrl.searchParams.get('endDate')?.trim()

    let payload
    try {
      payload =
        startDate && endDate
          ? await buildFounderJourneyCommandCenter(adminSupabase, {
              startDate,
              endDate,
              pulseUserCap,
            })
          : await buildFounderJourneyCommandCenter(adminSupabase, {
              cohortDays: parseInt(req.nextUrl.searchParams.get('cohortDays') ?? '90', 10),
              pulseUserCap,
            })
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      if (msg.includes('startDate') || msg.includes('endDate') || msg.includes('yyyy-MM-dd')) {
        return NextResponse.json({ error: msg || 'Invalid date range' }, { status: 400 })
      }
      throw err
    }

    return NextResponse.json(payload)
  } catch (e) {
    console.error('[admin/founder-journey-dashboard]', e)
    return NextResponse.json({ error: 'Failed to build dashboard' }, { status: 500 })
  }
}
