-- Explicit "Save & start my day" commits per calendar day.
-- Used so days that only have tasks moved from other dates are not treated as read-only plans.

CREATE TABLE IF NOT EXISTS morning_plan_commits (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_date DATE NOT NULL,
  committed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, plan_date)
);

CREATE INDEX IF NOT EXISTS idx_morning_plan_commits_plan_date ON morning_plan_commits(plan_date);

ALTER TABLE morning_plan_commits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own morning_plan_commits"
  ON morning_plan_commits
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE morning_plan_commits IS 'Set when user saves their morning plan for plan_date; cleared when a task is moved onto that date so the day stays editable until re-saved.';

-- Backfill: days where at least one non-empty task "belongs" to that plan_date (not only moved in from another day).
INSERT INTO morning_plan_commits (user_id, plan_date, committed_at)
SELECT
  user_id,
  plan_date,
  MIN(created_at)::timestamptz
FROM morning_tasks
WHERE user_id IS NOT NULL
  AND trim(COALESCE(description, '')) <> ''
GROUP BY user_id, plan_date
HAVING bool_or(
  first_planned_date IS NULL
  OR first_planned_date = plan_date
)
ON CONFLICT (user_id, plan_date) DO UPDATE
SET committed_at = LEAST(morning_plan_commits.committed_at, EXCLUDED.committed_at);

-- Backfill: days with a saved decision (no requirement on tasks).
INSERT INTO morning_plan_commits (user_id, plan_date, committed_at)
SELECT
  user_id,
  plan_date,
  MIN(created_at)::timestamptz
FROM morning_decisions
WHERE user_id IS NOT NULL
  AND trim(COALESCE(decision, '')) <> ''
GROUP BY user_id, plan_date
ON CONFLICT (user_id, plan_date) DO UPDATE
SET committed_at = LEAST(morning_plan_commits.committed_at, EXCLUDED.committed_at);
