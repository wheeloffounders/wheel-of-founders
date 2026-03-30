export type RetentionEmailType =
  | 'welcome'
  | 'morning_reminder'
  | 'evening_reminder'
  | 'first_full_loop'
  | 'weekly_insight'
  | 'monthly_insight'
  | 'quarterly_insight_first'
  | 'insights_bundle'
  | 'badge_earned'
  | 'streak_milestone'
  | 'feature_unlock'
  | 'founder_archetype_full'
  | 'inactivity_reminder'

export const ALL_RETENTION_EMAIL_TYPES: RetentionEmailType[] = [
  'welcome',
  'morning_reminder',
  'evening_reminder',
  'first_full_loop',
  'weekly_insight',
  'monthly_insight',
  'quarterly_insight_first',
  'insights_bundle',
  'badge_earned',
  'streak_milestone',
  'feature_unlock',
  'founder_archetype_full',
  'inactivity_reminder',
]

export type SendSkipReason =
  | 'feature_flag_off'
  | 'unsubscribed'
  | 'frequency_blocked'
  | 'already_sent'
  | 'condition_not_met'
  | 'no_email'
  | 'send_failed'
  /** Development: recorded by email capture instead of sending */
  | 'captured'

export function isCriticalEmailType(type: RetentionEmailType): boolean {
  return type === 'welcome' || type === 'inactivity_reminder'
}

