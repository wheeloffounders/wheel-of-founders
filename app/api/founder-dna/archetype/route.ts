import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'
import {
  ARCHETYPE_FULL_MIN_DAYS,
  ARCHETYPE_PREVIEW_MIN_DAYS,
} from '@/lib/founder-dna/archetype-timing'
import {
  nextArchetypeUpdateIsoFrom,
  parseStoredArchetypeFullSnapshot,
  shouldRefreshArchetypeSnapshot,
} from '@/lib/founder-dna/archetype-snapshot'
import { computeArchetypeApiResponse } from '@/lib/founder-dna/compute-archetype-api-response'
import { parseEvolutionHistory } from '@/lib/founder-dna/archetype-evolution-history'
import { persistFullArchetypeWithEvolution } from '@/lib/founder-dna/persist-archetype-with-evolution'
import { loadArchetypeUnlockChecklist } from '@/lib/founder-dna/load-archetype-unlock-checklist'
import { insertUserUnlock } from '@/lib/unlock-helpers'
import { getDaysWithEntries } from '@/lib/founder-dna/days-with-entries'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSessionFromRequest(_req)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = session.user.id
    const db = getServerSupabase()

    const profileRes = await db
      .from('user_profiles')
      .select(
        'created_at, unlocked_features, founder_personality, archetype_snapshot, archetype_updated_at, archetype_evolution_history'
      )
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

    const daysWithEntries = await getDaysWithEntries(userId, db)
    const daysActive = daysWithEntries

    let unlockedFeatures = Array.isArray(profileData?.unlocked_features)
      ? (profileData.unlocked_features as { name?: string }[])
      : []

    const hasPreview = unlockedFeatures.some((f) => f?.name === 'founder_archetype')
    const hasFull = unlockedFeatures.some((f) => f?.name === 'founder_archetype_full')

    if (!hasPreview && daysActive >= ARCHETYPE_PREVIEW_MIN_DAYS) {
      const nowIso = new Date().toISOString()
      const founderArchetypeFeature = {
        name: 'founder_archetype',
        label: 'Founder Archetype (Preview)',
        description: 'Emerging archetype preview — full profile at 31 days with entries',
        icon: '🏷️',
        unlocked_at: nowIso,
      }
      try {
        await insertUserUnlock(db, userId, 'founder_archetype', 'feature', nowIso)
      } catch {
        // ignore
      }
      unlockedFeatures = [...unlockedFeatures, founderArchetypeFeature]
      try {
        await (db.from('user_profiles') as any).update({ unlocked_features: unlockedFeatures }).eq('id', userId)
      } catch {
        // ignore
      }
    }

    if (!hasFull && daysActive >= ARCHETYPE_FULL_MIN_DAYS) {
      const nowIso = new Date().toISOString()
      const fullFeature = {
        name: 'founder_archetype_full',
        label: 'Founder Archetype (Full)',
        description: 'Full archetype profile and breakdown',
        icon: '🔮',
        unlocked_at: nowIso,
      }
      try {
        await insertUserUnlock(db, userId, 'founder_archetype_full', 'feature', nowIso)
      } catch {
        // ignore
      }
      unlockedFeatures = [...unlockedFeatures, fullFeature]
      try {
        await (db.from('user_profiles') as any).update({ unlocked_features: unlockedFeatures }).eq('id', userId)
      } catch {
        // ignore
      }
    }

    const hasFeatureAfterUnlock = unlockedFeatures.some((f) => f?.name === 'founder_archetype')

    if (!hasFeatureAfterUnlock) {
      const unlockChecklist = await loadArchetypeUnlockChecklist(db, userId, profileData, daysActive)
      return NextResponse.json(
        { error: 'Feature locked', progress: unlockChecklist.unlock, unlockChecklist },
        { status: 403 }
      )
    }

    const hasFullUnlock = unlockedFeatures.some((f) => f?.name === 'founder_archetype_full')
    const archetypeUpdatedAtRaw = profileData.archetype_updated_at ?? null

    if (
      hasFullUnlock &&
      daysActive >= ARCHETYPE_FULL_MIN_DAYS &&
      !shouldRefreshArchetypeSnapshot(archetypeUpdatedAtRaw)
    ) {
      const parsed = parseStoredArchetypeFullSnapshot(profileData.archetype_snapshot)
      if (parsed && archetypeUpdatedAtRaw) {
        const unlockChecklist = await loadArchetypeUnlockChecklist(db, userId, profileData, daysActive)
        const { _v: _drop, ...rest } = parsed
        return NextResponse.json({
          ...rest,
          unlockChecklist,
          archetypeUpdatedAt: archetypeUpdatedAtRaw,
          nextArchetypeUpdateAt: nextArchetypeUpdateIsoFrom(archetypeUpdatedAtRaw),
          fromCache: true,
        })
      }
    }

    const computed = await computeArchetypeApiResponse({
      db,
      userId,
      profileData,
      unlockedFeatures,
      daysActive,
    })

    if (computed.kind === 'preview') {
      return NextResponse.json(computed.body)
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
    console.error('[founder-dna/archetype] error', err)
    return NextResponse.json({ error: 'Failed to load founder archetype' }, { status: 500 })
  }
}
