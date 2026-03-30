/**
 * Day N = Nth distinct calendar day on which the user has saved an evening review.
 * Shown once per N per user (localStorage), after a successful save that adds a new review date.
 */

export const EVENING_MICRO_CELEBRATION_MESSAGES: Record<number, string> = {
  1: "Day 1 complete. You're becoming someone who starts.",
  2: "Two days. You're becoming someone who shows up even when it's uncertain.",
  3: "Three days. Most founders don't make it this far. You did.",
  4: "Four days. I'm starting to see your rhythm emerging.",
  5: "Five days. Halfway to your first badge. You're building momentum.",
  6: "Six days. Tomorrow, your first weekly insight unlocks. Keep going.",
}

export function eveningMicroCelebrationStorageKey(userId: string, day: number): string {
  return `evening-micro-celebration-${userId}-evening-day-${day}`
}

export function getEveningMicroCelebrationMessage(distinctEveningDay: number): string | null {
  if (distinctEveningDay < 1 || distinctEveningDay > 6) return null
  return EVENING_MICRO_CELEBRATION_MESSAGES[distinctEveningDay] ?? null
}
