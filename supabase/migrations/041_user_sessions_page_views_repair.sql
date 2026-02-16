-- Repair: ensure user_sessions exists before page_views (required FK dependency)
-- Run this if 034 partially failed or user_sessions was never created

-- 1. Create user_sessions first (required by page_views FK)
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  session_start TIMESTAMPTZ,
  session_end TIMESTAMPTZ,
  page_sequence TEXT[],
  duration_seconds INTEGER,
  completed_flow BOOLEAN
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON public.user_sessions(user_id);

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access to user_sessions" ON public.user_sessions;
CREATE POLICY "Service role full access to user_sessions"
  ON public.user_sessions FOR ALL TO service_role USING (true);

-- 2. Create page_views (depends on user_sessions)
CREATE TABLE IF NOT EXISTS public.page_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  session_id UUID REFERENCES public.user_sessions(id),
  path TEXT NOT NULL,
  entered_at TIMESTAMPTZ DEFAULT NOW(),
  exited_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_page_views_user ON public.page_views(user_id);
CREATE INDEX IF NOT EXISTS idx_page_views_entered ON public.page_views(entered_at);
CREATE INDEX IF NOT EXISTS idx_page_views_path ON public.page_views(path);

ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access to page_views" ON public.page_views;
CREATE POLICY "Service role full access to page_views"
  ON public.page_views FOR ALL TO service_role USING (true);
