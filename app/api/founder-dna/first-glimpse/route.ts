import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'
import {
  type FirstGlimpseSourcePayload,
  generateFirstGlimpseInsight,
} from '@/lib/founder-dna/generate-first-glimpse'
import { FIRST_GLIMPSE_MIN_EVENINGS } from '@/lib/founder-dna/unlock-schedule-config'
import { LAST_REFRESH_KEYS, parseRefreshEntry, writeFeatureRefresh } from '@/lib/founder-dna/update-schedule'
import type { FirstGlimpseResponse } from '@/lib/types/founder-dna'
import type { UserProfileAccessRow } from '@/types/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function isFirstGlimpseSnapshot(s: unknown): s is FirstGlimpseResponse {
  if (!s || typeof s !== 'object') return false
  const o = s as Record<string, unknown>
  return (
    typeof o.insight === 'string' &&
    typeof o.eveningsSampled === 'number' &&
    o.firstGlimpseVersion === 1
  )
}

function snapshotIsCurrent(s: FirstGlimpseResponse): boolean {
  return s.firstGlimpseVersion === 1
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSessionFromRequest(req)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = session.user.id
    const db = getServerSupabase()

    const profileRes = await db
      .from('user_profiles')
      .select('created_at, last_refreshed')
      .eq('id', userId)
      .maybeSingle()
    if (profileRes.error) {
      return NextResponse.json({ error: 'Failed to verify access' }, { status: 403 })
    }

    const profileRow = profileRes.data as UserProfileAccessRow | null

    const { count: eveningCount, error: countErr } = await db
      .from('evening_reviews')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
    if (countErr) throw countErr
    const eveningsTotal = eveningCount ?? 0

    if (eveningsTotal < FIRST_GLIMPSE_MIN_EVENINGS) {
      return NextResponse.json(
        {
          error: 'Feature locked',
          progress: {
            eveningsCompleted: eveningsTotal,
            target: FIRST_GLIMPSE_MIN_EVENINGS,
            remaining: Math.max(0, FIRST_GLIMPSE_MIN_EVENINGS - eveningsTotal),
          },
        },
        { status: 403 },
      )
    }

    const lr = profileRow?.last_refreshed
    const { snapshot } = parseRefreshEntry(lr, LAST_REFRESH_KEYS.firstGlimpse)

    const forceRegenerate = process.env.FIRST_GLIMPSE_FORCE_REGENERATE === '1'
    const snap = isFirstGlimpseSnapshot(snapshot) ? snapshot : null
    /** One-shot after first evening (modal). No weekly refresh unless forced. */
    const willServeCache = !forceRegenerate && isFirstGlimpseSnapshot(snapshot) && snapshotIsCurrent(snapshot as FirstGlimpseResponse)

    if (willServeCache && snap) {
      return NextResponse.json({
        ...snap,
        nextUpdate: undefined,
        fromCache: true,
      })
    }

    const { data: firstEvening, error: evErr } = await db
      .from('evening_reviews')
      .select('wins, lessons, review_date')
      .eq('user_id', userId)
      .order('review_date', { ascending: true })
      .limit(1)
      .maybeSingle()
    if (evErr) throw evErr

    const eveningRow = firstEvening as { wins?: string; lessons?: string; review_date?: string } | null
    const eveningDate =
      typeof eveningRow?.review_date === 'string' ? eveningRow.review_date.slice(0, 10) : ''

    const winsText = typeof eveningRow?.wins === 'string' ? eveningRow.wins : ''
    const lessonsText = typeof eveningRow?.lessons === 'string' ? eveningRow.lessons : ''

    const [{ data: earliestTaskRow }, { data: earliestDecRow }] = await Promise.all([
      db
        .from('morning_tasks')
        .select('plan_date')
        .eq('user_id', userId)
        .order('plan_date', { ascending: true })
        .limit(1)
        .maybeSingle(),
      db
        .from('morning_decisions')
        .select('plan_date')
        .eq('user_id', userId)
        .order('plan_date', { ascending: true })
        .limit(1)
        .maybeSingle(),
    ])

    const minTaskPd = (earliestTaskRow as { plan_date?: string } | null)?.plan_date
    const minDecPd = (earliestDecRow as { plan_date?: string } | null)?.plan_date
    const dateCandidates = [eveningDate, minTaskPd, minDecPd].filter((d): d is string => !!d && d.length >= 10)
    const anchorDate = dateCandidates.length > 0 ? dateCandidates.sort()[0]! : eveningDate

    const { data: taskRows } = await db
      .from('morning_tasks')
      .select('description, task_order')
      .eq('user_id', userId)
      .eq('plan_date', anchorDate)
      .order('task_order', { ascending: true })

    const { data: decisionRows } = await db
      .from('morning_decisions')
      .select('decision, decision_type, plan_date')
      .eq('user_id', userId)
      .eq('plan_date', anchorDate)
      .order('created_at', { ascending: true })

    const taskDescriptions =
      (taskRows ?? [])
        .map((t: { description?: string }) => (typeof t.description === 'string' ? t.description.trim() : ''))
        .filter(Boolean)
        .join('\n') || '(none recorded)'

    const decisionText =
      (decisionRows ?? [])
        .map((d: { decision?: string; decision_type?: string }) => {
          const dec = typeof d.decision === 'string' ? d.decision.trim() : ''
          const ty = typeof d.decision_type === 'string' ? d.decision_type : ''
          return dec ? `${dec}${ty ? ` (${ty})` : ''}` : ''
        })
        .filter(Boolean)
        .join(' · ') || '(none recorded)'

    const source: FirstGlimpseSourcePayload = {
      taskDescriptions,
      decisionText,
      winsText,
      lessonsText,
    }

    const insight = await generateFirstGlimpseInsight(source)

    const payload: FirstGlimpseResponse = {
      insight,
      eveningsSampled: eveningsTotal,
      firstGlimpseVersion: 1,
    }

    await writeFeatureRefresh(db, userId, LAST_REFRESH_KEYS.firstGlimpse, payload)

    return NextResponse.json({
      ...payload,
      nextUpdate: undefined,
      fromCache: false,
    })
  } catch (err) {
    console.error('[founder-dna/first-glimpse] error', err)
    return NextResponse.json({ error: 'Failed to load First Glimpse' }, { status: 500 })
  }
}
