import type { UserSituation, MicroLessonPayload } from './types'
import { microLessonVariants } from './variants'

/**
 * Single micro-lesson per situation. Mrs. Deer voice: warm, wise, slightly poetic, not fluffy.
 * priority: 1 = highest (shown first when multiple situations apply).
 */
export const microLessons: Record<UserSituation, MicroLessonPayload> = {
  'incomplete-onboarding': {
    message: "A few details help Mrs. Deer reflect your journey. Complete your profile so insights feel personal.",
    emoji: '✨',
    action: { label: 'Complete profile', link: '/profile' },
    priority: 0,
  },
  'new-user-first-morning': {
    message: 'Start here — plan your first day, get your aha moment in 2 mins',
    emoji: '👋',
    action: { label: 'Plan my day', link: '/morning' },
    priority: 1,
  },
  'new-user-first-evening': {
    message: 'Start here — plan your first day, get your aha moment in 2 mins',
    emoji: '👋',
    action: { label: 'Plan my day', link: '/morning' },
    priority: 1,
  },
  'morning-done-evening-pending': {
    message: "You've gathered {{taskCount}} tasks today. Tonight we'll see what they weave into.",
    emoji: '🌙',
    priority: 2,
  },
  'evening-done-morning-pending': {
    message: "Yesterday you closed the loop. This morning: what three things deserve today's focus?",
    emoji: '🌅',
    action: { label: 'Plan my day', link: '/morning' },
    priority: 2,
  },
  'full-loop-completed-first-time': {
    message: "First full loop complete. This is where Mrs. Deer starts spotting your patterns.",
    emoji: '🎉',
    priority: 1,
  },
  'first-full-loop-complete': {
    message: "First full loop complete. This is where Mrs. Deer starts spotting your patterns.",
    emoji: '🎉',
    priority: 1,
  },
  'missed-yesterday': {
    message: "You planned yesterday but didn't reflect. Even a one-line evening note keeps the thread.",
    emoji: '🪶',
    action: { label: 'Reflect now', link: '/evening' },
    priority: 2,
  },
  'missed-multiple-days': {
    message: "It's been {{days}} days. No judgment—when you're ready, a one-minute recap is here.",
    emoji: '👋',
    action: { label: 'Show recap', link: '/dashboard' },
    priority: 1,
  },
  'consistent-3-days': {
    message: "Three days of morning and evening. That's not nothing—that's a practice taking root.",
    emoji: '🌱',
    priority: 5,
  },
  'consistent-7-days': {
    message: "Seven days of showing up. Here's what's compounding: {{personalizedInsight}}",
    emoji: '🔥',
    priority: 5,
  },
  'low-task-completion': {
    message: "You completed {{completionRate}}% of tasks yesterday. Even one task on a hard day builds momentum.",
    emoji: '💪',
    priority: 3,
  },
  'high-task-completion': {
    message: "{{completionRate}}% of yesterday's plan done. Tonight's reflection will show what that built.",
    emoji: '✨',
    priority: 4,
  },
  'struggling-with-specific-task': {
    message: "You've postponed {{taskType}} {{count}} times. What would make starting feel a little lighter?",
    emoji: '🔍',
    priority: 4,
  },
  'repeated-task-postponement': {
    message: "You've postponed \"{{taskDescription}}\" {{count}} times. What would make starting feel a little lighter?",
    emoji: '🔍',
    priority: 3,
  },
  'high-weekly-postponements': {
    message: "You've moved {{count}} tasks to tomorrow this week. Are you taking on too much, or is energy low?",
    emoji: '📊',
    priority: 4,
  },
  'needle-mover-avoidance': {
    message: "{{percentage}}% of your postponed tasks are needle movers — your most important work. What if you scheduled them for your peak hours?",
    emoji: '🎯',
    priority: 2,
  },
  'action-plan-block': {
    message: "You often postpone \"{{actionPlan}}\" tasks. What would make this type of work feel lighter?",
    emoji: '⚡',
    priority: 3,
  },
  'decision-without-reflection': {
    message: "You're naming decisions. Tonight, five minutes of reflection turns them into learning.",
    emoji: '📖',
    action: { label: 'Evening reflection', link: '/evening' },
    priority: 4,
  },
  'reflection-without-decision': {
    message: "You're reflecting—that's gold. Tomorrow morning, one clear decision will sharpen the next day.",
    emoji: '🎯',
    action: { label: 'Morning plan', link: '/morning' },
    priority: 4,
  },
  'power-user': {
    message: "You've made this a habit. Mrs. Deer is here when you need a nudge or a mirror.",
    emoji: '🦌',
    priority: 6,
  },
  'at-risk-churn': {
    message: "We noticed you stepped away. Whenever you're ready, your loop is here—no catch-up required.",
    emoji: '🌿',
    action: { label: 'Open dashboard', link: '/dashboard' },
    priority: 2,
  },
}

// Keep lesson messages in sync with variant catalog (first variant is canonical fallback).
for (const key of Object.keys(microLessons) as UserSituation[]) {
  const variants = microLessonVariants[key]
  if (Array.isArray(variants) && variants.length > 0) {
    microLessons[key].message = variants[0]
  }
}

/**
 * Replaces {{token}} in message with values from context.
 */
export function replaceTokens(
  message: string,
  tokens: Record<string, string | number>
): string {
  let out = message
  for (const [key, value] of Object.entries(tokens)) {
    out = out.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value))
  }
  // Remove any remaining unreplaced tokens (optional: or leave as-is)
  out = out.replace(/\{\{\w+\}\}/g, '')
  return out
}

/**
 * Returns the lesson payload for a situation with message tokens applied.
 */
export function getLessonForSituation(
  situation: UserSituation,
  tokens: Record<string, string | number>
): MicroLessonPayload {
  const lesson = microLessons[situation]
  const message = replaceTokens(lesson.message, tokens)
  return { ...lesson, message }
}
