import type { SupabaseClient } from '@supabase/supabase-js'
import { computeFounderArchetype } from '@/lib/founder-archetypes'
import { ARCHETYPE_FULL_MIN_DAYS, ARCHETYPE_PREVIEW_MIN_DAYS } from '@/lib/founder-dna/archetype-timing'
import type { ArchetypeApiFullResponse, ArchetypeApiPreviewResponse } from '@/lib/types/founder-dna'
import { parseStoredArchetypeFullSnapshot } from '@/lib/founder-dna/archetype-snapshot'

function countKeywordHits(text: string, keywords: string[]) {
  const lower = text.toLowerCase()
  let hits = 0
  for (const kw of keywords) {
    const re = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi')
    const matches = lower.match(re)
    hits += matches?.length ?? 0
  }
  return hits
}

function formatDateShort(dateInput: string | null | undefined) {
  if (!dateInput) return '—'
  const iso = dateInput.slice(0, 10)
  const parts = iso.split('-')
  if (parts.length !== 3) return iso
  const monthIdx = Number(parts[1]) - 1
  const day = Number(parts[2])
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const month = MONTHS[monthIdx] ?? parts[1]
  return `${month} ${day}`
}

export type ArchetypeEvolutionComputeMeta = {
  usedRollingWindow: boolean
  strategicPct90d: number
  totalDecisions90: number
}

export type ArchetypeComputeResult =
  | { kind: 'preview'; body: ArchetypeApiPreviewResponse }
  | { kind: 'full'; body: ArchetypeApiFullResponse; evolutionMeta: ArchetypeEvolutionComputeMeta }

/**
 * Full signal pull + archetype compute (preview or full). Used by GET and manual refresh.
 * Caller must ensure user has preview feature unlocked and daysActive >= preview threshold.
 */
export async function computeArchetypeApiResponse(params: {
  db: SupabaseClient
  userId: string
  profileData: {
    founder_personality?: string | null
    archetype_snapshot?: unknown
    archetype_updated_at?: string | null
  }
  unlockedFeatures: { name?: string }[]
  daysActive: number
}): Promise<ArchetypeComputeResult> {
  const { db, userId, profileData, unlockedFeatures, daysActive } = params
  const targetDays = ARCHETYPE_PREVIEW_MIN_DAYS
  const since90Plans = new Date(Date.now() - 90 * 86400000)
  const since90Str = since90Plans.toISOString().slice(0, 10)

  const [
    strategicCountRes,
    tacticalCountRes,
    strategic90Res,
    tactical90Res,
    tasksRes,
    reviewsRes,
    energyTotalRes,
    postponementsTotalRes,
    postponementsRecentRes,
    duoActiveRes,
    decisionsRecentRes,
    stressReviewsRes,
  ] = await Promise.all([
    db
      .from('morning_decisions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('decision_type', 'strategic'),
    db
      .from('morning_decisions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('decision_type', 'tactical'),
    db
      .from('morning_decisions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('decision_type', 'strategic')
      .gte('plan_date', since90Str),
    db
      .from('morning_decisions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('decision_type', 'tactical')
      .gte('plan_date', since90Str),
    (async () => {
      const sincePlans = new Date(Date.now() - 90 * 86400000)
      const sincePlanStr = sincePlans.toISOString().slice(0, 10)
      return db
        .from('morning_tasks')
        .select('plan_date, action_plan, description, created_at, completed')
        .eq('user_id', userId)
        .gte('plan_date', sincePlanStr)
        .eq('completed', true)
    })(),
    (async () => {
      const sinceReviews = new Date(Date.now() - 30 * 86400000)
      return db
        .from('evening_reviews')
        .select('wins, lessons')
        .eq('user_id', userId)
        .gte('created_at', sinceReviews.toISOString())
    })(),
    db
      .from('evening_reviews')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
    db
      .from('task_postponements')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
    (async () => {
      const sincePostponements = new Date(Date.now() - 180 * 86400000)
      return db
        .from('task_postponements')
        .select('task_id, task_description, action_plan, moved_at, moved_to_date')
        .eq('user_id', userId)
        .gte('moved_at', sincePostponements.toISOString())
        .order('moved_at', { ascending: false })
        .limit(500)
    })(),
    db
      .from('duo_relationships')
      .select('invited_email, invited_at')
      .eq('primary_user_id', userId)
      .eq('status', 'active')
      .limit(1),
    (async () => {
      const sinceDecisions = new Date(Date.now() - 180 * 86400000)
      const sinceDecisionsStr = sinceDecisions.toISOString().slice(0, 10)
      return db
        .from('morning_decisions')
        .select('plan_date, decision_type, decision, created_at')
        .eq('user_id', userId)
        .gte('plan_date', sinceDecisionsStr)
        .order('created_at', { ascending: false })
        .limit(200)
    })(),
    (async () => {
      const sinceStress = new Date(Date.now() - 120 * 86400000)
      return db
        .from('evening_reviews')
        .select('review_date, wins, lessons, created_at')
        .eq('user_id', userId)
        .gte('created_at', sinceStress.toISOString())
        .order('created_at', { ascending: false })
        .limit(100)
    })(),
  ])

  if (strategicCountRes.error) throw strategicCountRes.error
  if (tacticalCountRes.error) throw tacticalCountRes.error
  if (strategic90Res.error) throw strategic90Res.error
  if (tactical90Res.error) throw tactical90Res.error
  if (tasksRes.error) throw tasksRes.error
  if (reviewsRes.error) throw reviewsRes.error
  if (energyTotalRes.error) throw energyTotalRes.error
  if (postponementsTotalRes.error) throw postponementsTotalRes.error
  if (postponementsRecentRes.error) throw postponementsRecentRes.error
  if (duoActiveRes.error) throw duoActiveRes.error
  if (decisionsRecentRes.error) throw decisionsRecentRes.error
  if (stressReviewsRes.error) throw stressReviewsRes.error

  const strategicCount = strategicCountRes.count ?? 0
  const tacticalCount = tacticalCountRes.count ?? 0
  const strategic90 = strategic90Res.count ?? 0
  const tactical90 = tactical90Res.count ?? 0
  const totalDecisions90 = strategic90 + tactical90

  const hasPriorPersistedSnapshot =
    !!parseStoredArchetypeFullSnapshot(profileData.archetype_snapshot) &&
    !!profileData.archetype_updated_at

  let strategicForCompute = strategicCount
  let tacticalForCompute = tacticalCount
  let evolutionMeta: ArchetypeEvolutionComputeMeta = {
    usedRollingWindow: false,
    strategicPct90d: 0,
    totalDecisions90,
  }

  if (hasPriorPersistedSnapshot && daysActive >= ARCHETYPE_FULL_MIN_DAYS && totalDecisions90 >= 8) {
    strategicForCompute = strategic90
    tacticalForCompute = tactical90
    evolutionMeta = {
      usedRollingWindow: true,
      strategicPct90d: totalDecisions90 > 0 ? strategic90 / totalDecisions90 : 0,
      totalDecisions90,
    }
  }

  const totalDecisionsLifetime = strategicCount + tacticalCount

  const actionPlanCounts: Record<string, number> = {}
  for (const t of tasksRes.data ?? []) {
    const plan = (t as { action_plan?: string | null })?.action_plan
    if (typeof plan !== 'string' || !plan) continue
    actionPlanCounts[plan] = (actionPlanCounts[plan] ?? 0) + 1
  }
  const totalCompletedTasks = (tasksRes.data ?? []).length
  const topPlan = Object.entries(actionPlanCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

  const winsLessonsText = (reviewsRes.data ?? [])
    .map((r: { wins?: unknown; lessons?: unknown }) => `${r?.wins ?? ''} ${r?.lessons ?? ''}`)
    .join('\n')
  const reviewsCount = reviewsRes.data?.length ?? 0

  const energyReviewsTotalCount = energyTotalRes.count ?? 0
  const postponementsTotalCount = postponementsTotalRes.count ?? 0

  const postponementActionPlanCounts: Record<string, number> = {}
  for (const p of postponementsRecentRes.data ?? []) {
    const plan = (p as { action_plan?: string | null })?.action_plan
    if (typeof plan !== 'string' || !plan) continue
    postponementActionPlanCounts[plan] = (postponementActionPlanCounts[plan] ?? 0) + 1
  }

  const duoActive = (duoActiveRes.data ?? []).length > 0

  const completedTasks: unknown[] = (tasksRes.data ?? []) as unknown[]
  const decisionsRecent: unknown[] = (decisionsRecentRes.data ?? []) as unknown[]
  const stressReviews: unknown[] = (stressReviewsRes.data ?? []) as unknown[]
  const postponementsRecent: unknown[] = (postponementsRecentRes.data ?? []) as unknown[]

  const since30 = new Date(Date.now() - 30 * 86400000)
  const since30Str = since30.toISOString().slice(0, 10)

  const focusTasks30 = completedTasks
    .filter(
      (t: unknown) =>
        (t as { action_plan?: string; plan_date?: string })?.action_plan === 'my_zone' &&
        typeof (t as { plan_date?: string }).plan_date === 'string' &&
        (t as { plan_date: string }).plan_date >= since30Str
    )
    .sort(
      (a: unknown, b: unknown) =>
        new Date((b as { created_at?: string }).created_at ?? 0).getTime() -
        new Date((a as { created_at?: string }).created_at ?? 0).getTime()
    )

  const focusTimeCompleted30dCount = focusTasks30.length
  const focusTimeExampleTask =
    (focusTasks30[0] as { description?: string; plan_date?: string } | undefined)?.description
      ? {
          date: formatDateShort((focusTasks30[0] as { plan_date: string }).plan_date),
          description: String((focusTasks30[0] as { description?: string }).description || '').trim(),
        }
      : undefined

  const latestStrategicDecisionRow = decisionsRecent.find(
    (d: unknown) => (d as { decision_type?: string }).decision_type === 'strategic'
  ) as { plan_date?: string; decision?: string } | undefined
  const latestTacticalDecisionRow = decisionsRecent.find(
    (d: unknown) => (d as { decision_type?: string }).decision_type === 'tactical'
  ) as { plan_date?: string; decision?: string } | undefined

  const recentStrategicDecisionExample =
    latestStrategicDecisionRow?.decision
      ? {
          date: formatDateShort(latestStrategicDecisionRow.plan_date),
          decision: String(latestStrategicDecisionRow.decision || '').trim(),
        }
      : undefined

  const recentTacticalDecisionExample =
    latestTacticalDecisionRow?.decision
      ? {
          date: formatDateShort(latestTacticalDecisionRow.plan_date),
          decision: String(latestTacticalDecisionRow.decision || '').trim(),
        }
      : undefined

  const duoRow = duoActiveRes.data?.[0] as { invited_email?: string; invited_at?: string } | undefined
  const duoInviteExample =
    duoRow?.invited_email && duoRow?.invited_at
      ? {
          date: formatDateShort(duoRow.invited_at),
          invitedEmail: String(duoRow.invited_email || '').trim(),
        }
      : undefined

  const systemizePostponements = postponementsRecent.filter(
    (p: unknown) => (p as { action_plan?: string; task_id?: string }).action_plan === 'systemize' && (p as { task_id?: string }).task_id
  )
  const fallbackPostponements = postponementsRecent.filter((p: unknown) => (p as { task_id?: string }).task_id)
  const chosenPostponements = systemizePostponements.length > 0 ? systemizePostponements : fallbackPostponements

  const systemizeByTask = new Map<
    string,
    { taskDescription: string; movedCount: number; lastMovedAt: string; actionPlan?: string }
  >()

  for (const p of chosenPostponements) {
    const row = p as {
      task_id: string
      task_description?: string
      action_plan?: string
      moved_at?: string
      moved_to_date?: string
    }
    const taskId = String(row.task_id)
    const taskDescription = String(row.task_description || '').trim()
    const actionPlan = typeof row.action_plan === 'string' ? row.action_plan : undefined
    const movedAt = String(row.moved_at || row.moved_to_date || '')
    const prev = systemizeByTask.get(taskId)
    if (!prev) {
      systemizeByTask.set(taskId, { taskDescription, movedCount: 1, lastMovedAt: movedAt, actionPlan })
    } else {
      const lastMovedAtMs = new Date(prev.lastMovedAt || 0).getTime()
      const curMovedAtMs = new Date(movedAt || 0).getTime()
      systemizeByTask.set(taskId, {
        taskDescription: prev.taskDescription || taskDescription,
        movedCount: prev.movedCount + 1,
        lastMovedAt: curMovedAtMs > lastMovedAtMs ? movedAt : prev.lastMovedAt,
        actionPlan: curMovedAtMs > lastMovedAtMs ? actionPlan ?? prev.actionPlan : prev.actionPlan,
      })
    }
  }

  const topSystemize = [...systemizeByTask.entries()].sort((a, b) => b[1].movedCount - a[1].movedCount)[0]?.[1]
  const topPostponedSystemizeTaskExample =
    topSystemize?.taskDescription && topSystemize?.lastMovedAt
      ? {
          movedCount: topSystemize.movedCount,
          lastMovedDate: formatDateShort(topSystemize.lastMovedAt),
          taskDescription: topSystemize.taskDescription,
          actionPlan: topSystemize.actionPlan,
        }
      : undefined

  const stressKeywords = [
    'anxious',
    'worried',
    'overwhelm',
    'overwhelmed',
    'panic',
    'micromanage',
    'control',
    'tight',
    'stuck',
    'worry',
    'fear',
    'sad',
    'anger',
    'lonely',
    'stressed',
    'feel',
    'emotion',
    'heart',
  ]

  type StressReviewRow = { review_date?: string; wins?: unknown; lessons?: unknown }
  let topStressReview: StressReviewRow | null = null
  let topStressScore = 0
  for (const r of stressReviews) {
    const row = r as StressReviewRow
    const text = `${row?.wins ?? ''} ${row?.lessons ?? ''}`.trim()
    if (!text) continue
    const score = countKeywordHits(text, stressKeywords)
    if (score > topStressScore) {
      topStressScore = score
      topStressReview = row
    }
  }

  const stressEveningThenNextDecisionsExample =
    topStressReview?.review_date && topStressScore > 0
      ? (() => {
          const tsr = topStressReview as StressReviewRow
          const lower = `${tsr.wins ?? ''} ${tsr.lessons ?? ''}`.toLowerCase()
          const keyword = stressKeywords.find((k) => lower.includes(k)) ?? 'stress'
          const reviewDateIso = String(tsr.review_date).slice(0, 10)
          const reviewDate = new Date(reviewDateIso)
          reviewDate.setDate(reviewDate.getDate() + 1)
          const pad = (n: number) => String(n).padStart(2, '0')
          const nextStartStr = `${reviewDate.getFullYear()}-${pad(reviewDate.getMonth() + 1)}-${pad(reviewDate.getDate())}`
          const nextDecisions = decisionsRecent
            .filter((d: unknown) => typeof (d as { plan_date?: string }).plan_date === 'string' && (d as { plan_date: string }).plan_date >= nextStartStr)
            .sort(
              (a: unknown, b: unknown) =>
                new Date((a as { created_at?: string }).created_at ?? 0).getTime() -
                new Date((b as { created_at?: string }).created_at ?? 0).getTime()
            )
            .slice(0, 3)
          const nextDecisionsStrategic = nextDecisions.filter(
            (d: unknown) => (d as { decision_type?: string }).decision_type === 'strategic'
          ).length
          const nextDecisionsTactical = nextDecisions.filter(
            (d: unknown) => (d as { decision_type?: string }).decision_type === 'tactical'
          ).length
          return {
            reviewDate: formatDateShort(tsr.review_date),
            keyword,
            nextDecisionsStrategic,
            nextDecisionsTactical,
            nextDecisionsTotal: nextDecisions.length,
          }
        })()
      : undefined

  const unlockedFeatureNames = unlockedFeatures.map((f) => f?.name).filter(Boolean) as string[]

  const combinedText = `${winsLessonsText ?? ''} ${profileData.founder_personality ?? ''}`.trim()
  const keywordHitsTotal =
    countKeywordHits(combinedText, [
      'vision',
      'future',
      'big',
      'picture',
      'purpose',
      'dream',
      'build',
      'create',
      'iterate',
      'improve',
      'prototype',
      'craft',
      'done',
      'execute',
      'quick',
      'fast',
      'action',
      'momentum',
      'ship',
      'plan',
      'optimize',
      'strategy',
      'system',
      'framework',
      'model',
      'measure',
      'leverage',
    ]) ?? 0

  const unlockChecklist = {
    unlock: {
      daysActive,
      targetDays,
      daysRemaining: Math.max(0, ARCHETYPE_PREVIEW_MIN_DAYS - daysActive),
    },
    decisionsSignal: {
      total: totalDecisionsLifetime,
      strategic: strategicCount,
      tactical: tacticalCount,
      ready: totalDecisionsLifetime >= 3,
    },
    taskPlansSignal: {
      totalCompletedTasks,
      topPlan,
      ready: totalCompletedTasks >= 3,
    },
    eveningPatternsSignal: {
      reviewsCount,
      keywordHitsTotal,
      ready: reviewsCount >= 2 && keywordHitsTotal >= 2,
    },
    founderPersonalitySignal: {
      provided: !!profileData.founder_personality,
      ready: !!profileData.founder_personality,
    },
  }

  const archetype = computeFounderArchetype({
    strategicCount: strategicForCompute,
    tacticalCount: tacticalForCompute,
    actionPlanCounts,
    eveningWinsLessonsText: winsLessonsText,
    founderPersonality: profileData.founder_personality,
    postponementActionPlanCounts,
    postponementsTotalCount,
    energyReviewsTotalCount,
    duoActive,
    daysActive,
    unlockedFeatureNames,
    recentStrategicDecisionExample,
    recentTacticalDecisionExample,
    focusTimeCompleted30dCount,
    focusTimeExampleTask,
    topPostponedSystemizeTaskExample,
    duoInviteExample,
    stressEveningThenNextDecisionsExample,
  })

  if (daysActive < ARCHETYPE_FULL_MIN_DAYS) {
    const base = archetype.breakdown.totalConfidence
    const previewConfidence = Math.round(Math.min(75, Math.max(60, 60 + (base / 100) * 15)))
    const previewDescription =
      'Patterns are starting to show in your decisions, task plans, and evening reflections.'

    return {
      kind: 'preview',
      body: {
        status: 'preview',
        daysActive,
        primary: {
          name: archetype.primary.name,
          label: archetype.primary.label,
          icon: archetype.primary.icon,
          description: previewDescription,
          confidence: previewConfidence,
        },
        distribution: archetype.distribution,
        message: `Based on your first ${daysActive} days, your archetype is still emerging. Keep going and it will sharpen by day ${ARCHETYPE_FULL_MIN_DAYS}.`,
        daysUntilFull: Math.max(0, ARCHETYPE_FULL_MIN_DAYS - daysActive),
        topSignals: (archetype.breakdown.signals ?? []).slice(0, 2),
        unlockChecklist,
      },
    }
  }

  const fullPrimary = {
    ...archetype.primary,
    confidence: Math.min(100, Math.max(80, archetype.primary.confidence)),
  }
  const fullSecondary = archetype.secondary
    ? {
        ...archetype.secondary,
        confidence: Math.min(100, Math.max(70, archetype.secondary.confidence)),
      }
    : undefined

  return {
    kind: 'full',
    body: {
      status: 'full',
      primary: fullPrimary,
      secondary: fullSecondary,
      traits: archetype.traits,
      personalityProfile: archetype.personalityProfile,
      breakdown: archetype.breakdown,
      unlockChecklist,
    },
    evolutionMeta,
  }
}
