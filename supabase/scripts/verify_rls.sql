-- Verify RLS on morning/evening/emergencies tables
-- Run in Supabase SQL Editor after applying migration 038_harden_rls_morning_evening_emergencies.sql
--
-- Part 1: Confirm policies exist (run as any role)
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE tablename IN ('morning_tasks', 'morning_decisions', 'evening_reviews', 'emergencies')
ORDER BY tablename;

-- Part 2: As authenticated user, verify row isolation
-- In Supabase Dashboard: Authentication > Users > pick a user
-- Then in SQL Editor, run:
--   SELECT * FROM morning_tasks;    -- should only show that user's rows
--   SELECT * FROM morning_decisions;
--   SELECT * FROM evening_reviews;
--   SELECT * FROM emergencies;
--
-- Part 3: Quick policy existence check (optional)
-- Uncomment and run to assert all 4 policies are present:
/*
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM pg_policies
  WHERE tablename IN ('morning_tasks', 'morning_decisions', 'evening_reviews', 'emergencies')
    AND policyname LIKE 'Users can manage own%';
  IF n < 4 THEN
    RAISE EXCEPTION 'Expected 4 user-scoped policies, found %', n;
  END IF;
  RAISE NOTICE 'RLS verification passed: all 4 tables have user-scoped policies';
END $$;
*/
