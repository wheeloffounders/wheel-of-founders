import type { SupabaseClient } from '@supabase/supabase-js'
import type { FlowPathStep } from '@/lib/admin/flow-path-tags'
import { pathToFlowTag } from '@/lib/admin/flow-path-tags'

const BYPASS_THRESHOLD_SEC = 5

/** Collapse repeated adjacent tags; sums `dwellSeconds` where both are numbers. */
export function collapseConsecutiveFlowSteps(steps: FlowPathStep[]): FlowPathStep[] {
  const out: FlowPathStep[] = []
  for (const s of steps) {
    if (out.length === 0 || out[out.length - 1]!.tag !== s.tag) {
      out.push({ ...s })
    } else {
      const last = out[out.length - 1]!
      const a = last.dwellSeconds
      const b = s.dwellSeconds
      let merged: number | null
      if (a != null && b != null) merged = a + b
      else if (a != null) merged = a
      else merged = b
      last.dwellSeconds = merged
      last.bypassed = merged != null && merged < BYPASS_THRESHOLD_SEC
    }
  }
  return out
}

type PvRow = { path?: string; entered_at?: string; duration_seconds?: number | null }

/**
 * Oldest → newest rows. Dwell on view i = seconds until view i+1’s `entered_at`;
 * last row uses `duration_seconds` when available.
 */
export function buildFlowPathWithDwell(rowsOldestFirst: PvRow[]): FlowPathStep[] {
  const rows = rowsOldestFirst.filter((r) => r.entered_at)
  if (rows.length === 0) return []

  const raw: FlowPathStep[] = []
  for (let i = 0; i < rows.length; i++) {
    const path = String(rows[i]?.path ?? '')
    const tag = pathToFlowTag(path)
    let dwellSeconds: number | null = null
    if (i < rows.length - 1) {
      const t0 = new Date(String(rows[i]!.entered_at)).getTime()
      const t1 = new Date(String(rows[i + 1]!.entered_at)).getTime()
      if (!Number.isNaN(t0) && !Number.isNaN(t1)) {
        dwellSeconds = Math.max(0, Math.round((t1 - t0) / 1000))
      }
    } else {
      const d = rows[i]?.duration_seconds
      if (d != null && typeof d === 'number' && Number.isFinite(d)) {
        dwellSeconds = Math.max(0, Math.round(d))
      }
    }
    const bypassed = dwellSeconds != null && dwellSeconds < BYPASS_THRESHOLD_SEC
    raw.push({ tag, dwellSeconds, bypassed })
  }

  return collapseConsecutiveFlowSteps(raw)
}

/**
 * Last N flow steps per user (`page_views`), with dwell times and bypass hints.
 */
export async function fetchRecentPathLabelsForUsers(
  db: SupabaseClient,
  userIds: string[],
  limitPerUser: number
): Promise<Map<string, FlowPathStep[]>> {
  const out = new Map<string, FlowPathStep[]>()
  for (const id of userIds) out.set(id, [])

  if (userIds.length === 0 || limitPerUser <= 0) return out

  const concurrency = 20
  for (let i = 0; i < userIds.length; i += concurrency) {
    const slice = userIds.slice(i, i + concurrency)
    const settled = await Promise.all(
      slice.map(async (userId) => {
        const fetchCap = Math.max(limitPerUser, 8)
        const { data, error } = await db
          .from('page_views')
          .select('path, entered_at, duration_seconds')
          .eq('user_id', userId)
          .order('entered_at', { ascending: false })
          .limit(fetchCap)

        if (error) throw error
        const rowsDesc = (data ?? []) as PvRow[]
        const oldestFirst = [...rowsDesc].reverse()
        const steps = buildFlowPathWithDwell(oldestFirst)
        return { userId, steps: steps.slice(-limitPerUser) }
      })
    )
    for (const { userId, steps } of settled) {
      out.set(userId, steps)
    }
  }

  return out
}

/** @deprecated Use collapseConsecutiveFlowSteps + FlowPathStep */
export function collapseConsecutiveLabels(labels: string[]): string[] {
  const out: string[] = []
  for (const L of labels) {
    if (out.length === 0 || out[out.length - 1] !== L) out.push(L)
  }
  return out
}
