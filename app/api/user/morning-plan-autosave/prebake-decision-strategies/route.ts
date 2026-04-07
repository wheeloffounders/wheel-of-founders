import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'
import { getEffectiveUserTier, type TierProfileInput } from '@/lib/auth/tier-logic'
import {
  generateProDecisionStrategies,
  type EveningBridgeForStrategies,
} from '@/lib/morning/generate-pro-decision-strategies'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function optScale15(v: unknown): number | null {
  if (v === null || v === undefined) return null
  if (typeof v !== 'number' || !Number.isFinite(v)) return null
  const n = Math.round(v)
  if (n < 1 || n > 5) return null
  return n
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSessionFromRequest(request)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getServerSupabase()
    const { data: profileRow, error: profileError } = await db
      .from('user_profiles')
      .select('tier, created_at')
      .eq('id', session.user.id)
      .maybeSingle()

    if (profileError) {
      console.error('[prebake-decision-strategies] profile', profileError)
      return NextResponse.json({ error: 'Failed to load profile' }, { status: 500 })
    }

    const devBypass = process.env.NODE_ENV === 'development'
    if (getEffectiveUserTier(profileRow as TierProfileInput | null) !== 'pro' && !devBypass) {
      return NextResponse.json({ error: 'Pro morning required' }, { status: 403 })
    }

    let body: {
      planDate?: string
      eveningReviewDate?: string
      mood?: unknown
      energy?: unknown
      wins?: unknown
      lessons?: unknown
      journal?: unknown
    }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const planDate =
      typeof body.planDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.planDate) ? body.planDate : null
    const eveningReviewDate =
      typeof body.eveningReviewDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.eveningReviewDate)
        ? body.eveningReviewDate
        : null
    if (!planDate || !eveningReviewDate) {
      return NextResponse.json(
        { error: 'planDate and eveningReviewDate (YYYY-MM-DD) required' },
        { status: 400 }
      )
    }

    const wins = Array.isArray(body.wins) ? body.wins.filter((x): x is string => typeof x === 'string') : []
    const lessons = Array.isArray(body.lessons)
      ? body.lessons.filter((x): x is string => typeof x === 'string')
      : []
    const journal = typeof body.journal === 'string' ? body.journal : null

    const bridge: EveningBridgeForStrategies = {
      reviewDate: eveningReviewDate,
      mood: optScale15(body.mood),
      energy: optScale15(body.energy),
      wins,
      lessons,
      journal,
    }

    const strategies = await generateProDecisionStrategies(db, session.user.id, planDate, bridge)
    const prebakedAt = new Date().toISOString()

    const { data: existing, error: selErr } = await (db.from('morning_plan_autosave') as any)
      .select('tasks_json, decision_json')
      .eq('user_id', session.user.id)
      .eq('plan_date', planDate)
      .maybeSingle()

    if (selErr) {
      console.error('[prebake-decision-strategies] select', selErr)
      return NextResponse.json({ error: 'Failed to read autosave' }, { status: 500 })
    }

    const prevDecision =
      existing?.decision_json && typeof existing.decision_json === 'object'
        ? ({ ...(existing.decision_json as Record<string, unknown>) } as Record<string, unknown>)
        : {}

    const nextDecision = {
      ...prevDecision,
      decision_strategies: strategies,
      decision_strategies_prebaked_at: prebakedAt,
    }

    const tasks_json = Array.isArray(existing?.tasks_json) ? existing.tasks_json : []

    const { error: upErr } = await (db.from('morning_plan_autosave') as any).upsert(
      {
        user_id: session.user.id,
        plan_date: planDate,
        tasks_json,
        decision_json: nextDecision,
        updated_at: prebakedAt,
      },
      { onConflict: 'user_id,plan_date' }
    )

    if (upErr) {
      console.error('[prebake-decision-strategies] upsert', upErr)
      return NextResponse.json({ error: 'Failed to save strategies' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, prebakedAt, count: strategies.length })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Server error'
    console.error('[prebake-decision-strategies]', e)
    if (msg.includes('OPENROUTER') || msg.includes('API key')) {
      return NextResponse.json({ error: 'AI is not configured' }, { status: 503 })
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
