import { supabase } from './supabase'
import { format, subDays } from 'date-fns'
import { MRS_DEER_RULES } from './mrs-deer'

const CLUSTERING_CONFIG = {
  minClusterSize: 3, // Minimum 3 users per cluster
  similarityThreshold: 0.7, // 70% similar patterns
  lookbackDays: 14, // Analyze last 14 days
}

interface UserPatternFeatures {
  userId: string
  features: {
    taskVolume: number // Average tasks per day
    completionRate: number // Percentage of tasks completed
    needleMoverRatio: number // Percentage of tasks that are needle movers
    systemizingRatio: number // Percentage of systemizing tasks
    quickWinRatio: number // Percentage of quick win tasks
    emergencyRate: number // Emergencies per day
    morningProductivity: number // Average completion rate in morning hours
    decisionFrequency: number // Decisions per day
    proactiveDecisionRatio: number // Percentage of proactive decisions
    focusScore: number // Average mood + energy / 2
  }
  rawData: any // Store raw data for pattern analysis
}

interface Cluster {
  userIds: string[]
  commonPattern: string
  prompt: string
}

/**
 * Extract pattern features from user data
 */
function extractPatternFeatures(userData: any): UserPatternFeatures['features'] {
  const tasks = userData.tasks || []
  const decisions = userData.decisions || []
  const reviews = userData.reviews || []
  const emergencies = userData.emergencies || []

  const totalTasks = tasks.length
  const completedTasks = tasks.filter((t: any) => t.completed).length
  const needleMovers = tasks.filter((t: any) => t.needle_mover).length
  const systemizingTasks = tasks.filter((t: any) => t.action_plan === 'systemize').length
  const quickWinTasks = tasks.filter((t: any) => t.action_plan === 'quick_win_founder').length

  const proactiveDecisions = decisions.filter((d: any) => d.is_proactive === true).length
  const totalDecisions = decisions.length

  const moods = reviews.map((r: any) => r.mood).filter((m): m is number => m != null)
  const energies = reviews.map((r: any) => r.energy).filter((e): e is number => e != null)
  const focusScores = reviews
    .filter((r: any) => r.mood && r.energy)
    .map((r: any) => (r.mood + r.energy) / 2)

  const days = CLUSTERING_CONFIG.lookbackDays
  const avgFocusScore = focusScores.length > 0 ? focusScores.reduce((a, b) => a + b, 0) / focusScores.length : 5

  return {
    taskVolume: totalTasks / days,
    completionRate: totalTasks > 0 ? completedTasks / totalTasks : 0,
    needleMoverRatio: totalTasks > 0 ? needleMovers / totalTasks : 0,
    systemizingRatio: totalTasks > 0 ? systemizingTasks / totalTasks : 0,
    quickWinRatio: totalTasks > 0 ? quickWinTasks / totalTasks : 0,
    emergencyRate: emergencies.length / days,
    morningProductivity: 0.6, // Placeholder - would need time-based analysis
    decisionFrequency: totalDecisions / days,
    proactiveDecisionRatio: totalDecisions > 0 ? proactiveDecisions / totalDecisions : 0,
    focusScore: avgFocusScore,
  }
}

/**
 * Calculate similarity between two user feature sets
 */
function calculateSimilarity(features1: UserPatternFeatures['features'], features2: UserPatternFeatures['features']): number {
  // Weighted similarity calculation
  const weights = {
    taskVolume: 0.1,
    completionRate: 0.15,
    needleMoverRatio: 0.15,
    systemizingRatio: 0.15,
    quickWinRatio: 0.1,
    emergencyRate: 0.1,
    decisionFrequency: 0.1,
    proactiveDecisionRatio: 0.1,
    focusScore: 0.05,
  }

  let similarity = 0
  let totalWeight = 0

  for (const [key, weight] of Object.entries(weights)) {
    const val1 = features1[key as keyof typeof features1]
    const val2 = features2[key as keyof typeof features2]
    const diff = Math.abs(val1 - val2)
    const maxVal = Math.max(val1, val2, 1) // Avoid division by zero
    const featureSimilarity = 1 - Math.min(diff / maxVal, 1)
    similarity += featureSimilarity * weight
    totalWeight += weight
  }

  return similarity / totalWeight
}

/**
 * Cluster users by similarity
 */
function clusterBySimilarity(userFeatures: UserPatternFeatures[]): Cluster[] {
  const clusters: Cluster[] = []
  const assigned = new Set<string>()

  for (const user of userFeatures) {
    if (assigned.has(user.userId)) continue

    const cluster: UserPatternFeatures[] = [user]
    assigned.add(user.userId)

    // Find similar users
    for (const otherUser of userFeatures) {
      if (assigned.has(otherUser.userId)) continue
      if (otherUser.userId === user.userId) continue

      const similarity = calculateSimilarity(user.features, otherUser.features)
      if (similarity >= CLUSTERING_CONFIG.similarityThreshold) {
        cluster.push(otherUser)
        assigned.add(otherUser.userId)
      }
    }

    // Only create cluster if it meets minimum size
    if (cluster.length >= CLUSTERING_CONFIG.minClusterSize) {
      clusters.push({
        userIds: cluster.map((u) => u.userId),
        commonPattern: findCommonPattern(cluster),
        prompt: '', // Will be generated
      })
    }
  }

  return clusters
}

/**
 * Find common pattern description for a cluster
 */
function findCommonPattern(cluster: UserPatternFeatures[]): string {
  const avgFeatures = {
    taskVolume: 0,
    completionRate: 0,
    needleMoverRatio: 0,
    systemizingRatio: 0,
    quickWinRatio: 0,
    emergencyRate: 0,
    decisionFrequency: 0,
    proactiveDecisionRatio: 0,
    focusScore: 0,
  }

  cluster.forEach((user) => {
    Object.keys(avgFeatures).forEach((key) => {
      avgFeatures[key as keyof typeof avgFeatures] += user.features[key as keyof typeof avgFeatures]
    })
  })

  const size = cluster.length
  Object.keys(avgFeatures).forEach((key) => {
    avgFeatures[key as keyof typeof avgFeatures] /= size
  })

  // Generate pattern description
  const patterns: string[] = []

  if (avgFeatures.taskVolume > 4 && avgFeatures.completionRate < 0.6) {
    patterns.push('high task volume with lower completion rates')
  }

  if (avgFeatures.systemizingRatio > 0.4 && avgFeatures.quickWinRatio < 0.2) {
    patterns.push('strong systemizing focus but fewer quick wins')
  }

  if (avgFeatures.needleMoverRatio < 0.3) {
    patterns.push('fewer needle movers in daily planning')
  }

  if (avgFeatures.emergencyRate > 0.3) {
    patterns.push('frequent emergency handling')
  }

  if (avgFeatures.completionRate > 0.8 && avgFeatures.needleMoverRatio > 0.5) {
    patterns.push('strong execution on high-impact tasks')
  }

  return patterns.length > 0 ? patterns.join(', ') : 'balanced approach across categories'
}

/**
 * Generate prompt for a cluster pattern
 */
function generatePromptForPattern(pattern: string, clusterFeatures: UserPatternFeatures['features']): string {
  // Use Mrs. Deer tone - personalized language, never mention clustering
  let prompt = ''

  if (pattern.includes('high task volume with lower completion rates')) {
    prompt = `I notice your mornings tend to be ambitious but scattered. Consider starting with just 1 Needle Mover before 10 AM—this creates focus and momentum for the rest of your day.`
  } else if (pattern.includes('strong systemizing focus but fewer quick wins')) {
    prompt = `Your systemizing strength is clear. Try adding 1 Quick Win after lunch to maintain momentum—small victories fuel bigger systems.`
  } else if (pattern.includes('fewer needle movers in daily planning')) {
    prompt = `I see you're planning many tasks, but fewer are marked as Needle Movers. What's the ONE thing today that would change your trajectory? Start there.`
  } else if (pattern.includes('frequent emergency handling')) {
    prompt = `You're handling a lot of emergencies. Consider dedicating one morning this week to systemizing your most common fire source—prevention beats reaction.`
  } else if (pattern.includes('strong execution on high-impact tasks')) {
    prompt = `Your focus on high-impact work is paying off. Keep this momentum—what's the next Needle Mover that will compound this success?`
  } else {
    prompt = `Your balanced approach is working well. Consider what one area you'd like to deepen this week—where can you create more leverage?`
  }

  return prompt
}

/**
 * Generate generic prompt for outliers
 */
function generateGenericPrompt(features: UserPatternFeatures['features']): string {
  if (features.completionRate > 0.7 && features.needleMoverRatio > 0.4) {
    return `You're maintaining strong execution on high-impact work. What's the next strategic move that will compound this success?`
  } else if (features.emergencyRate > 0.5) {
    return `I notice you're handling many emergencies. Consider blocking one morning this week to systemize your most common fire source.`
  } else {
    return `Your patterns show a balanced approach. What's one area you'd like to strengthen this week?`
  }
}

/**
 * Get Pro user data (last 14 days)
 */
async function getProUserData(): Promise<Array<{ id: string; data: any }>> {
  const endDate = new Date()
  const startDate = subDays(endDate, CLUSTERING_CONFIG.lookbackDays)
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

  // Fetch data per user
  const userDataPromises = userIds.map(async (userId) => {
    const [tasksRes, decisionsRes, reviewsRes, emergenciesRes] = await Promise.all([
      supabase
        .from('morning_tasks')
        .select('completed, needle_mover, action_plan')
        .eq('user_id', userId)
        .gte('plan_date', startStr)
        .lte('plan_date', endStr),
      supabase
        .from('morning_decisions')
        .select('is_proactive')
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

    return {
      id: userId,
      data: {
        tasks: tasksRes.data || [],
        decisions: decisionsRes.data || [],
        reviews: reviewsRes.data || [],
        emergencies: emergenciesRes.data || [],
      },
    }
  })

  return Promise.all(userDataPromises)
}

/**
 * Generate Pro tier Smart Constraints (cluster-based personalization)
 */
export async function generateProSmartConstraints(): Promise<void> {
  // 1. Get all Pro users' data
  const allUsers = await getProUserData()

  if (allUsers.length < CLUSTERING_CONFIG.minClusterSize) {
    console.log('Not enough Pro users for clustering')
    return
  }

  // 2. Extract pattern features
  const userFeatures: UserPatternFeatures[] = allUsers.map((user) => ({
    userId: user.id,
    features: extractPatternFeatures(user.data),
    rawData: user.data,
  }))

  // 3. Cluster users by similarity
  const clusters = clusterBySimilarity(userFeatures)

  // 4. Generate prompt for each cluster
  const insightsToStore: Array<{
    user_id: string
    insight_text: string
    insight_type: string
    data_source: string
    date: string
  }> = []

  const today = format(new Date(), 'yyyy-MM-dd')
  const assignedUserIds = new Set<string>()

  for (const cluster of clusters) {
    // Get cluster features for prompt generation
    const clusterUserFeatures = userFeatures.filter((u) => cluster.userIds.includes(u.userId))
    const avgFeatures = clusterUserFeatures.reduce(
      (acc, u) => {
        Object.keys(u.features).forEach((key) => {
          acc[key as keyof typeof acc] += u.features[key as keyof typeof acc]
        })
        return acc
      },
      {
        taskVolume: 0,
        completionRate: 0,
        needleMoverRatio: 0,
        systemizingRatio: 0,
        quickWinRatio: 0,
        emergencyRate: 0,
        morningProductivity: 0,
        decisionFrequency: 0,
        proactiveDecisionRatio: 0,
        focusScore: 0,
      }
    )
    Object.keys(avgFeatures).forEach((key) => {
      avgFeatures[key as keyof typeof avgFeatures] /= clusterUserFeatures.length
    })

    const prompt = generatePromptForPattern(cluster.commonPattern, avgFeatures)

    // Store prompt for each user in cluster (same prompt, but stored individually)
    cluster.userIds.forEach((userId) => {
      assignedUserIds.add(userId)
      insightsToStore.push({
        user_id: userId,
        insight_text: prompt,
        insight_type: 'smart_constraint',
        data_source: 'cluster_pattern',
        date: today,
      })
    })
  }

  // 5. Handle outliers (no similar users found)
  const outliers = userFeatures.filter((u) => !assignedUserIds.has(u.userId))
  for (const outlier of outliers) {
    const genericPrompt = generateGenericPrompt(outlier.features)
    insightsToStore.push({
      user_id: outlier.userId,
      insight_text: genericPrompt,
      insight_type: 'smart_constraint',
      data_source: 'individual_pattern',
      date: today,
    })
  }

  // 6. Store insights (using user_insights table, not community_insights)
  if (insightsToStore.length > 0) {
    await supabase.from('user_insights').insert(insightsToStore)
  }
}
