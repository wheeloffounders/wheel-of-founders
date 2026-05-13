import { NextResponse } from 'next/server'
import { getServerSession } from '@/lib/server-auth'
import { applyLegacyBetaRetirementIfNeeded } from '@/lib/beta-retirement'

export const dynamic = 'force-dynamic'

/**
 * Idempotent: starts 7-day trial for legacy beta users once (`is_beta_retired` was false).
 * Call after any login path (e.g. password) that does not hit `/auth/callback`.
 */
export async function POST() {
  const session = await getServerSession()
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }
  const applied = await applyLegacyBetaRetirementIfNeeded(session.user.id)
  return NextResponse.json({ ok: true, applied })
}
