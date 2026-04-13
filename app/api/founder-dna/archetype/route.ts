import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'
import {
  ARCHETYPE_FULL_MIN_DAYS,
  ARCHETYPE_PREVIEW_MIN_DAYS,
} from '@/lib/founder-dna/archetype-timing'
import {
  effectiveDaysActiveForArchetypeCompute,
  hasPersistedArchetypeUnlockHint,
  mergeArchetypeUnlocksFromPersistedSnapshot,
  nextArchetypeUpdateIsoFrom,
  parseStoredArchetypeFullSnapshot,
  shouldRefreshArchetypeSnapshot,
} from '@/lib/founder-dna/archetype-snapshot'
import { computeArchetypeApiResponse } from '@/lib/founder-dna/compute-archetype-api-response'
import { persistFullArchetypeWithEvolution } from '@/lib/founder-dna/persist-archetype-with-evolution'
import { loadArchetypeUnlockChecklist } from '@/lib/founder-dna/load-archetype-unlock-checklist'
import { ensureArchetypeUserUnlockRows, insertUserUnlock } from '@/lib/unlock-helpers'
import { getDaysWithEntries } from '@/lib/founder-dna/days-with-entries'
import { parseUnlockedFeatures } from '@/types/supabase'

const LOG = '[founder-dna/archetype]'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSessionFromRequest(_req)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = session.user.id
    const db = getServerSupabase()

    console.error(LOG, 'step:session_ok', { userId })

    const profileRes = await db
      .from('user_profiles')
      .select(
        'created_at, unlocked_features, founder_personality, archetype_snapshot, archetype_updated_at'
      )
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

    let daysActive = 0
    try {
      console.error(LOG, 'step:get_days_with_entries_start')
      const daysWithEntries = await getDaysWithEntries(userId, db)
      daysActive = Number.isFinite(daysWithEntries) ? daysWithEntries : 0
      console.error(LOG, 'step:get_days_with_entries_ok', { daysActive })
    } catch (daysErr) {
      console.error(LOG, 'step:get_days_with_entries_failed', daysErr)
      daysActive = 0
    }

    let unlockedFeatures = parseUnlockedFeatures(profileData.unlocked_features)
    console.error(LOG, 'step:parse_unlocked_features', { count: unlockedFeatures.length })

    const hasPreview = unlockedFeatures.some((f) => f.name === 'founder_archetype')
    const hasFull = unlockedFeatures.some((f) => f.name === 'founder_archetype_full')

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

    console.error(LOG, 'step:snapshot_repair_merge_start')
    const snapshotRepair = mergeArchetypeUnlocksFromPersistedSnapshot(
      unlockedFeatures,
      profileData.archetype_snapshot
    )
    unlockedFeatures = snapshotRepair.merged
    console.error(LOG, 'step:snapshot_repair_merge_done', { didRepair: snapshotRepair.didRepair })
    if (snapshotRepair.didRepair) {
      try {
        console.error(LOG, 'step:snapshot_repair_persist_start')
        await (db.from('user_profiles') as any).update({ unlocked_features: unlockedFeatures }).eq('id', userId)
        console.error(LOG, 'step:snapshot_repair_persist_ok')
      } catch (repairPersistErr) {
        console.error(LOG, 'step:snapshot_repair_persist_failed', repairPersistErr)
      }
    }

    const parsedFullMaster = parseStoredArchetypeFullSnapshot(profileData.archetype_snapshot)
    const snapshotHintAuth = hasPersistedArchetypeUnlockHint(profileData.archetype_snapshot)

    let hasPreviewFlag = unlockedFeatures.some((f) => f.name === 'founder_archetype')
    const eligibleByDays = daysActive >= ARCHETYPE_PREVIEW_MIN_DAYS
    const eligibleBySnapshot = !!parsedFullMaster || snapshotHintAuth
    const authorized = hasPreviewFlag || eligibleBySnapshot || eligibleByDays

    if (!authorized) {
      console.error(LOG, 'step:locked_no_access', { daysActive, eligibleBySnapshot, eligibleByDays })
      const unlockChecklist = await loadArchetypeUnlockChecklist(db, userId, profileData, daysActive)
      return NextResponse.json(
        { error: 'Feature locked', progress: unlockChecklist.unlock, unlockChecklist },
        { status: 403 }
      )
    }

    let profileUnlocksDirty = snapshotRepair.didRepair

    if (!hasPreviewFlag && (eligibleBySnapshot || eligibleByDays)) {
      const mergedAgain = mergeArchetypeUnlocksFromPersistedSnapshot(
        unlockedFeatures,
        profileData.archetype_snapshot
      )
      if (mergedAgain.didRepair || mergedAgain.merged.length !== unlockedFeatures.length) {
        unlockedFeatures = mergedAgain.merged
        profileUnlocksDirty = true
      }
      hasPreviewFlag = unlockedFeatures.some((f) => f.name === 'founder_archetype')
      const nowIso = new Date().toISOString()
      if (!hasPreviewFlag) {
        unlockedFeatures = [
          ...unlockedFeatures,
          {
            name: 'founder_archetype',
            label: 'Founder Archetype (Preview)',
            description: 'Emerging archetype preview — full profile at 31 days with entries',
            icon: '🏷️',
            unlocked_at: nowIso,
          },
        ]
        profileUnlocksDirty = true
      }
    }

    if (parsedFullMaster && !unlockedFeatures.some((f) => f.name === 'founder_archetype_full')) {
      const nowIsoFull = new Date().toISOString()
      unlockedFeatures = [
        ...unlockedFeatures,
        {
          name: 'founder_archetype_full',
          label: 'Founder Archetype (Full)',
          description: 'Full archetype profile and breakdown',
          icon: '🔮',
          unlocked_at: nowIsoFull,
        },
      ]
      profileUnlocksDirty = true
    }

    if (parsedFullMaster) {
      const unlockInserted = await ensureArchetypeUserUnlockRows(db, userId, {
        needPreview: true,
        needFull: true,
      })
      if (unlockInserted) profileUnlocksDirty = true
    } else {
      const unlockInserted = await ensureArchetypeUserUnlockRows(db, userId, {
        needPreview: unlockedFeatures.some((f) => f.name === 'founder_archetype'),
        needFull: unlockedFeatures.some((f) => f.name === 'founder_archetype_full'),
      })
      if (unlockInserted) profileUnlocksDirty = true
    }

    if (profileUnlocksDirty) {
      try {
        console.error(LOG, 'step:profile_unlocks_persist_start')
        await (db.from('user_profiles') as any).update({ unlocked_features: unlockedFeatures }).eq('id', userId)
        console.error(LOG, 'step:profile_unlocks_persist_ok')
      } catch (persistUnlocksErr) {
        console.error(LOG, 'step:profile_unlocks_persist_failed', persistUnlocksErr)
      }
    }

    const hasFullUnlock = unlockedFeatures.some((f) => f.name === 'founder_archetype_full')
    const archetypeUpdatedAtRaw = profileData.archetype_updated_at ?? null
    const snapshotStaleForCache = archetypeUpdatedAtRaw
      ? shouldRefreshArchetypeSnapshot(archetypeUpdatedAtRaw)
      : false

    // Serve persisted full snapshot (source of truth). Missing `archetype_updated_at` still serves cache.
    if (hasFullUnlock && !snapshotStaleForCache) {
      try {
        console.error(LOG, 'step:cache_parse_snapshot_start')
        const parsed = parseStoredArchetypeFullSnapshot(profileData.archetype_snapshot)
        console.error(LOG, 'step:cache_parse_snapshot_done', { hasParsed: !!parsed, hasUpdatedAt: !!archetypeUpdatedAtRaw })
        if (parsed) {
          const unlockChecklist = await loadArchetypeUnlockChecklist(db, userId, profileData, daysActive)
          const { _v: _drop, ...rest } = parsed
          const updatedAtForClient = archetypeUpdatedAtRaw ?? null
          const cachePayload = {
            ...rest,
            unlockChecklist,
            archetypeUpdatedAt: updatedAtForClient,
            nextArchetypeUpdateAt: nextArchetypeUpdateIsoFrom(
              archetypeUpdatedAtRaw ?? new Date().toISOString()
            ),
            fromCache: true as const,
          }
          try {
            JSON.stringify(cachePayload)
          } catch (serErr) {
            console.error(LOG, 'step:cache_json_stringify_failed', serErr)
            throw serErr
          }
          console.error(LOG, 'step:return_cached_snapshot')
          return NextResponse.json(cachePayload)
        }
      } catch (cacheErr) {
        console.error(LOG, 'step:cache_path_failed_falling_through', cacheErr)
      }
    }

    const daysActiveForCompute = effectiveDaysActiveForArchetypeCompute(
      daysActive,
      profileData.archetype_snapshot
    )

    console.error(LOG, 'step:compute_archetype_start', { daysActive, daysActiveForCompute })
    const computed = await computeArchetypeApiResponse({
      db,
      userId,
      profileData,
      unlockedFeatures,
      daysActive: daysActiveForCompute,
    })

    if (computed.kind === 'preview') {
      console.error(LOG, 'step:return_preview')
      return NextResponse.json(computed.body)
    }

    console.error(LOG, 'step:persist_full_start')
    const nowIso = new Date().toISOString()
    const { evolutionHistory } = await persistFullArchetypeWithEvolution({
      db,
      userId,
      profileData,
      computedBody: computed.body,
      evolutionMeta: computed.evolutionMeta,
      nowIso,
    })

    console.error(LOG, 'step:return_fresh_full')
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
    return NextResponse.json({ error: 'Failed to load founder archetype' }, { status: 500 })
  }
}
