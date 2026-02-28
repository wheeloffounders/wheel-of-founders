import { getServerSupabase } from '@/lib/server-supabase'

/**
 * Get or assign a variant for a user in an experiment
 */
export async function getVariant(
  userId: string,
  experimentName: string,
  variants: string[] = ['control', 'test']
): Promise<string> {
  const db = getServerSupabase()

  const { data: expData } = await db
    .from('experiments')
    .select('id')
    .eq('name', experimentName)
    .eq('status', 'running')
    .maybeSingle()

  type ExperimentRow = { id: string }
  const exp = expData as ExperimentRow | null

  if (!exp) return variants[0] ?? 'control'

  const { data: assignmentData } = await db
    .from('experiment_assignments')
    .select('variant')
    .eq('user_id', userId)
    .eq('experiment_id', exp.id)
    .maybeSingle()

  type AssignmentRow = { variant?: string | null }
  const assignment = assignmentData as AssignmentRow | null

  if (assignment?.variant) return assignment.variant

  const variant = variants[Math.floor(Math.random() * variants.length)] ?? 'control'

  await (db.from('experiment_assignments') as any).upsert(
    {
      user_id: userId,
      experiment_id: exp.id,
      variant,
    },
    { onConflict: 'user_id,experiment_id' }
  )

  return variant
}

/**
 * Track an experiment event (server-side)
 */
export async function trackExperimentEvent(
  userId: string,
  experimentName: string,
  eventType: string,
  metadata?: Record<string, unknown>
) {
  const db = getServerSupabase()

  const { data: expData } = await db
    .from('experiments')
    .select('id')
    .eq('name', experimentName)
    .maybeSingle()

  type ExperimentRow = { id: string }
  const exp = expData as ExperimentRow | null

  if (!exp) return

  const { data: assignmentData } = await db
    .from('experiment_assignments')
    .select('variant')
    .eq('user_id', userId)
    .eq('experiment_id', exp.id)
    .maybeSingle()

  type AssignmentRow = { variant?: string | null }
  const assignment = assignmentData as AssignmentRow | null
  const variant = assignment?.variant ?? 'control'

  await (db.from('experiment_events') as any).insert({
    user_id: userId,
    experiment_id: exp.id,
    variant,
    event_type: eventType,
    metadata: metadata ?? null,
  })
}
