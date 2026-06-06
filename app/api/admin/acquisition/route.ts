import { NextResponse } from 'next/server'
import { getServerSession } from '@/lib/server-auth'
import { isWhitelistAdminEmail } from '@/lib/admin-emails'
import { buildAcquisitionHub } from '@/lib/admin/build-acquisition-hub'
import { serverSupabase } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function assertAdmin(): Promise<{ ok: true } | { ok: false; status: number }> {
  const session = await getServerSession()
  if (!session?.user?.id) return { ok: false, status: 401 }
  const db = serverSupabase()
  const { data: profile } = await db
    .from('user_profiles')
    .select('is_admin')
    .eq('id', session.user.id)
    .maybeSingle()
  const allow = !!(profile as { is_admin?: boolean } | null)?.is_admin || isWhitelistAdminEmail(session.user.email)
  if (!allow) return { ok: false, status: 403 }
  return { ok: true }
}

export async function GET(req: Request) {
  try {
    const gate = await assertAdmin()
    if (!gate.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: gate.status })

    const url = new URL(req.url)
    const startDate = url.searchParams.get('startDate')?.trim() || undefined
    const endDate = url.searchParams.get('endDate')?.trim() || undefined
    const daysRaw = url.searchParams.get('days')
    const windowDays = daysRaw ? Number.parseInt(daysRaw, 10) : undefined

    const db = serverSupabase()
    const payload = await buildAcquisitionHub(db, {
      startDate,
      endDate,
      windowDays: Number.isFinite(windowDays) ? windowDays : startDate && endDate ? undefined : 30,
    })
    return NextResponse.json(payload)
  } catch (e) {
    console.error('[admin/acquisition]', e)
    return NextResponse.json(
      {
        error: 'Failed to load acquisition hub',
        hint:
          'Ensure migrations 146–147 (funnel_analytics), 150 (page_view), and 151 (acquisition_snapshot) are applied.',
      },
      { status: 500 }
    )
  }
}
