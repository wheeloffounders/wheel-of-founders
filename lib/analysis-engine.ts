import { supabase } from './supabase'
import { format, subDays, startOfWeek, endOfWeek, getDay } from 'date-fns'
import { getFeatureAccess, UserProfile } from './features'

export interface UserPatterns {
  userId: string
  dateRange: { start: string; end: string }
  taskPatterns: {
    totalTasks: number
    completedTasks: number
    completionRate: number
    byDay: Record<string, { total: number; completed: number; rate: number }>
    byActionPlan: Record<string, number>
    needleMoversRate: number
  }
  decisionPatterns: {
    total: number
    byDay: Record<string, number>
    byType: Record<string, number>
  }
  energyMoodPatterns: {
    avgMood: number | null
    avgEnergy: number | null
    avgFocusScore: number | null
    byDay: Record<string, { mood: number; energy: number; count: number }>
    correlationWithTasks: {
      highEnergyDays: number
      highEnergyTaskCompletion: number
    }
  }
  emergencyPatterns: {
    total: number
    resolved: number
    resolutionRate: number
    byDay: Record<string, number>
  }
  productivityPatterns: {
    mostProductiveDay: string | null
    mostProductiveDayRate: number
    focusScoreTrend: 'improving' | 'declining' | 'stable' | null
    avgFocusScore: number | null
  }
}

export interface GeneratedInsight {
  text: string
  type: 'productivity' | 'pattern' | 'suggestion' | 'achievement'
  dataSource: string[]
}

export interface PersonalInsight {
  text: string
  type: 'pattern' | 'archetype' | 'nudge' | 'prevention'
  isActionable: boolean
  dataBasedOn: string
}

export interface AnalysisResult {
  userId: string
  patterns: UserPatterns
  insights: GeneratedInsight[]
  personalInsights?: PersonalInsight[]
}

/**
 * Analyze a single user's data patterns
 */
export async function analyzeUserPatterns(
  userId: string,
  days: number = 30
): Promise<UserPatterns | null> {
  const endDate = new Date()
  const startDate = subDays(endDate, days)
  const startStr = format(startDate, 'yyyy-MM-dd')
  const endStr = format(endDate, 'yyyy-MM-dd')

  // Fetch all user data in parallel
  const [tasksRes, decisionsRes, reviewsRes, emergenciesRes] = await Promise.all([
    supabase
      .from('morning_tasks')
      .select('plan_date, completed, needle_mover, action_plan')
      .gte('plan_date', startStr)
      .lte('plan_date', endStr)
      .eq('user_id', userId),
    supabase
      .from('morning_decisions')
      .select('plan_date, decision_type')
      .gte('plan_date', startStr)
      .lte('plan_date', endStr)
      .eq('user_id', userId),
    supabase
      .from('evening_reviews')
      .select('review_date, mood, energy')
      .gte('review_date', startStr)
      .lte('review_date', endStr)
      .eq('user_id', userId),
    supabase
      .from('emergencies')
      .select('fire_date, resolved')
      .gte('fire_date', startStr)
      .lte('fire_date', endStr)
      .eq('user_id', userId),
  ])

  const tasks = tasksRes.data || []
  const decisions = decisionsRes.data || []
  const reviews = reviewsRes.data || []
  const emergencies = emergenciesRes.data || []

  // Task patterns
  const completedTasks = tasks.filter((t) => t.completed).length
  const totalTasks = tasks.length
  const completionRate = totalTasks > 0 ? completedTasks / totalTasks : 0

  const byDay: Record<string, { total: number; completed: number }> = {}
  const byActionPlan: Record<string, number> = {}
  let needleMovers = 0

  tasks.forEach((task) => {
    const dayName = format(new Date(task.plan_date), 'EEEE')
    if (!byDay[dayName]) {
      byDay[dayName] = { total: 0, completed: 0 }
    }
    byDay[dayName].total++
    if (task.completed) byDay[dayName].completed++

    const actionPlan = task.action_plan || 'unknown'
    byActionPlan[actionPlan] = (byActionPlan[actionPlan] || 0) + 1

    if (task.needle_mover) needleMovers++
  })

  const byDayWithRate: Record<string, { total: number; completed: number; rate: number }> = {}
  Object.keys(byDay).forEach((day) => {
    byDayWithRate[day] = {
      ...byDay[day],
      rate: byDay[day].total > 0 ? byDay[day].completed / byDay[day].total : 0,
    }
  })

  // Decision patterns
  const byDecisionDay: Record<string, number> = {}
  const byDecisionType: Record<string, number> = {}
  decisions.forEach((d) => {
    const dayName = format(new Date(d.plan_date), 'EEEE')
    byDecisionDay[dayName] = (byDecisionDay[dayName] || 0) + 1
    byDecisionType[d.decision_type] = (byDecisionType[d.decision_type] || 0) + 1
  })

  // Energy/Mood patterns
  const moods = reviews.map((r) => r.mood).filter((m): m is number => m != null)
  const energies = reviews.map((r) => r.energy).filter((e): e is number => e != null)
  const avgMood = moods.length > 0 ? moods.reduce((a, b) => a + b, 0) / moods.length : null
  const avgEnergy = energies.length > 0 ? energies.reduce((a, b) => a + b, 0) / energies.length : null

  const focusScores = reviews
    .filter((r) => r.mood && r.energy)
    .map((r) => Math.round(((r.mood! + r.energy!) / 10) * 100))
  const avgFocusScore = focusScores.length > 0 ? focusScores.reduce((a, b) => a + b, 0) / focusScores.length : null

  const byReviewDay: Record<string, { mood: number[]; energy: number[] }> = {}
  reviews.forEach((r) => {
    if (r.mood && r.energy) {
      const dayName = format(new Date(r.review_date), 'EEEE')
      if (!byReviewDay[dayName]) {
        byReviewDay[dayName] = { mood: [], energy: [] }
      }
      byReviewDay[dayName].mood.push(r.mood)
      byReviewDay[dayName].energy.push(r.energy)
    }
  })

  const byDayWithAvg: Record<string, { mood: number; energy: number; count: number }> = {}
  Object.keys(byReviewDay).forEach((day) => {
    const dayData = byReviewDay[day]
    byDayWithAvg[day] = {
      mood: dayData.mood.reduce((a, b) => a + b, 0) / dayData.mood.length,
      energy: dayData.energy.reduce((a, b) => a + b, 0) / dayData.energy.length,
      count: dayData.mood.length,
    }
  })

  // Find days with high energy and check task completion
  const highEnergyDays = Object.entries(byDayWithAvg)
    .filter(([, data]) => data.energy >= 4)
    .map(([day]) => day)
  const highEnergyTaskCompletion =
    highEnergyDays.length > 0
      ? highEnergyDays.reduce((sum, day) => {
          const dayTasks = byDayWithRate[day]
          return sum + (dayTasks ? dayTasks.rate : 0)
        }, 0) / highEnergyDays.length
      : 0

  // Emergency patterns
  const resolvedEmergencies = emergencies.filter((e) => e.resolved).length
  const resolutionRate = emergencies.length > 0 ? resolvedEmergencies / emergencies.length : 0

  const byEmergencyDay: Record<string, number> = {}
  emergencies.forEach((e) => {
    const dayName = format(new Date(e.fire_date), 'EEEE')
    byEmergencyDay[dayName] = (byEmergencyDay[dayName] || 0) + 1
  })

  // Productivity patterns
  const mostProductiveDay = Object.entries(byDayWithRate)
    .sort(([, a], [, b]) => b.rate - a.rate)[0]
  const mostProductiveDayName = mostProductiveDay ? mostProductiveDay[0] : null
  const mostProductiveDayRate = mostProductiveDay ? mostProductiveDay[1].rate : 0

  // Focus score trend (compare first half vs second half)
  const midPoint = Math.floor(focusScores.length / 2)
  const firstHalf = focusScores.slice(0, midPoint)
  const secondHalf = focusScores.slice(midPoint)
  let focusScoreTrend: 'improving' | 'declining' | 'stable' | null = null
  if (firstHalf.length > 0 && secondHalf.length > 0) {
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length
    const diff = secondAvg - firstAvg
    if (diff > 5) focusScoreTrend = 'improving'
    else if (diff < -5) focusScoreTrend = 'declining'
    else focusScoreTrend = 'stable'
  }

  return {
    userId,
    dateRange: { start: startStr, end: endStr },
    taskPatterns: {
      totalTasks,
      completedTasks,
      completionRate,
      byDay: byDayWithRate,
      byActionPlan,
      needleMoversRate: totalTasks > 0 ? needleMovers / totalTasks : 0,
    },
    decisionPatterns: {
      total: decisions.length,
      byDay: byDecisionDay,
      byType: byDecisionType,
    },
    energyMoodPatterns: {
      avgMood,
      avgEnergy,
      avgFocusScore,
      byDay: byDayWithAvg,
      correlationWithTasks: {
        highEnergyDays: highEnergyDays.length,
        highEnergyTaskCompletion,
      },
    },
    emergencyPatterns: {
      total: emergencies.length,
      resolved: resolvedEmergencies,
      resolutionRate,
      byDay: byEmergencyDay,
    },
    productivityPatterns: {
      mostProductiveDay: mostProductiveDayName,
      mostProductiveDayRate,
      focusScoreTrend,
      avgFocusScore,
    },
  }
}

/**
 * Generate human-readable insights from patterns
 */
export function generateInsights(patterns: UserPatterns): GeneratedInsight[] {
  const insights: GeneratedInsight[] = []

  // Productivity day insight
  if (patterns.productivityPatterns.mostProductiveDay && patterns.productivityPatterns.mostProductiveDayRate > 0.7) {
    const day = patterns.productivityPatterns.mostProductiveDay
    const rate = Math.round(patterns.productivityPatterns.mostProductiveDayRate * 100)
    insights.push({
      text: `You're most productive on ${day}s (${rate}% task completion). Consider scheduling your most important work then.`,
      type: 'productivity',
      dataSource: ['morning_tasks'],
    })
  }

  // Focus score trend
  if (patterns.productivityPatterns.focusScoreTrend === 'improving') {
    insights.push({
      text: `Your focus score is improving! Your mood and energy have been trending up. Keep up the great work!`,
      type: 'achievement',
      dataSource: ['evening_reviews'],
    })
  } else if (patterns.productivityPatterns.focusScoreTrend === 'declining') {
    insights.push({
      text: `Your focus score has dipped recently. Consider scheduling lighter days or taking time to recharge.`,
      type: 'suggestion',
      dataSource: ['evening_reviews'],
    })
  }

  // Energy-task correlation
  if (
    patterns.energyMoodPatterns.correlationWithTasks.highEnergyDays > 0 &&
    patterns.energyMoodPatterns.correlationWithTasks.highEnergyTaskCompletion > 0.8
  ) {
    insights.push({
      text: `Your energy peaks correlate with higher task completion. On high-energy days, you complete ${Math.round(patterns.energyMoodPatterns.correlationWithTasks.highEnergyTaskCompletion * 100)}% of tasks.`,
      type: 'pattern',
      dataSource: ['morning_tasks', 'evening_reviews'],
    })
  }

  // Action plan patterns
  const actionPlanEntries = Object.entries(patterns.taskPatterns.byActionPlan)
  if (actionPlanEntries.length > 0) {
    const mostCommon = actionPlanEntries.sort(([, a], [, b]) => b - a)[0]
    if (mostCommon[1] > patterns.taskPatterns.totalTasks * 0.4) {
      const actionName = mostCommon[0].replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())
      insights.push({
        text: `You've been focusing heavily on "${actionName}" actions (${Math.round((mostCommon[1] / patterns.taskPatterns.totalTasks) * 100)}% of tasks). This shows a clear pattern in how you're approaching your work.`,
        type: 'pattern',
        dataSource: ['morning_tasks'],
      })
    }
  }

  // Decision timing
  const decisionDays = Object.entries(patterns.decisionPatterns.byDay)
  if (decisionDays.length > 0) {
    const mostDecisionDay = decisionDays.sort(([, a], [, b]) => b - a)[0]
    if (mostDecisionDay[1] > patterns.decisionPatterns.total * 0.3) {
      insights.push({
        text: `You make most decisions on ${mostDecisionDay[0]}s. Consider blocking time for strategic thinking then.`,
        type: 'suggestion',
        dataSource: ['morning_decisions'],
      })
    }
  }

  // Emergency patterns
  if (patterns.emergencyPatterns.total > 0) {
    const emergencyDays = Object.entries(patterns.emergencyPatterns.byDay)
    if (emergencyDays.length > 0) {
      const mostEmergencyDay = emergencyDays.sort(([, a], [, b]) => b - a)[0]
      if (mostEmergencyDay[1] >= 2) {
        insights.push({
          text: `Most emergencies occur on ${mostEmergencyDay[0]}s. This might indicate a pattern worth investigating—what's different about that day?`,
          type: 'pattern',
          dataSource: ['emergencies'],
        })
      }
    }

    if (patterns.emergencyPatterns.resolutionRate < 0.5) {
      insights.push({
        text: `You're resolving ${Math.round(patterns.emergencyPatterns.resolutionRate * 100)}% of emergencies. Consider systemizing common issues to prevent them from recurring.`,
        type: 'suggestion',
        dataSource: ['emergencies'],
      })
    }
  }

  // Needle movers
  if (patterns.taskPatterns.needleMoversRate > 0.5) {
    insights.push({
      text: `You're focusing on needle movers—${Math.round(patterns.taskPatterns.needleMoversRate * 100)}% of your tasks are high-impact priorities. Excellent prioritization!`,
      type: 'achievement',
      dataSource: ['morning_tasks'],
    })
  }

  // Completion rate
  if (patterns.taskPatterns.completionRate > 0.8) {
    insights.push({
      text: `You're completing ${Math.round(patterns.taskPatterns.completionRate * 100)}% of your tasks. That's strong execution!`,
      type: 'achievement',
      dataSource: ['morning_tasks'],
    })
  } else if (patterns.taskPatterns.completionRate < 0.5 && patterns.taskPatterns.totalTasks > 5) {
    insights.push({
      text: `Your completion rate is ${Math.round(patterns.taskPatterns.completionRate * 100)}%. Consider focusing on fewer, higher-impact tasks to improve follow-through.`,
      type: 'suggestion',
      dataSource: ['morning_tasks'],
    })
  }

  return insights.slice(0, 3) // Return top 3 insights
}

/**
 * Full analysis pipeline for a user
 */
export async function analyzeUser(userId: string, userProfile: UserProfile | null): Promise<AnalysisResult | null> {
  // Check feature access
  const features = getFeatureAccess(userProfile)
  if (!features.aiInsights) {
    return null // User doesn't have access to AI insights
  }

  const patterns = await analyzeUserPatterns(userId, 14) // Use 14 days for personal insights
  if (!patterns) return null

  const insights = generateInsights(patterns)

  // Generate personal insights (smart constraints)
  const personalInsights = await generatePersonalInsights(userId, patterns)

  return {
    userId,
    patterns,
    insights,
    personalInsights, // Add personal insights to result
  }
}

/**
 * Generate personalized insights for a single user
 * Uses YOU/YOUR language, not generic statistics
 */
export async function generatePersonalInsights(
  userId: string,
  patterns: UserPatterns
): Promise<PersonalInsight[]> {
  const insights: PersonalInsight[] = []

  // Rule-based personalized insights (fallback if AI not available)
  // Pattern insights
  if (patterns.productivityPatterns.mostProductiveDay && patterns.productivityPatterns.mostProductiveDayRate > 0.6) {
    const day = patterns.productivityPatterns.mostProductiveDay
    const rate = Math.round(patterns.productivityPatterns.mostProductiveDayRate * 100)
    insights.push({
      text: `YOUR data shows that ${day}s are YOUR most productive days (${rate}% completion rate). Consider scheduling YOUR needle movers then.`,
      type: 'pattern',
      isActionable: true,
      dataBasedOn: 'Based on your last 14 days',
    })
  }

  // Energy-task correlation
  if (
    patterns.energyMoodPatterns.correlationWithTasks.highEnergyDays > 0 &&
    patterns.energyMoodPatterns.correlationWithTasks.highEnergyTaskCompletion > 0.7
  ) {
    const completionRate = Math.round(patterns.energyMoodPatterns.correlationWithTasks.highEnergyTaskCompletion * 100)
    insights.push({
      text: `When YOU have high energy days, YOUR task completion jumps to ${completionRate}%. YOUR energy peaks correlate with better execution—schedule important work when YOU feel energized.`,
      type: 'pattern',
      isActionable: true,
      dataBasedOn: 'Based on your energy and task patterns',
    })
  }

  // Action plan patterns
  const actionPlanEntries = Object.entries(patterns.taskPatterns.byActionPlan)
  if (actionPlanEntries.length > 0) {
    const mostCommon = actionPlanEntries.sort(([, a], [, b]) => b - a)[0]
    const percentage = Math.round((mostCommon[1] / patterns.taskPatterns.totalTasks) * 100)
    if (percentage > 40) {
      const actionName = mostCommon[0].replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())
      insights.push({
        text: `YOU tend to focus heavily on "${actionName}" actions (${percentage}% of YOUR tasks). This is YOUR natural pattern—embrace it and build systems around it.`,
        type: 'archetype',
        isActionable: true,
        dataBasedOn: 'Based on your action plan choices',
      })
    }
  }

  // Decision timing
  const decisionDays = Object.entries(patterns.decisionPatterns.byDay)
  if (decisionDays.length > 0) {
    const mostDecisionDay = decisionDays.sort(([, a], [, b]) => b - a)[0]
    if (mostDecisionDay[1] > patterns.decisionPatterns.total * 0.3) {
      insights.push({
        text: `YOU make most of YOUR decisions on ${mostDecisionDay[0]}s. Block time for strategic thinking then—it's when YOUR decision-making is sharpest.`,
        type: 'nudge',
        isActionable: true,
        dataBasedOn: 'Based on your decision patterns',
      })
    }
  }

  // Systemize before needle movers pattern
  const systemizeBeforeNeedleMovers = await checkSystemizePattern(userId, patterns)
  if (systemizeBeforeNeedleMovers) {
    insights.push({
      text: `When YOU systemize before tackling Needle Movers, YOUR completion rate jumps significantly. Try this tomorrow: systemize one process, then tackle YOUR needle mover.`,
      type: 'nudge',
      isActionable: true,
      dataBasedOn: 'Based on your task sequencing patterns',
    })
  }

  // Emergency prevention
  if (patterns.emergencyPatterns.total > 0) {
    const emergencyDays = Object.entries(patterns.emergencyPatterns.byDay)
    if (emergencyDays.length > 0) {
      const mostEmergencyDay = emergencyDays.sort(([, a], [, b]) => b - a)[0]
      if (mostEmergencyDay[1] >= 2) {
        insights.push({
          text: `Emergencies tend to cluster on YOUR ${mostEmergencyDay[0]}s. Consider proactive planning the day before to prevent them.`,
          type: 'prevention',
          isActionable: true,
          dataBasedOn: 'Based on your emergency patterns',
        })
      }
    }
  }

  // Try AI generation for more personalized insights
  const aiKey = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY
  if (aiKey) {
    try {
      const aiInsights = await generateAIPersonalInsights(patterns)
      insights.push(...aiInsights)
    } catch (error) {
      console.error('AI personal insight generation failed, using rule-based:', error)
    }
  }

  return insights.slice(0, 3) // Return top 3
}

/**
 * Check if user systemizes before tackling needle movers (pattern detection)
 */
async function checkSystemizePattern(userId: string, patterns: UserPatterns): Promise<boolean> {
  // This would require more detailed task sequencing data
  // For now, return false - can be enhanced later
  return false
}

/**
 * Generate AI-powered personalized insights using OpenAI or Anthropic
 */
async function generateAIPersonalInsights(patterns: UserPatterns): Promise<PersonalInsight[]> {
  const openaiKey = process.env.OPENAI_API_KEY
  const anthropicKey = process.env.ANTHROPIC_API_KEY

  const prompt = `Based on this founder's PERSONAL data from the last 14 days:

Task completion patterns:
- Total tasks: ${patterns.taskPatterns.totalTasks}
- Completed: ${patterns.taskPatterns.completedTasks} (${Math.round(patterns.taskPatterns.completionRate * 100)}%)
- Most productive day: ${patterns.productivityPatterns.mostProductiveDay || 'N/A'} (${Math.round(patterns.productivityPatterns.mostProductiveDayRate * 100)}% completion)
- Needle movers rate: ${Math.round(patterns.taskPatterns.needleMoversRate * 100)}%
- Action plan breakdown: ${Object.entries(patterns.taskPatterns.byActionPlan).map(([k, v]) => `${k}: ${v}`).join(', ')}

Decision patterns:
- Total decisions: ${patterns.decisionPatterns.total}
- Most common day: ${Object.entries(patterns.decisionPatterns.byDay).sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A'}
- Decision types: ${Object.entries(patterns.decisionPatterns.byType).map(([k, v]) => `${k}: ${v}`).join(', ')}

Energy/mood patterns:
- Average mood: ${patterns.energyMoodPatterns.avgMood?.toFixed(1) || 'N/A'}/5
- Average energy: ${patterns.energyMoodPatterns.avgEnergy?.toFixed(1) || 'N/A'}/5
- Average focus score: ${Math.round(patterns.energyMoodPatterns.avgFocusScore || 0)}/100
- High energy days: ${patterns.energyMoodPatterns.correlationWithTasks.highEnergyDays}
- Task completion on high energy days: ${Math.round(patterns.energyMoodPatterns.correlationWithTasks.highEnergyTaskCompletion * 100)}%

Emergency patterns:
- Total emergencies: ${patterns.emergencyPatterns.total}
- Resolution rate: ${Math.round(patterns.emergencyPatterns.resolutionRate * 100)}%
- Most common day: ${Object.entries(patterns.emergencyPatterns.byDay).sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A'}

Generate 3 PERSONALIZED insights in Mrs. Deer's supportive tone:
1. One pattern insight about what specifically works for THEM (use "YOU" and "YOUR")
2. One founder archetype insight about THEIR unique style (use "YOU" and "YOUR")
3. One actionable nudge for tomorrow based on THEIR history (use "YOU" and "YOUR")

CRITICAL RULES:
- Use "YOU" and "YOUR" not "founders" or "people" or "on average"
- Reference their SPECIFIC data, not averages or comparisons
- Make it feel like personalized coaching from someone who knows them
- Be supportive and encouraging, not critical
- Focus on growth and prevention
- Each insight should be 1-2 sentences max
- Format as JSON array: [{"text": "...", "type": "pattern|archetype|nudge|prevention", "isActionable": true, "dataBasedOn": "Based on your..."}]

Example good insights:
- "YOUR data shows that when YOU systemize before tackling Needle Movers, YOUR completion rate jumps from 40% to 85%"
- "As a 'Systemizer Archetype', YOU thrive when YOU batch similar tasks on Tuesday mornings"
- "Last time YOU felt 'Great' energy, YOU had completed 1 Needle Mover before 11 AM - consider doing it again tomorrow"

Example BAD insights (DO NOT GENERATE):
- "Founders who do X complete Y% more tasks" (too generic)
- "On average, people are productive at Z time" (not personalized)
- "Studies show..." (not personal)`

  if (openaiKey) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are Mrs. Deer, a supportive founder coach who knows each founder personally. Generate personalized insights using "YOU" and "YOUR" language. Never use generic statistics or comparisons to others. Make it feel like you know them.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 600,
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`)
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content
    if (!content) return []

    try {
      const parsed = JSON.parse(content)
      return parsed.map((insight: any) => ({
        text: insight.text,
        type: insight.type || 'pattern',
        isActionable: insight.isActionable !== false,
        dataBasedOn: insight.dataBasedOn || 'Based on your recent patterns',
      }))
    } catch {
      return []
    }
  }

  if (anthropicKey) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 600,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    })

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.statusText}`)
    }

    const data = await response.json()
    const content = data.content[0]?.text
    if (!content) return []

    try {
      const parsed = JSON.parse(content)
      return parsed.map((insight: any) => ({
        text: insight.text,
        type: insight.type || 'pattern',
        isActionable: insight.isActionable !== false,
        dataBasedOn: insight.dataBasedOn || 'Based on your recent patterns',
      }))
    } catch {
      return []
    }
  }

  return []
}

