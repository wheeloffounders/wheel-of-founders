import { getServerSupabase } from '@/lib/server-supabase'

export type FunnelStep = {
  step_name: string
  step_number: number
  users: number
  completion_rate: number
  step_conversion: number | null
}

/**
 * Record a funnel step (server-side only)
 * userId is optional for anonymous onboarding; use sessionId in metadata to correlate.
 */
export async function recordFunnelStep(
  funnelName: string,
  stepName: string,
  stepNumber: number,
  options?: { userId?: string | null; sessionId?: string | null; metadata?: Record<string, unknown> }
) {
  const db = getServerSupabase()
  const meta = {
    ...(options?.metadata ?? {}),
    ...(options?.sessionId ? { session_id: options.sessionId } : {}),
  }
  const { error } = await db.from('funnel_events').insert({
    user_id: options?.userId ?? null,
    funnel_name: funnelName,
    step_name: stepName,
    step_number: stepNumber,
    metadata: Object.keys(meta).length > 0 ? meta : null,
  })
  if (error) {
    console.error('[analytics/funnels] recordFunnelStep failed:', error)
  }
}

/**
 * Get funnel analysis for a given funnel and time range
 */
export async function getFunnelAnalysis(
  funnelName: string,
  daysBack = 30
): Promise<FunnelStep[]> {
  const db = getServerSupabase()
  const since = new Date(Date.now() - daysBack * 86400000).toISOString()

  const { data: rows } = await db
    .from('funnel_events')
    .select('step_number, step_name, user_id')
    .eq('funnel_name', funnelName)
    .gte('completed_at', since)

  if (!rows || rows.length === 0) return []

  const byStep = new Map<number, { name: string; users: Set<string> }>()
  for (const r of rows) {
    const stepNum = r.step_number ?? 0
    const stepName = r.step_name ?? `Step ${stepNum}`
    if (!byStep.has(stepNum)) byStep.set(stepNum, { name: stepName, users: new Set() })
    if (r.user_id) byStep.get(stepNum)!.users.add(r.user_id)
  }

  const arr = Array.from(byStep.entries()).sort((a, b) => a[0] - b[0])
  const firstCount = arr[0]?.[1]?.users?.size ?? 1

  return arr.map(([stepNumber, { name, users }], i) => {
    const userCount = users.size
    const prevCount = arr[i - 1]?.[1]?.users?.size ?? userCount
    return {
      step_name: name,
      step_number: stepNumber,
      users: userCount,
      completion_rate: Math.round((100 * userCount) / firstCount * 10) / 10,
      step_conversion: i === 0 ? 100 : Math.round((100 * userCount) / prevCount * 10) / 10,
    }
  })
}
