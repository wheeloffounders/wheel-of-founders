-- Client-side .upsert() on personal_prompts runs INSERT then, on conflict, UPDATE.
-- RLS had INSERT + SELECT for users but no UPDATE, so repeat saves failed with policy errors.

ALTER TABLE public.personal_prompts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can update own prompts" ON public.personal_prompts;
CREATE POLICY "Users can update own prompts" ON public.personal_prompts
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Idempotent repair (name matches migration 028)
DROP POLICY IF EXISTS "Users can insert own prompts" ON public.personal_prompts;
CREATE POLICY "Users can insert own prompts" ON public.personal_prompts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own prompts" ON public.personal_prompts;
CREATE POLICY "Users can view own prompts" ON public.personal_prompts
  FOR SELECT
  USING (auth.uid() = user_id);
