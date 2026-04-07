/**
 * Values allowed for public.insight_feedback.feedback and POST /api/feedback/insight `feedback`.
 * insight_id column is TEXT (UUID string or other stable id from the app).
 */
export const INSIGHT_FEEDBACK_VALUES = ['helpful', 'not-helpful', 'tone-adjustment'] as const

export type InsightFeedbackValue = (typeof INSIGHT_FEEDBACK_VALUES)[number]

export const INSIGHT_FEEDBACK_HELPFUL: Extract<InsightFeedbackValue, 'helpful'> = 'helpful'

export const INSIGHT_FEEDBACK_TONE_ADJUSTMENT: Extract<InsightFeedbackValue, 'tone-adjustment'> =
  'tone-adjustment'

export function isInsightFeedbackValue(v: unknown): v is InsightFeedbackValue {
  return typeof v === 'string' && (INSIGHT_FEEDBACK_VALUES as readonly string[]).includes(v)
}
