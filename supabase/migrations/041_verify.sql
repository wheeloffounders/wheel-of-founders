-- Verification queries for migration 041_user_sessions_page_views_repair.sql
-- Run these after executing the repair migration to confirm everything was created correctly

-- 1. Verify tables exist
SELECT 
  table_name,
  table_schema
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('user_sessions', 'page_views')
ORDER BY table_name;

-- Expected: 2 rows (user_sessions, page_views)

-- 2. Verify table structures
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'user_sessions'
ORDER BY ordinal_position;

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'page_views'
ORDER BY ordinal_position;

-- 3. Verify foreign key constraint exists
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name = 'page_views'
  AND ccu.table_name = 'user_sessions';

-- Expected: 1 row showing page_views.session_id -> user_sessions.id

-- 4. Verify indexes exist
SELECT 
  schemaname,
  tablename,
  indexname
FROM pg_indexes 
WHERE schemaname = 'public'
  AND tablename IN ('user_sessions', 'page_views')
ORDER BY tablename, indexname;

-- Expected indexes:
-- user_sessions: idx_user_sessions_user
-- page_views: idx_page_views_user, idx_page_views_session, idx_page_views_entered, idx_page_views_path

-- 5. Verify RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('user_sessions', 'page_views');

-- Expected: rowsecurity = true for both tables

-- 6. Verify RLS policies exist
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('user_sessions', 'page_views')
ORDER BY tablename, policyname;

-- Expected: 1 policy per table ("Service role full access to ...")
