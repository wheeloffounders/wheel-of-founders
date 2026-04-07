import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'
import type { ProEntitlementProfile } from '@/lib/auth/is-pro'
import { getTrialStatus } from '@/lib/auth/trial-status'
import { fetchTrialWrapupStats } from '@/lib/trial-wrapup-stats'

export const dynamic = 'force-dynamic'

/**
 * GET /api/user/trial-wrapup-summary
 * Returns fires count + intention alignment for the user’s Pro trial window (requires expired trial with `trial_ends_at`).
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getServerSupabase()
    const { data: profileRow } = await db
      .from('user_profiles')
      .select(
        'tier, pro_features_enabled, subscription_tier, trial_starts_at, trial_ends_at, stripe_subscription_status, created_at'
      )
      .eq('id', session.user.id)
      .maybeSingle()

    const profile = profileRow as ProEntitlementProfile | null
    const ts = getTrialStatus(profile, { nowMs: Date.now() })
    if (ts.status !== 'expired') {
      return NextResponse.json({ error: 'Not eligible' }, { status: 403 })
    }
    if (!profile?.trial_ends_at) {
      return NextResponse.json({ error: 'No trial window on record' }, { status: 403 })
    }

    const stats = await fetchTrialWrapupStats(session.user.id, db, profile)
    return NextResponse.json(stats)
  } catch (e) {
    console.error('[trial-wrapup-summary]', e)
    return NextResponse.json({ error: 'Failed to load summary' }, { status: 500 })
  }
}
