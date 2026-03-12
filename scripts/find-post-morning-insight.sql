-- Find post-morning insight for a feedback entry
-- Feedback: insight_id = 48d30c15-edd7-4200-82e7-b9f52ebf71e5, insight_type = 'post-morning'
-- User: 0fb687e9-1c89-47b5-bc21-0d354c24cda5, Date: 2026-03-07

-- 1) Daily insights (morning, post_morning, post_evening) are stored in personal_prompts,
--    NOT in personal_insights, user_insights, weekly_insights, or insight_history.
--    insight_feedback.insight_id references personal_prompts.id for daily types.

-- 2) Look up by exact id (UUID)
SELECT id, user_id, prompt_type, prompt_date, prompt_text, generated_at
FROM personal_prompts
WHERE id = '48d30c15-edd7-4200-82e7-b9f52ebf71e5';

-- 3) If no row: fallback by user + date (content for that day's post-morning)
SELECT id, user_id, prompt_type, prompt_date, prompt_text, generated_at
FROM personal_prompts
WHERE user_id = '0fb687e9-1c89-47b5-bc21-0d354c24cda5'
  AND prompt_type = 'post_morning'
  AND prompt_date = '2026-03-07'
ORDER BY generated_at DESC;

-- 4) Verify the feedback row
SELECT id, user_id, insight_id, insight_type, feedback, feedback_text, created_at
FROM insight_feedback
WHERE id = '32a9a95a-04b4-4c1c-b02b-696020d21da1';
