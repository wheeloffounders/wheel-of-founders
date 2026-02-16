import { supabase } from './supabase'
import { format, subDays } from 'date-fns'
import { detectFounderStage, FounderStage } from './stage-detection'
import { MRS_DEER_RULES } from './mrs-deer'

const ANONYMIZATION_RULES = {
  minUsers: 5, // Minimum users before sharing any pattern
  maxSpecificity: 10, // Never say "12 founders", say "many founders"
  noPersonalData: true, // Never include user IDs, emails, etc.
  aggregateOnly: true, // Only use aggregated, averaged data
  optOutAllowed: true, // Users can opt out of cross-user analysis
}

interface AnonymizedUserData {
  userId: string // Only for grouping, never exposed
  stage: FounderStage
  metrics: {
    emergencyRate: number
    systemizingRatio: number
    completionRate: number
    decisionFrequency: number
    quickWinRatio: number
    avgFocusScore: number | null
  }
}

interface StagePattern {
  insight: string
  userCount: number
  confidence: number
}

/**
 * Get anonymized data from all Pro users (last 30 days)
 */
async function getAnonymizedProUserData(): Promise<AnonymizedUserData[]> {
  const endDate = new Date()
  const startDate = subDays(endDate, 30)
  const startStr = format(startDate, 'yyyy-MM-dd')
  const endStr = format(endDate, 'yyyy-MM-dd')

  // Get all Pro users (including beta)
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('id, tier, cross_user_analysis_enabled')
    .or('tier.eq.pro,tier.eq.pro_plus,tier.eq.beta')
    .eq('cross_user_analysis_enabled', true)

  if (!profiles || profiles.length === 0) return []

  const userIds = profiles.map((p) => p.id)

  // Fetch aggregated data per user
  const userDataPromises = userIds.map(async (userId) => {
    const [tasksRes, decisionsRes, reviewsRes, emergenciesRes] = await Promise.all([
      supabase
        .from('morning_tasks')
        .select('action_plan, completed')
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
        .from('evening_reviews')
        .select('mood, energy')
        .eq('user_id', userId)
        .gte('review_date', startStr)
        .lte('review_date', endStr),
      supabase
        .from('emergencies')
        .select('fire_date')
        .eq('user_id', userId)
        .gte('fire_date', startStr)
        .lte('fire_date', endStr),
    ])

    const tasks = tasksRes.data || []
    const decisions = decisionsRes.data || []
    const reviews = reviewsRes.data || []
    const emergencies = emergenciesRes.data || []

    const totalTasks = tasks.length
    const completedTasks = tasks.filter((t) => t.completed).length
    const systemizingTasks = tasks.filter((t) => t.action_plan === 'systemize').length
    const quickWinTasks = tasks.filter((t) => t.action_plan === 'quick_win_founder').length

    const moods = reviews.map((r) => r.mood).filter((m): m is number => m != null)
    const energies = reviews.map((r) => r.energy).filter((e): e is number => e != null)
    const focusScores = reviews
      .filter((r) => r.mood && r.energy)
      .map((r) => Math.round(((r.mood! + r.energy!) / 10) * 100))
    const avgFocusScore = focusScores.length > 0 ? focusScores.reduce((a, b) => a + b, 0) / focusScores.length : null

    const stage = await detectFounderStage(userId)

    return {
      userId, // Internal only, never exposed
      stage,
      metrics: {
        emergencyRate: emergencies.length / 30,
        systemizingRatio: totalTasks > 0 ? systemizingTasks / totalTasks : 0,
        completionRate: totalTasks > 0 ? completedTasks / totalTasks : 0,
        decisionFrequency: decisions.length / 30,
        quickWinRatio: totalTasks > 0 ? quickWinTasks / totalTasks : 0,
        avgFocusScore,
      },
    }
  })

  return Promise.all(userDataPromises)
}

/**
 * Find common patterns within a stage group
 */
function findCommonPatterns(users: AnonymizedUserData[]): StagePattern[] {
  const patterns: StagePattern[] = []

  if (users.length < ANONYMIZATION_RULES.minUsers) return patterns

  // Calculate averages for this stage
  const avgCompletionRate =
    users.reduce((sum, u) => sum + u.metrics.completionRate, 0) / users.length
  const avgSystemizingRatio =
    users.reduce((sum, u) => sum + u.metrics.systemizingRatio, 0) / users.length
  const avgEmergencyRate =
    users.reduce((sum, u) => sum + u.metrics.emergencyRate, 0) / users.length
  const avgQuickWinRatio =
    users.reduce((sum, u) => sum + u.metrics.quickWinRatio, 0) / users.length

  // Generate insights based on patterns
  const stageName = users[0].stage.replace(/_/g, ' ').toLowerCase()

  if (avgSystemizingRatio > 0.4 && avgCompletionRate > 0.7) {
    patterns.push({
      insight: `Founders in ${stageName} who focus on systemizing see ${Math.round(avgCompletionRate * 100)}% task completion. Building processes creates sustainable momentum.`,
      userCount: users.length,
      confidence: 0.8,
    })
  }

  if (avgQuickWinRatio > 0.5 && avgEmergencyRate < 0.2) {
    patterns.push({
      insight: `Founders in ${stageName} who prioritize quick wins experience fewer emergencies. Small victories build protective momentum.`,
      userCount: users.length,
      confidence: 0.75,
    })
  }

  if (avgEmergencyRate > 0.5 && avgSystemizingRatio < 0.2) {
    patterns.push({
      insight: `Founders in ${stageName} are experiencing high emergency rates. Consider dedicating one day this week to systemizing your most common fire sources.`,
      userCount: users.length,
      confidence: 0.85,
    })
  }

  return patterns
}

/**
 * Generate Pro tier Smart Constraints (cross-user stage-based analysis)
 */
export async function generateProSmartConstraints(): Promise<void> {
  // Get anonymized data from all Pro users
  const allUsers = await getAnonymizedProUserData()

  if (allUsers.length < ANONYMIZATION_RULES.minUsers) {
    console.log('Not enough Pro users for cross-user analysis')
    return
  }

  // Group by founder stage
  const usersByStage: Record<FounderStage, AnonymizedUserData[]> = {
    FIRE_FIGHTING_STAGE: [],
    SYSTEM_BUILDING_STAGE: [],
    STRATEGIC_GROWTH_STAGE: [],
    MOMENTUM_BUILDING_STAGE: [],
    BALANCED_STAGE: [],
  }

  allUsers.forEach((user) => {
    usersByStage[user.stage].push(user)
  })

  // Analyze patterns WITHIN each stage group
  const insightsToStore: Array<{
    insight_text: string
    stage: string
    pattern_type: string
    user_count: number
    confidence_score: number
  }> = []

  for (const [stage, users] of Object.entries(usersByStage)) {
    if (users.length >= ANONYMIZATION_RULES.minUsers) {
      const patterns = findCommonPatterns(users)

      patterns.forEach((pattern) => {
        // Anonymize user count
        const userCountText =
          users.length >= ANONYMIZATION_RULES.maxSpecificity
            ? 'many founders'
            : `${users.length} founders`

        insightsToStore.push({
          insight_text: pattern.insight.replace(`${users.length} founders`, userCountText),
          stage,
          pattern_type: 'stage_pattern',
          user_count: users.length,
          confidence_score: pattern.confidence,
        })
      })
    }
  }

  // Store community insights
  if (insightsToStore.length > 0) {
    await supabase.from('community_insights').insert(insightsToStore)
  }
}
