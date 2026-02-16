-- Ensure personal_prompts table has all columns needed for persistence
-- This migration ensures insights are permanently stored and retrievable

-- Add prompt_date if it doesn't exist (from migration 020)
ALTER TABLE personal_prompts
ADD COLUMN IF NOT EXISTS prompt_date DATE;

-- Add generation_count if it doesn't exist (from migration 027)
ALTER TABLE personal_prompts
ADD COLUMN IF NOT EXISTS generation_count INTEGER DEFAULT 1;

-- Update existing rows
UPDATE personal_prompts
SET generation_count = 1
WHERE generation_count IS NULL;

-- For existing prompts without prompt_date, infer from generated_at
UPDATE personal_prompts
SET prompt_date = DATE(generated_at)
WHERE prompt_date IS NULL 
  AND prompt_type IN ('morning', 'post_morning', 'post_evening', 'emergency');

-- Create comprehensive indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_personal_prompts_user_type_date 
ON personal_prompts(user_id, prompt_type, prompt_date DESC, generated_at DESC);

CREATE INDEX IF NOT EXISTS idx_personal_prompts_user_date 
ON personal_prompts(user_id, prompt_date DESC, generated_at DESC);

-- Ensure RLS policies allow users to read their own prompts
-- (These should already exist, but verify)
DROP POLICY IF EXISTS "Users can view own prompts" ON personal_prompts;
CREATE POLICY "Users can view own prompts" ON personal_prompts
  FOR SELECT USING (auth.uid() = user_id);

-- Ensure users can insert their own prompts (for API routes that use service role)
-- Note: API routes typically use service role, but this ensures client-side can also insert
DROP POLICY IF EXISTS "Users can insert own prompts" ON personal_prompts;
CREATE POLICY "Users can insert own prompts" ON personal_prompts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
