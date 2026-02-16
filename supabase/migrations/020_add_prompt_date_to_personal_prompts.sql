-- Add prompt_date field to personal_prompts for date-specific prompts (morning, post_morning, post_evening)
-- Weekly and monthly prompts can have NULL prompt_date

ALTER TABLE personal_prompts
ADD COLUMN IF NOT EXISTS prompt_date DATE;

-- Create index for fast date lookups
CREATE INDEX IF NOT EXISTS idx_personal_prompts_user_date ON personal_prompts(user_id, prompt_date DESC, prompt_type);

-- For existing prompts, infer prompt_date from generated_at (approximate)
UPDATE personal_prompts
SET prompt_date = DATE(generated_at)
WHERE prompt_date IS NULL 
  AND prompt_type IN ('morning', 'post_morning', 'post_evening');
