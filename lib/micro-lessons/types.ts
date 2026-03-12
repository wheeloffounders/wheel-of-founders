/**
 * User situations drive which single micro-lesson we show.
 * Lower priority number = higher priority (shown first when multiple apply).
 */
export type UserSituation =
  | 'incomplete-onboarding'
  | 'new-user-first-morning'
  | 'new-user-first-evening'
  | 'morning-done-evening-pending'
  | 'evening-done-morning-pending'
  | 'full-loop-completed-first-time'
  | 'first-full-loop-complete' // alias for dashboard priority; maps to full-loop-completed-first-time lesson
  | 'missed-yesterday'
  | 'missed-multiple-days'
  | 'consistent-3-days'
  | 'consistent-7-days'
  | 'low-task-completion'
  | 'high-task-completion'
  | 'struggling-with-specific-task'
  | 'decision-without-reflection'
  | 'reflection-without-decision'
  | 'power-user'
  | 'at-risk-churn'
  | 'repeated-task-postponement'
  | 'high-weekly-postponements'
  | 'needle-mover-avoidance'
  | 'action-plan-block'

export interface MicroLessonPayload {
  message: string
  emoji?: string
  action?: {
    label: string
    link: string
  }
  priority: number
}

export interface MicroLessonContext {
  situation: UserSituation
  /** For token replacement in message (e.g. taskCount, completionRate, days) */
  tokens: Record<string, string | number>
}

export interface DetectInput {
  userId: string
  page: 'morning' | 'evening'
  today: string // yyyy-MM-dd
}

export type MicroLessonLocation = 'dashboard' | 'morning' | 'evening'
