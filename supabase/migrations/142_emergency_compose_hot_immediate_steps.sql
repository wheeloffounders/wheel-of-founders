-- Draft persistence for Hot "Deep breath" immediate next steps (pre–Track the disruption).
ALTER TABLE public.emergency_compose_drafts
ADD COLUMN IF NOT EXISTS hot_immediate_steps text NOT NULL DEFAULT '';
