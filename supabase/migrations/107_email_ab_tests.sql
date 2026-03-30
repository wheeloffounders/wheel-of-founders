-- Phase 3A: email A/B testing foundation

CREATE TABLE IF NOT EXISTS public.email_ab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email_type TEXT NOT NULL,
  variant_a_subject TEXT NOT NULL,
  variant_b_subject TEXT NOT NULL,
  variant_a_content TEXT,
  variant_b_content TEXT,
  start_date TIMESTAMPTZ DEFAULT NOW(),
  end_date TIMESTAMPTZ,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
  winner_variant TEXT CHECK (winner_variant IN ('A', 'B')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.email_ab_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ab_test_id UUID NOT NULL REFERENCES public.email_ab_tests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  variant TEXT NOT NULL CHECK (variant IN ('A', 'B')),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (ab_test_id, user_id)
);

ALTER TABLE public.email_logs
  ADD COLUMN IF NOT EXISTS ab_test_id UUID REFERENCES public.email_ab_tests(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ab_variant TEXT CHECK (ab_variant IN ('A', 'B'));

CREATE INDEX IF NOT EXISTS idx_email_ab_tests_type_status
  ON public.email_ab_tests(email_type, status);

CREATE INDEX IF NOT EXISTS idx_email_ab_assignments_user
  ON public.email_ab_assignments(user_id);

CREATE INDEX IF NOT EXISTS idx_email_ab_assignments_test_variant
  ON public.email_ab_assignments(ab_test_id, variant);

CREATE INDEX IF NOT EXISTS idx_email_logs_ab_test_variant
  ON public.email_logs(ab_test_id, ab_variant);

