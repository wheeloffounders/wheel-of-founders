-- RLS Audit Fixes (Priority 23)
-- Fixes identified in docs/RLS_AUDIT_REPORT.md
--
-- 1. insight_history: Add UPDATE policy for upsert operations
-- 2. community_insights: Drop overly permissive policy (USING true)
-- 3. data_exports: Add DELETE policy for user self-service

-- =============================================================================
-- 1. INSIGHT_HISTORY - Add UPDATE policy (required for upsert)
-- =============================================================================
DROP POLICY IF EXISTS "Users can update own insight history" ON insight_history;
CREATE POLICY "Users can update own insight history"
  ON insight_history
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- 2. COMMUNITY_INSIGHTS - Drop overly permissive policy (if table exists)
-- Migration 019 added "All authenticated users can view community insights"
-- with USING (true), which allows viewing inactive/expired insights.
-- Keep only "Users can view active community insights" from migration 013.
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'community_insights') THEN
    EXECUTE 'DROP POLICY IF EXISTS "All authenticated users can view community insights" ON community_insights';
  END IF;
END $$;

-- =============================================================================
-- 3. DATA_EXPORTS - Add DELETE policy (users can remove own exports)
-- =============================================================================
DROP POLICY IF EXISTS "Users can delete own exports" ON data_exports;
CREATE POLICY "Users can delete own exports"
  ON data_exports
  FOR DELETE
  USING (auth.uid() = user_id);
