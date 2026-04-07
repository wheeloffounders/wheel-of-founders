import type { SupabaseClient } from '@supabase/supabase-js'
import type { ArchetypeApiFullResponse, ArchetypeEvolutionHistoryEntry } from '@/lib/types/founder-dna'
import { evaluateQuarterlyArchetypeShift } from '@/lib/services/archetypeEngine'
import type { ArchetypeEvolutionComputeMeta } from '@/lib/founder-dna/compute-archetype-api-response'
import { parseStoredArchetypeFullSnapshot, toPersistableFullSnapshot } from '@/lib/founder-dna/archetype-snapshot'
import {
  formatQuarterPeriodLabel,
  parseEvolutionHistory,
  prependEvolutionEntry,
} from '@/lib/founder-dna/archetype-evolution-history'

export async function persistFullArchetypeWithEvolution(params: {
  db: SupabaseClient
  userId: string
  profileData: { archetype_snapshot?: unknown; archetype_evolution_history?: unknown }
  computedBody: Omit<ArchetypeApiFullResponse, 'evolutionHistory'>
  evolutionMeta: ArchetypeEvolutionComputeMeta
  nowIso: string
}): Promise<{ evolutionHistory: ArchetypeEvolutionHistoryEntry[]; evolutionAdded: boolean }> {
  const { db, userId, profileData, computedBody, evolutionMeta, nowIso } = params

  const prev = parseStoredArchetypeFullSnapshot(profileData.archetype_snapshot)
  const previousPrimary =
    prev?.primary && typeof prev.primary === 'object' && prev.primary !== null && 'name' in prev.primary
      ? String((prev.primary as { name?: string }).name || '')
      : null
  const previousPrimaryNorm = previousPrimary && previousPrimary.length > 0 ? previousPrimary : null

  const { shouldRecordEvolution } = evaluateQuarterlyArchetypeShift({
    previousPrimary: previousPrimaryNorm,
    computedPrimary: computedBody.primary.name,
    strategicPctRolling: evolutionMeta.strategicPct90d,
    totalRollingDecisions: evolutionMeta.totalDecisions90,
    usedRollingWindow: evolutionMeta.usedRollingWindow,
  })

  let evolutionHistory = parseEvolutionHistory(profileData.archetype_evolution_history)
  let evolutionAdded = false

  if (shouldRecordEvolution && previousPrimaryNorm) {
    evolutionHistory = prependEvolutionEntry(profileData.archetype_evolution_history, {
      fromPrimary: previousPrimaryNorm,
      toPrimary: computedBody.primary.name,
      at: nowIso,
      periodLabel: formatQuarterPeriodLabel(new Date(nowIso)),
      strategicPctRolling: evolutionMeta.strategicPct90d,
    })
    evolutionAdded = true
  }

  const persistable = toPersistableFullSnapshot({
    status: 'full',
    primary: computedBody.primary,
    secondary: computedBody.secondary,
    traits: computedBody.traits,
    personalityProfile: computedBody.personalityProfile,
    breakdown: computedBody.breakdown,
  })

  try {
    await (db.from('user_profiles') as any)
      .update({
        archetype_snapshot: persistable,
        archetype_updated_at: nowIso,
        archetype_evolution_history: evolutionHistory,
        updated_at: nowIso,
      })
      .eq('id', userId)
  } catch (e) {
    console.error('[persist-archetype-with-evolution] persist error', e)
  }

  return { evolutionHistory, evolutionAdded }
}
