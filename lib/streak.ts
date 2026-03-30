import { supabase } from './supabase'
import { calculateStreakForUser, type StreakData } from './streak-calculate'

export type { StreakData }

/**
 * Recalculate streak (browser Supabase client) and persist. Used by evening save + dashboard.
 */
export async function calculateStreak(userId: string): Promise<StreakData> {
  return calculateStreakForUser(supabase, userId)
}

export { calculateStreakForUser, computeFullLoopStreak } from './streak-calculate'

/**
 * Check if today's streak is a milestone (3, 7, 14, 30 days)
 */
export function isStreakMilestone(streak: number): boolean {
  return [3, 7, 14, 30].includes(streak)
}

/**
 * Get milestone message for streak
 */
export function getStreakMilestoneMessage(streak: number): string {
  const messages: { [key: number]: string } = {
    3: "🎉 3-day streak! You're building momentum!",
    7: '🔥 7-day streak! A full week of reflection—impressive!',
    14: '🌟 14-day streak! Two weeks strong!',
    30: "🏆 30-day streak! A full month of consistency—you're unstoppable!",
  }
  return messages[streak] || `🔥 ${streak}-day streak! Keep it going!`
}
