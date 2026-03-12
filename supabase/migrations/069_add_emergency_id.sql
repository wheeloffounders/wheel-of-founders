-- Link emergency insights to specific emergencies so each has its own insight
-- and insights only show on the day of that emergency.

ALTER TABLE personal_prompts
ADD COLUMN IF NOT EXISTS emergency_id UUID REFERENCES emergencies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_personal_prompts_emergency_id ON personal_prompts(emergency_id);

-- Allow multiple emergency insights per date (one per emergency) while keeping
-- one-per-date for other prompt types.
ALTER TABLE personal_prompts
DROP CONSTRAINT IF EXISTS unique_user_prompt_date;

CREATE UNIQUE INDEX IF NOT EXISTS idx_personal_prompts_user_type_date_no_emergency
  ON personal_prompts (user_id, prompt_type, prompt_date)
  WHERE emergency_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_personal_prompts_emergency_id_unique
  ON personal_prompts (emergency_id)
  WHERE emergency_id IS NOT NULL;
