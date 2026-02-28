-- Ensure one insight per (user_id, prompt_type, prompt_date) to prevent duplicates and enable upsert
-- Run in Supabase SQL Editor

-- 1. Delete duplicates (keep the newest by id) for date-specific prompts
DELETE FROM personal_prompts a
USING personal_prompts b
WHERE a.id < b.id
  AND a.user_id = b.user_id
  AND a.prompt_type = b.prompt_type
  AND a.prompt_date IS NOT NULL
  AND b.prompt_date IS NOT NULL
  AND a.prompt_date = b.prompt_date;

-- 2. Add unique constraint - enables upsert via onConflict
-- Note: NULL prompt_date (weekly/monthly) allows multiple per user/type in Postgres
ALTER TABLE personal_prompts
DROP CONSTRAINT IF EXISTS unique_user_prompt_date;

ALTER TABLE personal_prompts
ADD CONSTRAINT unique_user_prompt_date UNIQUE (user_id, prompt_type, prompt_date);
