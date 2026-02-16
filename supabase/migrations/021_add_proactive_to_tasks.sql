-- Add is_proactive column to morning_tasks table
-- Tasks can be classified as Proactive (user initiated) or Reactive (response)

ALTER TABLE morning_tasks 
ADD COLUMN IF NOT EXISTS is_proactive BOOLEAN;

-- Add comment for clarity
COMMENT ON COLUMN morning_tasks.is_proactive IS 'true = Proactive (user initiated), false = Reactive (response to something)';
