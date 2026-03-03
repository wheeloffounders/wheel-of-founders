export type NotificationType =
  | 'morning_reminder'
  | 'evening_reminder'
  | 'profile_reminder'
  | 'weekly_insight'
  | 'monthly_insight'
  | 'quarterly_insight'

export interface NotificationContext {
  weekRange?: string
  month?: string
  quarter?: number
}

export const notificationMessages: Record<
  NotificationType,
  (context?: NotificationContext) => { title: string; body: string }
> = {
  morning_reminder: () => ({
    title: '☀️ Good morning!',
    body: 'Time to set your intentions for the day. What matters most today?',
  }),
  evening_reminder: () => ({
    title: '🌙 Time to reflect',
    body: 'How did your day go? Take a moment to reflect on your wins and lessons.',
  }),
  profile_reminder: () => ({
    title: '🦌 Mrs. Deer wants to know you better',
    body: 'Complete your profile for insights that truly reflect your founder journey.',
  }),
  weekly_insight: (context) => ({
    title: '📊 Weekly Insights Ready',
    body: `Your insights for ${context?.weekRange ?? 'this week'} are ready. See how your patterns are evolving.`,
  }),
  monthly_insight: (context) => ({
    title: '📈 Monthly Insights Ready',
    body: `Your ${context?.month ?? 'monthly'} insights are ready. Take a moment to see your progress.`,
  }),
  quarterly_insight: (context) => ({
    title: '🎯 Quarterly Insights Ready',
    body: `Your Q${context?.quarter ?? ''} insights are ready. Big picture time.`,
  }),
}
