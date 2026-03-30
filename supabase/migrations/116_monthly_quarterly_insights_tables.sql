-- Persist monthly/quarterly insight rows for dashboard, batch crons, and retry jobs.

CREATE TABLE IF NOT EXISTS public.monthly_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month_start DATE NOT NULL,
  month_end DATE NOT NULL,
  insight_text TEXT,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  retry_count INT NOT NULL DEFAULT 0,
  next_retry_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'completed'
    CHECK (status IN ('pending', 'generating', 'completed', 'failed', 'permanent_failed')),
  UNIQUE (user_id, month_start)
);

CREATE INDEX IF NOT EXISTS idx_monthly_insights_user_month ON public.monthly_insights (user_id, month_start DESC);

ALTER TABLE public.monthly_insights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own monthly insights" ON public.monthly_insights;
CREATE POLICY "Users can view own monthly insights"
  ON public.monthly_insights FOR SELECT USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.quarterly_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quarter_start DATE NOT NULL,
  quarter_end DATE NOT NULL,
  insight_text TEXT,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  retry_count INT NOT NULL DEFAULT 0,
  next_retry_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'completed'
    CHECK (status IN ('pending', 'generating', 'completed', 'failed', 'permanent_failed')),
  UNIQUE (user_id, quarter_start)
);

CREATE INDEX IF NOT EXISTS idx_quarterly_insights_user_quarter ON public.quarterly_insights (user_id, quarter_start DESC);

ALTER TABLE public.quarterly_insights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own quarterly insights" ON public.quarterly_insights;
CREATE POLICY "Users can view own quarterly insights"
  ON public.quarterly_insights FOR SELECT USING (auth.uid() = user_id);

-- If tables pre-existed with fewer columns, add missing pieces.
ALTER TABLE public.monthly_insights
  ADD COLUMN IF NOT EXISTS month_end DATE,
  ADD COLUMN IF NOT EXISTS retry_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed';

ALTER TABLE public.quarterly_insights
  ADD COLUMN IF NOT EXISTS quarter_end DATE,
  ADD COLUMN IF NOT EXISTS retry_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed';
