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

  const { data: exp } = await db
    .from('experiments')
    .select('id')
    .eq('name', experimentName)
    .eq('status', 'running')
    .maybeSingle()

  if (!exp) return variants[0] ?? 'control'

  const { data: assignment } = await db
    .from('experiment_assignments')
    .select('variant')
    .eq('user_id', userId)
    .eq('experiment_id', exp.id)
    .maybeSingle()

  if (assignment) return assignment.variant

  const variant = variants[Math.floor(Math.random() * variants.length)] ?? 'control'

  await db.from('experiment_assignments').upsert(
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

  const { data: exp } = await db
    .from('experiments')
    .select('id')
    .eq('name', experimentName)
    .maybeSingle()

  if (!exp) return

  const { data: assignment } = await db
    .from('experiment_assignments')
    .select('variant')
    .eq('user_id', userId)
    .eq('experiment_id', exp.id)
    .maybeSingle()

  const variant = assignment?.variant ?? 'control'

  await db.from('experiment_events').insert({
    user_id: userId,
    experiment_id: exp.id,
    variant,
    event_type: eventType,
    metadata: metadata ?? null,
  })
}
