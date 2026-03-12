# Insight feedback and where daily insights are stored

## Where daily insights live

| Table | What it stores |
|------|----------------|
| **personal_prompts** | **Daily insights:** `morning`, `post_morning`, `post_evening`, plus `weekly`, `monthly`, `emergency`. One row per (user_id, prompt_type, prompt_date). `prompt_text` = the insight content. |
| personal_insights | Older table: pattern/archetype/nudge insights (different product feature). |
| user_insights | Productivity/pattern/suggestion/achievement insights (different feature). |
| weekly_insights | One row per user per week; weekly reflection text. |
| insight_history | Weekly/monthly/quarterly only (period_start, period_end). |

**For `insight_feedback` entries with `insight_type` in `morning`, `post-morning`, `post-evening`, or `emergency`:**  
`insight_id` is the **`personal_prompts.id`** UUID. Look up the content with:

```sql
SELECT id, prompt_type, prompt_date, prompt_text, generated_at
FROM personal_prompts
WHERE id = '<insight_id>';
```

If that row is missing (e.g. deleted or deduped by migration 053), use user + date:

```sql
SELECT id, prompt_type, prompt_date, prompt_text, generated_at
FROM personal_prompts
WHERE user_id = '<user_id>'
  AND prompt_type = 'post_morning'
  AND prompt_date = '<date>';
```

## Why the id might not be found

1. **Wrong table** – You checked `personal_insights`; daily insights are in **`personal_prompts`**.
2. **Row removed** – Migration 053 deduped `personal_prompts` by (user_id, prompt_type, prompt_date), keeping the row with the *newest* id. If the feedback referred to an older row, that row may have been deleted; the same day’s content might still exist under a different id (use the user+date query above).
3. **RLS** – If you query as a different role, RLS may hide the row. Use the service role or `auth.uid() = user_id` as the feedback user.

## Reconstructing a post-morning insight (if not in DB)

Post-morning insights are **generated at save time**, not from a static template. Inputs:

- **Tasks:** Power List (descriptions, needle_mover, action_plan).
- **Decision:** Decision log (decision, decision_type, why_this_decision).

Logic and prompt:

- **API:** `app/api/personal-coaching/stream/route.ts` (streaming).
- **Prompt:** `lib/mrs-deer-prompts.ts` → `POST_MORNING_STRUCTURE` (70–110 words; OBSERVE → VALIDATE → REFRAME → one open question).
- **Build context:** `lib/personal-coaching.ts` (e.g. `post_morning` branch, `postMorningOverride` when client sends tasks/decision).

To “reconstruct” you’d re-run the same flow (same user, same date, same tasks/decision) and generate a new insight; the exact previous text is not stored anywhere else if the `personal_prompts` row is gone.

## Script

See **`scripts/find-post-morning-insight.sql`** for ready-to-run queries for the feedback entry above (insight_id, user_id, 2026-03-07).
