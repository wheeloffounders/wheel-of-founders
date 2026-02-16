-- Add is_proactive column to morning_decisions table
-- Also ensure is_needle_mover exists (may already exist)

ALTER TABLE morning_decisions 
ADD COLUMN IF NOT EXISTS is_proactive BOOLEAN,
ADD COLUMN IF NOT EXISTS is_needle_mover BOOLEAN;

-- Add comment for clarity
COMMENT ON COLUMN morning_decisions.is_proactive IS 'true = Proactive (user initiated), false = Reactive (response to something)';
COMMENT ON COLUMN morning_decisions.is_needle_mover IS 'true = Will change trajectory, false = Maintains status quo';
