-- Cleanup test data from personal_prompts
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

-- Delete test-related prompts for the specified user
DELETE FROM personal_prompts 
WHERE user_id = '9e46486f-7f99-42c5-9f15-071d8a322ebc'
AND (
  prompt_text LIKE '%test%' 
  OR prompt_text LIKE '%[TEST DEBUG]%' 
  OR prompt_text LIKE '%[SAVE DEBUG]%'
  OR prompt_text ILIKE '%debug%'
);

-- Also delete any rows with prompt_type = 'test' (if that column value exists)
DELETE FROM personal_prompts 
WHERE user_id = '9e46486f-7f99-42c5-9f15-071d8a322ebc'
AND prompt_type = 'test';

-- Verify cleanup: show remaining prompts for this user
SELECT id, prompt_type, prompt_date, LEFT(prompt_text, 80) as preview, generated_at 
FROM personal_prompts 
WHERE user_id = '9e46486f-7f99-42c5-9f15-071d8a322ebc'
ORDER BY generated_at DESC
LIMIT 10;
