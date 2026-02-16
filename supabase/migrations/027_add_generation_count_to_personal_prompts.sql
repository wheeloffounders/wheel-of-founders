-- Add generation_count column to track how many times each insight has been generated
-- This allows limiting generation to 3 times per prompt_type + prompt_date combination

ALTER TABLE personal_prompts
ADD COLUMN IF NOT EXISTS generation_count INTEGER DEFAULT 1;

-- Create index for efficient lookups by user, type, and date
CREATE INDEX IF NOT EXISTS idx_personal_prompts_user_type_date 
ON personal_prompts(user_id, prompt_type, prompt_date DESC);

-- Update existing rows to have generation_count = 1
UPDATE personal_prompts
SET generation_count = 1
WHERE generation_count IS NULL;
