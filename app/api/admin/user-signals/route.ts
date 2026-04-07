import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { getServerSupabase } from '@/lib/server-supabase'
import { adminSupabase } from '@/lib/supabase/admin'
import { fetchUserSignals } from '@/lib/admin/get-user-signals'
import { computeShadowFromUserSignals } from '@/lib/admin/shadow-engine'

export const dynamic = 'force-dynamic'

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

/** GET ?userId= — AI-ready snapshot: first 72h signals + shadow engine (admin only). */
export async function GET(req: NextRequest) {
  try {
    if (!(await isAuthorizedAdmin(req))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = req.nextUrl.searchParams.get('userId')?.trim()
    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    if (!adminSupabase) {
      return NextResponse.json({ error: 'Admin client not configured' }, { status: 500 })
    }

    const signals = await fetchUserSignals(adminSupabase, userId)
    if (!signals) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const shadow = computeShadowFromUserSignals(signals)

    return NextResponse.json({
      signals,
      shadow,
    })
  } catch (e) {
    console.error('[admin/user-signals]', e)
    return NextResponse.json({ error: 'Failed to load signals' }, { status: 500 })
  }
}
