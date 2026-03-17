-- Find Quarterly Trajectory Data for User
-- User ID: 9e46486f-7f99-42c5-9f15-071d8a322ebc
-- Run in Supabase SQL Editor (use service role or run as authenticated user with RLS)

-- ============================================================
-- 1. TABLE STRUCTURE & DISTINCT insight_type VALUES
-- ============================================================

-- insight_history: primary source for quarterly trajectory
-- Columns: id, user_id, insight_type, period_start, period_end, insight_text, created_at
-- insight_type CHECK: 'weekly', 'monthly', 'quarterly'
SELECT 'insight_history' AS table_name, insight_type, COUNT(*) AS cnt
FROM insight_history
GROUP BY insight_type
ORDER BY insight_type;

-- personal_insights: does NOT store quarterly (only pattern, archetype, nudge, prevention)
SELECT 'personal_insights' AS table_name, insight_type, COUNT(*) AS cnt
FROM personal_insights
GROUP BY insight_type
ORDER BY insight_type;

-- user_insights: does NOT store quarterly (only productivity, pattern, suggestion, achievement)
SELECT 'user_insights' AS table_name, insight_type, COUNT(*) AS cnt
FROM user_insights
GROUP BY insight_type
ORDER BY insight_type;

-- ============================================================
-- 2. YOUR QUARTERLY DATA - insight_history (primary source)
-- ============================================================

SELECT
  id,
  insight_type,
  period_start,
  period_end,
  created_at,
  LENGTH(insight_text) AS insight_length,
  LEFT(insight_text, 200) AS preview
FROM insight_history
WHERE user_id = '9e46486f-7f99-42c5-9f15-071d8a322ebc'
  AND insight_type = 'quarterly'
ORDER BY period_start DESC;

-- Full quarterly trajectory content (most recent)
SELECT
  period_start,
  period_end,
  insight_text
FROM insight_history
WHERE user_id = '9e46486f-7f99-42c5-9f15-071d8a322ebc'
  AND insight_type = 'quarterly'
ORDER BY period_start DESC
LIMIT 1;

-- ============================================================
-- 3. personal_prompts (also stores quarterly - prompt_type)
-- If this table exists, quarterly content is here too
-- ============================================================

SELECT
  id,
  prompt_type,
  prompt_date,
  generated_at,
  LENGTH(prompt_text) AS text_length,
  LEFT(prompt_text, 200) AS preview
FROM personal_prompts
WHERE user_id = '9e46486f-7f99-42c5-9f15-071d8a322ebc'
  AND prompt_type = 'quarterly'
ORDER BY prompt_date DESC;

-- Full quarterly content from personal_prompts (most recent)
SELECT
  prompt_date AS quarter_start,
  prompt_text
FROM personal_prompts
WHERE user_id = '9e46486f-7f99-42c5-9f15-071d8a322ebc'
  AND prompt_type = 'quarterly'
ORDER BY prompt_date DESC
LIMIT 1;

-- ============================================================
-- 4. SEARCH FOR 'quarter' OR 'trajectory' IN TEXT
-- ============================================================

-- In insight_history
SELECT id, insight_type, period_start, period_end, created_at
FROM insight_history
WHERE user_id = '9e46486f-7f99-42c5-9f15-071d8a322ebc'
  AND (
    insight_text ILIKE '%quarter%'
    OR insight_text ILIKE '%trajectory%'
  )
ORDER BY period_start DESC;

-- In personal_prompts (if exists)
SELECT id, prompt_type, prompt_date, generated_at
FROM personal_prompts
WHERE user_id = '9e46486f-7f99-42c5-9f15-071d8a322ebc'
  AND (
    prompt_text ILIKE '%quarter%'
    OR prompt_text ILIKE '%trajectory%'
  )
ORDER BY prompt_date DESC;

-- ============================================================
-- 5. MOST RECENT INSIGHTS ACROSS ALL RELEVANT TABLES
-- ============================================================

-- insight_history: last 5 entries for this user
SELECT 'insight_history' AS source, insight_type, period_start, period_end, created_at
FROM insight_history
WHERE user_id = '9e46486f-7f99-42c5-9f15-071d8a322ebc'
ORDER BY created_at DESC
LIMIT 5;
