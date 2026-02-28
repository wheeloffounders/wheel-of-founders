import { getServerSupabase } from '@/lib/server-supabase'

export type ExperimentSummary = {
  id: string
  name: string
  status: string
  variants: string[]
  assignments: Record<string, number>
  events: Record<string, Record<string, number>>
}

export type ExperimentFull = ExperimentSummary & {
  description: string | null
  start_date: string | null
  end_date: string | null
  traffic_allocation: Record<string, number>
  target_metric: string | null
  created_at: string | null
  updated_at: string | null
}

/**
 * Get experiment list and results for admin dashboard
 */
export async function getExperimentResults(): Promise<ExperimentSummary[]> {
  const db = getServerSupabase()

  const { data: experiments } = await db
    .from('experiments')
    .select('id, name, status, variants')
    .order('created_at', { ascending: false })
    .limit(20)

  type ExperimentRow = {
    id: string
    name?: string | null
    status?: string | null
    variants?: string[] | null
  }
  const expRows = (experiments as ExperimentRow[] | null) ?? []

  if (expRows.length === 0) return []

  const results: ExperimentSummary[] = []

  for (const exp of expRows) {
    const variants = (exp.variants ?? null) ?? ['control', 'test']

    const { data: assignments } = await db
      .from('experiment_assignments')
      .select('variant')
      .eq('experiment_id', exp.id)

    const assignCount: Record<string, number> = {}
    for (const v of variants) assignCount[v] = 0
    type AssignmentRow = { variant?: string | null }
    for (const a of (assignments as AssignmentRow[] | null) ?? []) {
      const v = a.variant ?? 'control'
      assignCount[v] = (assignCount[v] ?? 0) + 1
    }

    const { data: events } = await db
      .from('experiment_events')
      .select('variant, event_type')
      .eq('experiment_id', exp.id)

    const eventCount: Record<string, Record<string, number>> = {}
    type EventRow = { variant?: string | null; event_type?: string | null }
    for (const e of (events as EventRow[] | null) ?? []) {
      const v = e.variant ?? 'control'
      const t = e.event_type ?? 'unknown'
      if (!eventCount[v]) eventCount[v] = {}
      eventCount[v][t] = (eventCount[v][t] ?? 0) + 1
    }

    results.push({
      id: exp.id,
      name: exp.name ?? 'Unnamed',
      status: exp.status ?? 'draft',
      variants,
      assignments: assignCount,
      events: eventCount,
    })
  }

  return results
}

/**
 * Get full experiment records for admin UI (includes new columns)
 */
export async function getFullExperiments(): Promise<ExperimentFull[]> {
  const db = getServerSupabase()
  const { data: rows } = await db
    .from('experiments')
    .select('id, name, description, status, variants, start_date, end_date, traffic_allocation, target_metric, created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(50)

  type ExperimentFullRow = {
    id: string
    name?: string | null
    description?: string | null
    status?: string | null
    variants?: string[] | null
    start_date?: string | null
    end_date?: string | null
    traffic_allocation?: Record<string, number> | null
    target_metric?: string | null
    created_at?: string | null
    updated_at?: string | null
  }
  const fullRows = (rows as ExperimentFullRow[] | null) ?? []

  if (fullRows.length === 0) return []

  const results: ExperimentFull[] = []
  for (const exp of fullRows) {
    const variants = (exp.variants ?? null) ?? ['control', 'test']
    const { data: assignments } = await db.from('experiment_assignments').select('variant').eq('experiment_id', exp.id)
    const assignCount: Record<string, number> = {}
    for (const v of variants) assignCount[v] = 0
    type AssignmentRow = { variant?: string | null }
    for (const a of (assignments as AssignmentRow[] | null) ?? []) {
      const key = a.variant ?? 'control'
      assignCount[key] = (assignCount[key] ?? 0) + 1
    }

    const { data: events } = await db.from('experiment_events').select('variant, event_type').eq('experiment_id', exp.id)
    const eventCount: Record<string, Record<string, number>> = {}
    type EventRow = { variant?: string | null; event_type?: string | null }
    for (const e of (events as EventRow[] | null) ?? []) {
      const v = e.variant ?? 'control'
      const t = e.event_type ?? 'unknown'
      if (!eventCount[v]) eventCount[v] = {}
      eventCount[v][t] = (eventCount[v][t] ?? 0) + 1
    }

    results.push({
      id: exp.id,
      name: exp.name ?? 'Unnamed',
      status: exp.status ?? 'draft',
      variants,
      assignments: assignCount,
      events: eventCount,
      description: exp.description ?? null,
      start_date: exp.start_date ?? null,
      end_date: exp.end_date ?? null,
      traffic_allocation: (exp.traffic_allocation as Record<string, number>) ?? {},
      target_metric: exp.target_metric ?? null,
      created_at: exp.created_at ?? null,
      updated_at: exp.updated_at ?? null,
    })
  }
  return results
}

/**
 * Create a new experiment (admin only, use service role)
 */
export async function createExperiment(input: {
  name: string
  description?: string
  variants?: string[]
  traffic_allocation?: Record<string, number>
  target_metric?: string
  start_date?: string
  end_date?: string
}) {
  const db = getServerSupabase()
  const variants = input.variants ?? ['control', 'test']
  const traffic = input.traffic_allocation ?? Object.fromEntries(variants.map((v) => [v, 100 / variants.length]))

  const payload = {
    name: input.name,
    description: input.description ?? null,
    status: 'draft',
    variants,
    traffic_allocation: traffic,
    target_metric: input.target_metric ?? null,
    start_date: input.start_date ?? null,
    end_date: input.end_date ?? null,
    updated_at: new Date().toISOString(),
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase DB types omit experiments
  const { data, error } = await (db.from('experiments') as any).insert(payload as any).select().single()

  if (error) throw error
  return data
}

/**
 * Update an experiment (admin only)
 */
export async function updateExperiment(
  id: string,
  updates: Partial<{
    name: string
    description: string
    status: 'draft' | 'running' | 'completed'
    variants: string[]
    traffic_allocation: Record<string, number>
    target_metric: string
    start_date: string
    end_date: string
  }>
) {
  const db = getServerSupabase()
  const payload: Record<string, unknown> = { ...updates, updated_at: new Date().toISOString() }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase DB types omit experiments
  const { data, error } = await (db.from('experiments') as any).update(payload).eq('id', id).select().single()
  if (error) throw error
  return data
}
