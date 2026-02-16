-- Harden RLS: morning_tasks, morning_decisions, evening_reviews, emergencies
-- Replace permissive "Allow all" with user-scoped policies
-- Users can only SELECT, INSERT, UPDATE, DELETE their own rows (auth.uid() = user_id)

-- =============================================================================
-- MORNING_TASKS
-- =============================================================================
DROP POLICY IF EXISTS "Allow all for morning_tasks" ON morning_tasks;
DROP POLICY IF EXISTS "Allow user to update own task completed status" ON morning_tasks;

CREATE POLICY "Users can manage own morning_tasks" ON morning_tasks
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- MORNING_DECISIONS
-- =============================================================================
DROP POLICY IF EXISTS "Allow all for morning_decisions" ON morning_decisions;

CREATE POLICY "Users can manage own morning_decisions" ON morning_decisions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- EVENING_REVIEWS
-- =============================================================================
DROP POLICY IF EXISTS "Allow all for evening_reviews" ON evening_reviews;

CREATE POLICY "Users can manage own evening_reviews" ON evening_reviews
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- EMERGENCIES
-- =============================================================================
DROP POLICY IF EXISTS "Allow all for emergencies" ON emergencies;

CREATE POLICY "Users can manage own emergencies" ON emergencies
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
