import type { SupabaseClient } from '@supabase/supabase-js'

export const TEST_SIMULATION_SOURCE = 'test_simulation'

export type ClearSimulatedEntriesResult = {
  deletedTasks: number
  deletedReviews: number
  deletedCommits: number
  deletedDecisions: number
  /** True when no non-simulated diary rows remained — unlocks were cleared for a clean re-test */
  resetUnlocks: boolean
  deletedUserUnlocks: number
  clearedProfileBadgesAndFeatures: boolean
}

export async function clearSimulatedEntries(db: SupabaseClient, userId: string): Promise<ClearSimulatedEntriesResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbt = db as any

  const { data: commitRows, error: cSelErr } = await dbt
    .from('morning_plan_commits')
    .select('plan_date')
    .eq('user_id', userId)
    .eq('source', TEST_SIMULATION_SOURCE)
  if (cSelErr) throw cSelErr

  const planDates = [...new Set((commitRows ?? []).map((r: { plan_date: string }) => r.plan_date).filter(Boolean))]
  let deletedDecisions = 0
  for (const planDate of planDates) {
    const { data: before } = await dbt.from('morning_decisions').select('id').eq('user_id', userId).eq('plan_date', planDate)
    const { error: dErr } = await dbt.from('morning_decisions').delete().eq('user_id', userId).eq('plan_date', planDate)
    if (dErr) throw dErr
    deletedDecisions += before?.length ?? 0
  }

  const { data: tasksBefore } = await dbt.from('morning_tasks').select('id').eq('user_id', userId).eq('source', TEST_SIMULATION_SOURCE)
  const { error: tErr } = await dbt.from('morning_tasks').delete().eq('user_id', userId).eq('source', TEST_SIMULATION_SOURCE)
  if (tErr) throw tErr

  const { data: revBefore } = await dbt.from('evening_reviews').select('id').eq('user_id', userId).eq('source', TEST_SIMULATION_SOURCE)
  const { error: rErr } = await dbt.from('evening_reviews').delete().eq('user_id', userId).eq('source', TEST_SIMULATION_SOURCE)
  if (rErr) throw rErr

  const { data: comBefore } = await dbt.from('morning_plan_commits').select('id').eq('user_id', userId).eq('source', TEST_SIMULATION_SOURCE)
  const { error: mcErr } = await dbt.from('morning_plan_commits').delete().eq('user_id', userId).eq('source', TEST_SIMULATION_SOURCE)
  if (mcErr) throw mcErr

  const { count: morningLeft, error: mCountErr } = await dbt
    .from('morning_tasks')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
  if (mCountErr) throw mCountErr

  const { count: eveningLeft, error: eCountErr } = await dbt
    .from('evening_reviews')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
  if (eCountErr) throw eCountErr

  const noDiaryLeft = (morningLeft ?? 0) === 0 && (eveningLeft ?? 0) === 0

  let deletedUserUnlocks = 0
  let clearedProfileBadgesAndFeatures = false

  if (noDiaryLeft) {
    const { data: uuRows, error: uuSelErr } = await dbt.from('user_unlocks').select('id').eq('user_id', userId)
    if (uuSelErr) throw uuSelErr
    deletedUserUnlocks = uuRows?.length ?? 0

    const { error: uuDelErr } = await dbt.from('user_unlocks').delete().eq('user_id', userId)
    if (uuDelErr) throw uuDelErr

    const { error: profErr } = await dbt
      .from('user_profiles')
      .update({
        badges: [],
        unlocked_features: [],
        current_streak: 0,
      })
      .eq('id', userId)
    if (profErr) throw profErr
    clearedProfileBadgesAndFeatures = true
  }

  return {
    deletedTasks: tasksBefore?.length ?? 0,
    deletedReviews: revBefore?.length ?? 0,
    deletedCommits: comBefore?.length ?? 0,
    deletedDecisions,
    resetUnlocks: noDiaryLeft,
    deletedUserUnlocks,
    clearedProfileBadgesAndFeatures,
  }
}
