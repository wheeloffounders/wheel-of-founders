import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/server-auth'
import { isDevProfileMasterSwitchEmail } from '@/lib/dev-profile-master-switch-emails'
import { getServerSupabase } from '@/lib/server-supabase'

export const dynamic = 'force-dynamic'

const VALUES = new Set(['pro', 'free', 'none'])

/**
 * Developer-only: set subscription_override on own profile (Pro / Free / timer).
 */
export async function PATCH(req: NextRequest) {
  const session = await getServerSession()
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }
  if (!isDevProfileMasterSwitchEmail(session.user.email)) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
  }

  const body = (await req.json().catch(() => null)) as { value?: string } | null
  const value = String(body?.value ?? '')
    .trim()
    .toLowerCase()
  if (!VALUES.has(value)) {
    return NextResponse.json({ ok: false, error: 'Invalid value' }, { status: 400 })
  }

  const db = getServerSupabase()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db.from('user_profiles') as any)
    .update({
      subscription_override: value,
      updated_at: new Date().toISOString(),
    })
    .eq('id', session.user.id)

  if (error) {
    console.error('[subscription-override]', error.message)
    return NextResponse.json({ ok: false, error: 'Update failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, subscription_override: value })
}
