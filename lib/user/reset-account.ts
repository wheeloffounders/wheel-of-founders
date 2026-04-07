/**
 * Full dev reset: tables to snapshot then delete for the authenticated user.
 * Order is FK-safe: children (e.g. task_postponements → morning_tasks) before parents.
 *
 * POST /api/user/reset-onboarding uses the service role (bypasses RLS). Client-side
 * deletes still require DELETE in policies — see migration 038 (morning/evening FOR ALL).
 */
export const FULL_RESET_BACKUP_TABLES = [
  'morning_plan_autosave',
  'emergency_compose_drafts',
  'task_postponements',
  'morning_plan_commits',
  'morning_tasks',
  'morning_decisions',
  'evening_reviews',
  'emergencies',
  'weekly_insights',
  'personal_prompts',
  'user_insights',
  'insight_history',
  'weekly_insight_selections',
  'insight_feedback',
  'weekly_insight_feedback',
  'user_unlocks',
  'weekly_insight_debug',
  'monthly_insights',
  'quarterly_insights',
] as const

export type FullResetBackupTable = (typeof FULL_RESET_BACKUP_TABLES)[number]
