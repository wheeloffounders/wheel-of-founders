-- Micro-lesson personalization state
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS struggles JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS last_micro_lesson_variant TEXT;

