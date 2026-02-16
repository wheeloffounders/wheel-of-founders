-- Add 'emergency' as a valid prompt_type for personal_prompts
-- This allows storing emergency insights for historical viewing

ALTER TABLE personal_prompts
DROP CONSTRAINT IF EXISTS personal_prompts_prompt_type_check;

ALTER TABLE personal_prompts
ADD CONSTRAINT personal_prompts_prompt_type_check
CHECK (prompt_type IN ('morning', 'post_morning', 'post_evening', 'weekly', 'monthly', 'emergency'));
