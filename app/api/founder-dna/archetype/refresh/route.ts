import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'
import { ARCHETYPE_FULL_MIN_DAYS } from '@/lib/founder-dna/archetype-timing'
import { nextArchetypeUpdateIsoFrom } from '@/lib/founder-dna/archetype-snapshot'
import { computeArchetypeApiResponse } from '@/lib/founder-dna/compute-archetype-api-response'
import { persistFullArchetypeWithEvolution } from '@/lib/founder-dna/persist-archetype-with-evolution'
import { getDaysWithEntries } from '@/lib/founder-dna/days-with-entries'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/** Force full archetype recompute and persist snapshot (ignores 60-day window). */
export async function POST(_req: NextRequest) {
  try {
    const session = await getServerSessionFromRequest(_req)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = session.user.id
    const db = getServerSupabase()

    const profileRes = await db
      .from('user_profiles')
      .select('unlocked_features, founder_personality, archetype_snapshot, archetype_updated_at, archetype_evolution_history')
      .eq('id', userId)
      .maybeSingle()

    if (profileRes.error || !profileRes.data) {
      return NextResponse.json({ error: 'Failed to verify access' }, { status: 403 })
    }

    const profileData = profileRes.data as {
      unlocked_features?: unknown
      founder_personality?: string | null
      archetype_snapshot?: unknown
      archetype_updated_at?: string | null
      archetype_evolution_history?: unknown
    }
    const unlockedFeatures = Array.isArray(profileData?.unlocked_features)
      ? (profileData.unlocked_features as { name?: string }[])
      : []

    const hasFull = unlockedFeatures.some((f) => f?.name === 'founder_archetype_full')
    const daysActive = await getDaysWithEntries(userId, db)

    if (!hasFull || daysActive < ARCHETYPE_FULL_MIN_DAYS) {
      return NextResponse.json({ error: 'Full archetype not unlocked yet' }, { status: 403 })
    }

    const computed = await computeArchetypeApiResponse({
      db,
      userId,
      profileData,
      unlockedFeatures,
      daysActive,
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

    return NextResponse.json({
      ...computed.body,
      evolutionHistory,
      archetypeUpdatedAt: nowIso,
      nextArchetypeUpdateAt: nextArchetypeUpdateIsoFrom(nowIso),
      fromCache: false,
    })
  } catch (err) {
    console.error('[founder-dna/archetype/refresh] error', err)
    return NextResponse.json({ error: 'Failed to refresh archetype' }, { status: 500 })
  }
}
