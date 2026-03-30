import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'
import { computeFounderArchetype } from '@/lib/founder-archetypes'
import {
  ARCHETYPE_FULL_MIN_DAYS,
  ARCHETYPE_PREVIEW_MIN_DAYS,
} from '@/lib/founder-dna/archetype-timing'
import { insertUserUnlock } from '@/lib/unlock-helpers'
import { getDaysWithEntries } from '@/lib/founder-dna/days-with-entries'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type UnlockChecklist = {
  unlock: {
    daysActive: number
    targetDays: number
    daysRemaining: number
  }
  decisionsSignal: {
    total: number
    strategic: number
    tactical: number
    ready: boolean
  }
  taskPlansSignal: {
    totalCompletedTasks: number
    topPlan?: string | null
    ready: boolean
  }
  eveningPatternsSignal: {
    reviewsCount: number
    keywordHitsTotal: number
    ready: boolean
  }
  founderPersonalitySignal: {
    provided: boolean
    ready: boolean
  }
}

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
  const iso = dateInput.slice(0, 10) // YYYY-MM-DD
  const parts = iso.split('-')
  if (parts.length !== 3) return iso
  const monthIdx = Number(parts[1]) - 1
  const day = Number(parts[2])
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const month = MONTHS[monthIdx] ?? parts[1]
  return `${month} ${day}`
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSessionFromRequest(req)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = session.user.id
    const db = getServerSupabase()

    const profileRes = await db
      .from('user_profiles')
      .select('created_at, unlocked_features, founder_personality')
      .eq('id', userId)
      .maybeSingle()

    if (profileRes.error || !profileRes.data) {
      return NextResponse.json({ error: 'Failed to verify access' }, { status: 403 })
    }

    const profileData = profileRes.data as any
    const daysWithEntries = await getDaysWithEntries(userId, db)
    const daysActive = daysWithEntries

    let unlockedFeatures = Array.isArray(profileData?.unlocked_features)
      ? (profileData.unlocked_features as any[])
      : []

    const hasPreview = unlockedFeatures.some((f) => f?.name === 'founder_archetype')
    const hasFull = unlockedFeatures.some((f) => f?.name === 'founder_archetype_full')
    const targetDays = ARCHETYPE_PREVIEW_MIN_DAYS

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

    // Pull signals needed for both: checklist + archetype calculation.
    const [
      strategicCountRes,
      tacticalCountRes,
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
        const sinceReviewsIso = sinceReviews.toISOString()
        return db
          .from('evening_reviews')
          .select('wins, lessons')
          .eq('user_id', userId)
          .gte('created_at', sinceReviewsIso)
      })(),
      // Total evening reviews (all time) for energy-trends unlock progress
      db
        .from('evening_reviews')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId),
      // Total postponements (all time) for postponement-patterns unlock progress
      db
        .from('task_postponements')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId),
      // Recent postponement action-plan distribution (used for the risk profile)
      (async () => {
        const sincePostponements = new Date(Date.now() - 180 * 86400000)
        const sincePostponementsIso = sincePostponements.toISOString()
        return db
          .from('task_postponements')
          .select('task_id, task_description, action_plan, moved_at, moved_to_date')
          .eq('user_id', userId)
          .gte('moved_at', sincePostponementsIso)
          .order('moved_at', { ascending: false })
          .limit(500)
      })(),
      // Duo relationship presence (helps the narrative feel more personal)
      db
        .from('duo_relationships')
        .select('invited_email, invited_at')
        .eq('primary_user_id', userId)
        .eq('status', 'active')
        .limit(1),
      // Recent decision log for narrative examples
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
      // Recent evening reviews for stress + pattern examples
      (async () => {
        const sinceStress = new Date(Date.now() - 120 * 86400000)
        const sinceStressIso = sinceStress.toISOString()
        return db
          .from('evening_reviews')
          .select('review_date, wins, lessons, created_at')
          .eq('user_id', userId)
          .gte('created_at', sinceStressIso)
          .order('created_at', { ascending: false })
          .limit(100)
      })(),
    ])

    if (strategicCountRes.error) throw strategicCountRes.error
    if (tacticalCountRes.error) throw tacticalCountRes.error
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
    const totalDecisions = strategicCount + tacticalCount

    const actionPlanCounts: Record<string, number> = {}
    for (const t of tasksRes.data ?? []) {
      const plan = (t as any)?.action_plan
      if (typeof plan !== 'string' || !plan) continue
      actionPlanCounts[plan] = (actionPlanCounts[plan] ?? 0) + 1
    }
    const totalCompletedTasks = (tasksRes.data ?? []).length
    const topPlan = Object.entries(actionPlanCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

    const winsLessonsText = (reviewsRes.data ?? [])
      .map((r: any) => `${r?.wins ?? ''} ${r?.lessons ?? ''}`)
      .join('\n')
    const reviewsCount = reviewsRes.data?.length ?? 0

    const energyReviewsTotalCount = energyTotalRes.count ?? 0

    const postponementsTotalCount = postponementsTotalRes.count ?? 0

    const postponementActionPlanCounts: Record<string, number> = {}
    for (const p of postponementsRecentRes.data ?? []) {
      const plan = (p as any)?.action_plan
      if (typeof plan !== 'string' || !plan) continue
      postponementActionPlanCounts[plan] = (postponementActionPlanCounts[plan] ?? 0) + 1
    }

    const duoActive = (duoActiveRes.data ?? []).length > 0

    // Supabase query builder generics can infer `never` in this repo setup; cast defensively.
    const completedTasks: any[] = (tasksRes.data ?? []) as any[]
    const decisionsRecent: any[] = (decisionsRecentRes.data ?? []) as any[]
    const stressReviews: any[] = (stressReviewsRes.data ?? []) as any[]
    const postponementsRecent: any[] = (postponementsRecentRes.data ?? []) as any[]

    const since30 = new Date(Date.now() - 30 * 86400000)
    const since30Str = since30.toISOString().slice(0, 10)

    const focusTasks30 = completedTasks
      .filter((t: any) => t?.action_plan === 'my_zone' && typeof t?.plan_date === 'string' && t.plan_date >= since30Str)
      .sort((a: any, b: any) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())

    const focusTimeCompleted30dCount = focusTasks30.length
    const focusTimeExampleTask =
      focusTasks30[0]?.description
        ? {
            date: formatDateShort(focusTasks30[0].plan_date),
            description: String(focusTasks30[0].description || '').trim(),
          }
        : undefined

    const latestStrategicDecisionRow = decisionsRecent.find((d: any) => d?.decision_type === 'strategic')
    const latestTacticalDecisionRow = decisionsRecent.find((d: any) => d?.decision_type === 'tactical')

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

    const duoInviteExample =
      (duoActiveRes.data?.[0] as any)?.invited_email && (duoActiveRes.data?.[0] as any)?.invited_at
        ? {
            date: formatDateShort((duoActiveRes.data?.[0] as any).invited_at),
            invitedEmail: String((duoActiveRes.data?.[0] as any).invited_email || '').trim(),
          }
        : undefined

    const systemizePostponements = postponementsRecent.filter((p: any) => p?.action_plan === 'systemize' && p?.task_id)
    const fallbackPostponements = postponementsRecent.filter((p: any) => p?.task_id)
    const chosenPostponements = systemizePostponements.length > 0 ? systemizePostponements : fallbackPostponements

    const systemizeByTask = new Map<
      string,
      { taskDescription: string; movedCount: number; lastMovedAt: string; actionPlan?: string }
    >()

    for (const p of chosenPostponements as any[]) {
      const taskId = String(p.task_id)
      const taskDescription = String(p.task_description || '').trim()
      const actionPlan = typeof p.action_plan === 'string' ? p.action_plan : undefined
      const movedAt = String(p.moved_at || p.moved_to_date || '')
      const key = taskId
      const prev = systemizeByTask.get(key)
      if (!prev) {
        systemizeByTask.set(key, { taskDescription, movedCount: 1, lastMovedAt: movedAt, actionPlan })
      } else {
        const lastMovedAtMs = new Date(prev.lastMovedAt || 0).getTime()
        const curMovedAtMs = new Date(movedAt || 0).getTime()
        systemizeByTask.set(key, {
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

    let topStressReview: any | null = null
    let topStressScore = 0
    for (const r of stressReviews as any[]) {
      const text = `${r?.wins ?? ''} ${r?.lessons ?? ''}`.trim()
      if (!text) continue
      const score = countKeywordHits(text, stressKeywords)
      if (score > topStressScore) {
        topStressScore = score
        topStressReview = r
      }
    }

    const stressEveningThenNextDecisionsExample =
      topStressReview?.review_date && topStressScore > 0
        ? (() => {
            const lower = `${topStressReview?.wins ?? ''} ${topStressReview?.lessons ?? ''}`.toLowerCase()
            const keyword = stressKeywords.find((k) => lower.includes(k)) ?? 'stress'
            const reviewDateIso = String(topStressReview.review_date).slice(0, 10)
            const reviewDate = new Date(reviewDateIso)
            reviewDate.setDate(reviewDate.getDate() + 1)

            const pad = (n: number) => String(n).padStart(2, '0')
            const nextStartStr = `${reviewDate.getFullYear()}-${pad(reviewDate.getMonth() + 1)}-${pad(reviewDate.getDate())}`

            const nextDecisions = decisionsRecent
              .filter((d: any) => typeof d?.plan_date === 'string' && d.plan_date >= nextStartStr)
              .sort((a: any, b: any) => new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime())
              .slice(0, 3)

            const nextDecisionsStrategic = nextDecisions.filter((d: any) => d?.decision_type === 'strategic').length
            const nextDecisionsTactical = nextDecisions.filter((d: any) => d?.decision_type === 'tactical').length

            return {
              reviewDate: formatDateShort(topStressReview.review_date),
              keyword,
              nextDecisionsStrategic,
              nextDecisionsTactical,
              nextDecisionsTotal: nextDecisions.length,
            }
          })()
        : undefined

    const unlockedFeatureNames = unlockedFeatures.map((f) => (f as any)?.name).filter(Boolean) as string[]

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

    const unlockChecklist: UnlockChecklist = {
      unlock: {
        daysActive,
        targetDays,
        daysRemaining: Math.max(0, ARCHETYPE_PREVIEW_MIN_DAYS - daysActive),
      },
      decisionsSignal: {
        total: totalDecisions,
        strategic: strategicCount,
        tactical: tacticalCount,
        ready: totalDecisions >= 3,
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

    if (!hasFeatureAfterUnlock) {
      return NextResponse.json({ error: 'Feature locked', progress: unlockChecklist.unlock, unlockChecklist }, { status: 403 })
    }

    const archetype = computeFounderArchetype({
      strategicCount,
      tacticalCount,
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

    // Preview (21–29d): emerging pattern, 60–75% confidence, top 2 signals only.
    if (daysActive < ARCHETYPE_FULL_MIN_DAYS) {
      const base = archetype.breakdown.totalConfidence
      const previewConfidence = Math.round(Math.min(75, Math.max(60, 60 + (base / 100) * 15)))
      const previewDescription = `You're showing ${archetype.primary.label} tendencies in how you plan and reflect. Mrs. Deer will turn this into a full profile after ${ARCHETYPE_FULL_MIN_DAYS} days of signal.`

      return NextResponse.json({
        status: 'preview' as const,
        primary: {
          name: archetype.primary.name,
          label: archetype.primary.label,
          icon: archetype.primary.icon,
          description: previewDescription,
          confidence: previewConfidence,
        },
        message: 'Your founder style is emerging. Keep reflecting to strengthen the signal.',
        daysUntilFull: Math.max(0, ARCHETYPE_FULL_MIN_DAYS - daysActive),
        topSignals: (archetype.breakdown.signals ?? []).slice(0, 2),
        unlockChecklist,
      })
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

    return NextResponse.json({
      status: 'full' as const,
      primary: fullPrimary,
      secondary: fullSecondary,
      traits: archetype.traits,
      personalityProfile: archetype.personalityProfile,
      breakdown: archetype.breakdown,
      unlockChecklist,
    })
  } catch (err) {
    console.error('[founder-dna/archetype] error', err)
    return NextResponse.json({ error: 'Failed to load founder archetype' }, { status: 500 })
  }
}

