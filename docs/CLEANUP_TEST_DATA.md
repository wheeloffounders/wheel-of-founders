# Cleanup Test Data & Mobile Cache

## 1. Run SQL cleanup in Supabase

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) → your project → **SQL Editor**
2. Run the script: `scripts/cleanup-test-prompts.sql`
3. Or paste and run:

```sql
-- Delete test-related prompts for your user
DELETE FROM personal_prompts 
WHERE user_id = '9e46486f-7f99-42c5-9f15-071d8a322ebc'
AND (
  prompt_text LIKE '%test%' 
  OR prompt_text LIKE '%[TEST DEBUG]%' 
  OR prompt_text LIKE '%[SAVE DEBUG]%'
  OR prompt_text ILIKE '%debug%'
);

-- Verify: show remaining prompts
SELECT id, prompt_type, prompt_date, LEFT(prompt_text, 80) as preview, generated_at 
FROM personal_prompts 
WHERE user_id = '9e46486f-7f99-42c5-9f15-071d8a322ebc'
ORDER BY generated_at DESC
LIMIT 10;
```

## 2. Clear mobile PWA cache (iOS Safari)

1. **Close the PWA completely** – swipe it away from app switcher
2. Open **Settings** → **Safari** → **Advanced** → **Website Data**
3. Search for `wheel-of-founders` or `vercel.app`
4. Delete data for **wheel-of-founders.vercel.app**
5. **Reopen the app** from the home screen

## 3. Generate a fresh insight

1. Open the morning page
2. Edit your plan (or save again)
3. The AI should generate a real insight – no more test messages

## What was fixed

- **Removed** the test insert from `lib/personal-coaching.ts` that was running on every insight generation
- **Added** cleanup SQL script for any existing test data
- The test handler in the API (`promptType: 'test'`) remains for env debugging – it does not insert anything
