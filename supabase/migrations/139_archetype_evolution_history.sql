-- Quarterly archetype lineage: previous → current shifts (rolling-window re-assessment)
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS archetype_evolution_history JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.user_profiles.archetype_evolution_history IS
  'Array of { fromPrimary, toPrimary, at, periodLabel, strategicPctRolling? } — newest first.';
