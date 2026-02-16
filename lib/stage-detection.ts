import { supabase } from './supabase'
import { format, subDays } from 'date-fns'
import { FounderStage, StageMetrics } from './mrs-deer'

/**
 * Detect founder stage based on behavior patterns
 */
export async function detectFounderStage(userId: string): Promise<FounderStage> {
  const endDate = new Date()
  const startDate = subDays(endDate, 7) // Last week
  const startStr = format(startDate, 'yyyy-MM-dd')
  const endStr = format(endDate, 'yyyy-MM-dd')

  // Fetch user data from last week
  const [tasksRes, decisionsRes, emergenciesRes] = await Promise.all([
    supabase
      .from('morning_tasks')
      .select('action_plan, completed, needle_mover')
      .eq('user_id', userId)
      .gte('plan_date', startStr)
      .lte('plan_date', endStr),
    supabase
      .from('morning_decisions')
      .select('plan_date')
      .eq('user_id', userId)
      .gte('plan_date', startStr)
      .lte('plan_date', endStr),
    supabase
      .from('emergencies')
      .select('fire_date')
      .eq('user_id', userId)
      .gte('fire_date', startStr)
      .lte('fire_date', endStr),
  ])

  const tasks = tasksRes.data || []
  const decisions = decisionsRes.data || []
  const emergencies = emergenciesRes.data || []

  // Calculate metrics
  const totalTasks = tasks.length
  const completedTasks = tasks.filter((t) => t.completed).length
  const systemizingTasks = tasks.filter((t) => t.action_plan === 'systemize').length
  const quickWinTasks = tasks.filter((t) => t.action_plan === 'quick_win_founder').length

  const metrics: StageMetrics = {
    emergencyRate: emergencies.length / 7, // Per day
    systemizingRatio: totalTasks > 0 ? systemizingTasks / totalTasks : 0,
    completionRate: totalTasks > 0 ? completedTasks / totalTasks : 0,
    decisionFrequency: decisions.length / 7, // Per day
    quickWinRatio: totalTasks > 0 ? quickWinTasks / totalTasks : 0,
  }

  // Stage detection logic
  if (metrics.emergencyRate > 0.5 && metrics.systemizingRatio < 0.2) {
    return 'FIRE_FIGHTING_STAGE' // High emergencies, low systemizing
  } else if (metrics.systemizingRatio > 0.4 && metrics.emergencyRate < 0.3) {
    return 'SYSTEM_BUILDING_STAGE' // Building systems, fewer fires
  } else if (metrics.decisionFrequency > 2 && metrics.completionRate > 0.8) {
    return 'STRATEGIC_GROWTH_STAGE' // Strategic focus
  } else if (metrics.quickWinRatio > 0.5) {
    return 'MOMENTUM_BUILDING_STAGE' // Focus on quick wins
  }

  return 'BALANCED_STAGE'
}

/**
 * Update user's stage in database
 */
export async function updateUserStage(userId: string, stage: FounderStage): Promise<void> {
  const { data: existing } = await supabase
    .from('user_stages')
    .select('current_stage, days_in_stage')
    .eq('user_id', userId)
    .maybeSingle()

  const isStageChange = existing?.current_stage !== stage
  const daysInStage = isStageChange ? 1 : (existing?.days_in_stage || 0) + 1

  await supabase
    .from('user_stages')
    .upsert(
      {
        user_id: userId,
        current_stage: stage,
        stage_detected_at: isStageChange ? new Date().toISOString() : existing?.stage_detected_at,
        days_in_stage: daysInStage,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
}

/**
 * Get user's current stage
 */
export async function getUserStage(userId: string): Promise<FounderStage | null> {
  const { data } = await supabase
    .from('user_stages')
    .select('current_stage')
    .eq('user_id', userId)
    .maybeSingle()

  return (data?.current_stage as FounderStage) || null
}
