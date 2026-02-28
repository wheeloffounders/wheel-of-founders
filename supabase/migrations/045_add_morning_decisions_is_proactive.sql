-- Add is_proactive column to morning_decisions (for 30-day challenge import)
-- Safe to run: IF NOT EXISTS prevents errors if column already exists

ALTER TABLE morning_decisions 
ADD COLUMN IF NOT EXISTS is_proactive BOOLEAN DEFAULT true;

COMMENT ON COLUMN morning_decisions.is_proactive IS 'true = Proactive (user initiated), false = Reactive (response to something)';
