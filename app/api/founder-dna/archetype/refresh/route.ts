import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'
import { ARCHETYPE_FULL_MIN_DAYS } from '@/lib/founder-dna/archetype-timing'
import {
  effectiveDaysActiveForArchetypeCompute,
  mergeArchetypeUnlocksFromPersistedSnapshot,
  nextArchetypeUpdateIsoFrom,
  parseStoredArchetypeFullSnapshot,
} from '@/lib/founder-dna/archetype-snapshot'
import { computeArchetypeApiResponse } from '@/lib/founder-dna/compute-archetype-api-response'
import { persistFullArchetypeWithEvolution } from '@/lib/founder-dna/persist-archetype-with-evolution'
import { getDaysWithEntries } from '@/lib/founder-dna/days-with-entries'
import { parseUnlockedFeatures } from '@/types/supabase'

const LOG = '[founder-dna/archetype/refresh]'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/** Force full archetype recompute and persist snapshot (ignores 60-day window). */
export async function POST(_req: NextRequest) {
  try {
    const session = await getServerSessionFromRequest(_req)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = session.user.id
    const db = getServerSupabase()
    console.error(LOG, 'step:start', { userId })

    const profileRes = await db
      .from('user_profiles')
      .select('unlocked_features, founder_personality, archetype_snapshot, archetype_updated_at')
      .eq('id', userId)
      .maybeSingle()

    if (profileRes.error || !profileRes.data) {
      console.error(LOG, 'step:fetch_profile_failed', profileRes.error)
      return NextResponse.json({ error: 'Failed to verify access' }, { status: 403 })
    }

    console.error(LOG, 'step:fetch_profile_ok')

    const profileData = profileRes.data as {
      unlocked_features?: unknown
      founder_personality?: string | null
      archetype_snapshot?: unknown
      archetype_updated_at?: string | null
    }
    let unlockedFeatures = parseUnlockedFeatures(profileData.unlocked_features)
    const snapshotRepair = mergeArchetypeUnlocksFromPersistedSnapshot(
      unlockedFeatures,
      profileData.archetype_snapshot
    )
    unlockedFeatures = snapshotRepair.merged

    const hasFullUnlock =
      unlockedFeatures.some((f) => f.name === 'founder_archetype_full') ||
      !!parseStoredArchetypeFullSnapshot(profileData.archetype_snapshot)

    let daysActive = 0
    try {
      console.error(LOG, 'step:get_days_with_entries_start')
      const n = await getDaysWithEntries(userId, db)
      daysActive = Number.isFinite(n) ? n : 0
      console.error(LOG, 'step:get_days_with_entries_ok', { daysActive })
    } catch (daysErr) {
      console.error(LOG, 'step:get_days_with_entries_failed', daysErr)
    }

    const daysActiveForCompute = effectiveDaysActiveForArchetypeCompute(
      daysActive,
      profileData.archetype_snapshot
    )

    if (!hasFullUnlock || daysActiveForCompute < ARCHETYPE_FULL_MIN_DAYS) {
      console.error(LOG, 'step:gate_denied', { hasFullUnlock, daysActiveForCompute })
      return NextResponse.json({ error: 'Full archetype not unlocked yet' }, { status: 403 })
    }

    console.error(LOG, 'step:compute_start', { daysActive, daysActiveForCompute })
    const computed = await computeArchetypeApiResponse({
      db,
      userId,
      profileData,
      unlockedFeatures,
      daysActive: daysActiveForCompute,
    })

    if (computed.kind !== 'full') {
      return NextResponse.json({ error: 'Unexpected preview state' }, { status: 500 })
    }

    const nowIso = new Date().toISOString()
    const { evolutionHistory } = await persistFullArchetypeWithEvolution({
      db,
      userId,
      profileData,
      computedBody: computed.body,
      evolutionMeta: computed.evolutionMeta,
      nowIso,
    })

    console.error(LOG, 'step:return_ok')
    return NextResponse.json({
      ...computed.body,
      evolutionHistory,
      archetypeUpdatedAt: nowIso,
      nextArchetypeUpdateAt: nextArchetypeUpdateIsoFrom(nowIso),
      fromCache: false,
    })
  } catch (err) {
    console.error(LOG, 'fatal', err)
    if (err instanceof Error && err.stack) {
      console.error(LOG, 'stack', err.stack)
    }
    return NextResponse.json({ error: 'Failed to refresh archetype' }, { status: 500 })
  }
}
