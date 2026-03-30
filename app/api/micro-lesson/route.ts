import { NextRequest, NextResponse } from 'next/server'
import { format } from 'date-fns'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'
import { fetchDetectionState, detectUserSituation, detectHighestPrioritySituation } from '@/lib/micro-lessons/detect-user-situation'
import { getLessonForSituation, replaceTokens } from '@/lib/micro-lessons/lessons'
import { microLessonVariants } from '@/lib/micro-lessons/variants'
import { getCustomStruggleTip, getTipForStruggle } from '@/lib/micro-lessons/struggle-tips'
import {
  parseRotationMemory,
  stringifyRotationMemory,
  chooseStruggleKey,
  chooseVariantIndex,
} from '@/lib/micro-lessons/rotation'
import { detectProcrastinationPatterns } from '@/lib/pattern-detection/procrastination'
import type { UserSituation } from '@/lib/micro-lessons/types'

export const dynamic = 'force-dynamic'

const STRUGGLE_TIP_PROBABILITY = 0.2

/** GET: Returns the one micro-lesson for this user. location=dashboard uses highest-priority; morning|evening use page context. Records impression. */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const location = searchParams.get('location') as 'dashboard' | 'morning' | 'evening' | null
    const page = searchParams.get('page') as 'morning' | 'evening' | null
    const effectiveLocation = location ?? (page as 'dashboard' | 'morning' | 'evening' | null)
    if (!effectiveLocation || !['dashboard', 'morning', 'evening'].includes(effectiveLocation)) {
      return NextResponse.json({ error: 'Missing or invalid location (or page)' }, { status: 400 })
    }

    const today = format(new Date(), 'yyyy-MM-dd')
    const db = getServerSupabase()
    const state = await fetchDetectionState(db, session.user.id, today)

    // Procrastination-aware situations (global across locations)
    const procrastination = await detectProcrastinationPatterns(session.user.id, {
      days: 30,
      minCount: 2,
    })

    const candidates: { situation: UserSituation; tokens: Record<string, string | number>; priority: number }[] = []

    const topRepeated = procrastination.repeatedTasks[0]
    if (topRepeated && topRepeated.postponeCount >= 3) {
      candidates.push({
        situation: 'repeated-task-postponement',
        priority: 3,
        tokens: {
          taskDescription: topRepeated.description,
          count: topRepeated.postponeCount,
        },
      })
    }

    const recentWeek = procrastination.weeklyPostponeRate[procrastination.weeklyPostponeRate.length - 1]
    if (recentWeek && recentWeek.totalPostponed >= 5) {
      candidates.push({
        situation: 'high-weekly-postponements',
        priority: 4,
        tokens: { count: recentWeek.totalPostponed },
      })
    }

    if (procrastination.overallStats.needleMoverPostponeRate >= 70 && procrastination.overallStats.totalPostponements >= 3) {
      candidates.push({
        situation: 'needle-mover-avoidance',
        priority: 2,
        tokens: { percentage: procrastination.overallStats.needleMoverPostponeRate },
      })
    }

    const topActionPlan = procrastination.actionPlanPatterns[0]
    if (
      topActionPlan &&
      topActionPlan.actionPlan &&
      topActionPlan.percentage >= 50 &&
      procrastination.overallStats.totalPostponements >= 3
    ) {
      candidates.push({
        situation: 'action-plan-block',
        priority: 3,
        tokens: { actionPlan: topActionPlan.actionPlan },
      })
    }

    let result: { situation: UserSituation; tokens: Record<string, string | number> } | null = null
    if (candidates.length > 0) {
      // Pick highest priority (lowest number)
      candidates.sort((a, b) => a.priority - b.priority)
      const best = candidates[0]
      result = { situation: best.situation, tokens: best.tokens }
    } else {
      if (effectiveLocation === 'dashboard') {
        const hour = new Date().getHours()
        result = detectHighestPrioritySituation(state, today, { hour })
      } else {
        result = detectUserSituation(state, effectiveLocation, today)
      }
    }

    if (!result) {
      return NextResponse.json({ lesson: null })
    }

    const { data: profile } = await db
      .from('user_profiles')
      .select('struggles, struggles_other, last_micro_lesson_variant')
      .eq('id', session.user.id)
      .maybeSingle()

    const profileRow = (profile ?? {}) as {
      struggles?: unknown
      struggles_other?: string | null
      last_micro_lesson_variant?: string | null
    }

    const selectedStruggles = Array.isArray(profileRow.struggles)
      ? profileRow.struggles.filter((s): s is string => typeof s === 'string')
      : []
    const customTip = getCustomStruggleTip(profileRow.struggles_other)
    const availableStruggleKeys = selectedStruggles.filter((s) => !!getTipForStruggle(s))
    if (customTip) availableStruggleKeys.push(customTip.key)

    let rotationMemory = parseRotationMemory(profileRow.last_micro_lesson_variant)
    let chosenSituation = result.situation
    let lesson = getLessonForSituation(chosenSituation as UserSituation, result.tokens)
    let tipKind: 'state' | 'struggle' = 'state'

    if (availableStruggleKeys.length > 0 && Math.random() < STRUGGLE_TIP_PROBABILITY) {
      const strugglePick = chooseStruggleKey(rotationMemory, availableStruggleKeys)
      rotationMemory = strugglePick.nextMemory
      const chosenKey = strugglePick.key
      const struggleTip =
        chosenKey === customTip?.key ? customTip : (chosenKey ? getTipForStruggle(chosenKey) : null)
      if (struggleTip) {
        tipKind = 'struggle'
        lesson = {
          message: struggleTip.message,
          emoji: struggleTip.emoji,
          action: struggleTip.action,
          priority: 0,
        }
        chosenSituation = `struggle:${struggleTip.key}` as UserSituation
      }
    }

    if (tipKind === 'state') {
      const variants = microLessonVariants[result.situation]
      if (Array.isArray(variants) && variants.length > 0) {
        const variantPick = chooseVariantIndex(rotationMemory, result.situation, variants.length)
        rotationMemory = variantPick.nextMemory
        const variantTemplate = variants[variantPick.index]
        lesson = {
          ...lesson,
          message: replaceTokens(variantTemplate, result.tokens),
        }
        chosenSituation = `${result.situation}#${variantPick.index}` as UserSituation
      }
    }

    await (db.from('user_profiles') as any)
      .update({ last_micro_lesson_variant: stringifyRotationMemory(rotationMemory), updated_at: new Date().toISOString() })
      .eq('id', session.user.id)

    // Record impression for learning loop
    const { error: insertError } = await (db.from('micro_lesson_impressions') as any).insert({
      user_id: session.user.id,
      situation: chosenSituation,
      lesson_message: lesson.message,
      viewed_at: new Date().toISOString(),
    })
    if (insertError) {
      console.warn('[micro-lesson] Failed to record impression:', insertError.message)
    }

    return NextResponse.json({
      lesson: {
        situation: chosenSituation,
        message: lesson.message,
        emoji: lesson.emoji,
        action: lesson.action,
        kind: tipKind,
      },
    })
  } catch (err) {
    console.error('[micro-lesson] GET error:', err)
    return NextResponse.json({ error: 'Failed to get micro-lesson' }, { status: 500 })
  }
}

/** POST: Update latest impression (action_taken or completed_evening) for learning loop */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSessionFromRequest(request)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({})) as {
      action_taken?: boolean
      completed_evening?: boolean
      feedback?: {
        location?: 'dashboard' | 'morning' | 'evening'
        response?: string
        lesson_message?: string
      }
    }

    const db = getServerSupabase()
    const { data: latest } = await (db.from('micro_lesson_impressions') as any)
      .select('id')
      .eq('user_id', session.user.id)
      .order('viewed_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!latest?.id) {
      return NextResponse.json({ success: true })
    }

    const updates: { action_taken?: boolean; completed_evening?: boolean } = {}
    if (body.action_taken === true) updates.action_taken = true
    if (body.completed_evening === true) updates.completed_evening = true
    if (Object.keys(updates).length > 0) {
      await (db.from('micro_lesson_impressions') as any)
        .update(updates)
        .eq('id', latest.id)
    }

    if (body.feedback?.response && body.feedback?.lesson_message) {
      const { data: profile } = await (db.from('user_profiles') as any)
        .select('micro_lesson_feedback')
        .eq('id', session.user.id)
        .maybeSingle()

      const existingFeedback =
        profile && typeof profile.micro_lesson_feedback === 'object' && profile.micro_lesson_feedback !== null
          ? profile.micro_lesson_feedback
          : {}

      const timestamp = new Date().toISOString()
      const nextFeedback = {
        ...existingFeedback,
        last_response: {
          location: body.feedback.location ?? 'dashboard',
          response: body.feedback.response,
          lesson_message: body.feedback.lesson_message,
          responded_at: timestamp,
        },
      }

      await (db.from('user_profiles') as any)
        .update({
          micro_lesson_feedback: nextFeedback,
          updated_at: timestamp,
        })
        .eq('id', session.user.id)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[micro-lesson] POST error:', err)
    return NextResponse.json({ error: 'Failed to update impression' }, { status: 500 })
  }
}
