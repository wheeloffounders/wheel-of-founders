# Phase 2B: Personalized Smart Constraint Engine (REWRITTEN)

This is the **REWRITTEN** version of Phase 2B, focusing on **personalized insights** that feel like Mrs. Deer knows each founder personally, NOT generic community statistics.

## Key Difference from Previous Version

**OLD (Removed):** Community insights aggregated across all users
**NEW (Current):** Personal insights using "YOU/YOUR" language, based on individual user patterns

## Overview

The Personalized Smart Constraint Engine generates insights that:
- Use "YOU" and "YOUR" language (not "founders" or "on average")
- Reference the user's specific data and patterns
- Feel like personalized coaching from someone who knows them
- Are actionable and specific to their unique style

## Database Migration

Run `014_personal_insights_table.sql` in Supabase SQL Editor:

```sql
CREATE TABLE personal_insights (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  insight_text TEXT NOT NULL,
  insight_type TEXT CHECK (insight_type IN ('pattern', 'archetype', 'nudge', 'prevention')),
  is_actionable BOOLEAN DEFAULT true,
  data_based_on TEXT,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  UNIQUE(user_id, insight_text)
);
```

## Insight Types

### Pattern Insights
- "YOUR data shows that when YOU do X, Y happens"
- Example: "YOUR data shows that Tuesdays are YOUR most productive days (85% completion rate)"

### Archetype Insights
- Identifies the user's unique founder style
- Example: "As a 'Systemizer Archetype', YOU thrive when YOU batch similar tasks on Tuesday mornings"

### Nudge Insights
- Actionable suggestions for tomorrow
- Example: "Last time YOU felt 'Great' energy, YOU had completed 1 Needle Mover before 11 AM - consider doing it again tomorrow"

### Prevention Insights
- Helps prevent future issues
- Example: "When emergencies cluster on YOUR Wednesdays, it usually means Tuesday's systemizing was incomplete"

## AI Prompt Structure

The AI prompt explicitly instructs:
- Use "YOU" and "YOUR" not "founders" or "people"
- Reference their SPECIFIC data, not averages
- Make it feel like personalized coaching
- Be supportive and encouraging
- Focus on growth and prevention

## Integration

### Cron Job
The 2 AM batch analysis now:
1. Analyzes each user individually (14 days of data)
2. Generates personalized insights using `generatePersonalInsights()`
3. Saves to `personal_insights` table
4. Each insight expires after 7 days

### Dashboard Display
- `PersonalInsightsCard` component shows up to 3 insights
- Title: "Mrs. Deer's Personal Observations"
- Subtitle: "Based on your unique patterns"
- Refresh button to reload insights
- Empty state when no insights available

## Example Insights Generated

✅ **GOOD (Personalized):**
- "YOUR data shows that when YOU systemize before tackling Needle Movers, YOUR completion rate jumps from 40% to 85%"
- "YOU make most of YOUR decisions on Mondays. Block time for strategic thinking then—it's when YOUR decision-making is sharpest."
- "When YOU have high energy days, YOUR task completion jumps to 90%. YOUR energy peaks correlate with better execution."

❌ **BAD (Generic - NOT Generated):**
- "Founders who do X complete Y% more tasks" (too generic)
- "On average, people are productive at Z time" (not personalized)
- "Studies show..." (not personal)

## Privacy

- **100% personalized**: Each insight is unique to that user
- **No comparisons**: Never compares users or uses aggregated data
- **Individual patterns only**: Based solely on that user's own data
- **No community data**: Completely removed community aggregation

## Setup

1. **Run Migration**: Execute `014_personal_insights_table.sql`
2. **Set AI Key** (optional): Add `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` to `.env`
3. **Deploy**: Cron job automatically generates personal insights
4. **Test**: Wait for 2 AM run or trigger manually

## Testing

### Manual Trigger
```bash
curl -X POST http://localhost:3000/api/cron/analyze-patterns \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Verify Insights
```sql
SELECT * FROM personal_insights 
WHERE user_id = 'USER_ID' 
ORDER BY generated_at DESC;
```

### Check Language
All insights should use "YOU/YOUR" language, never "founders" or "on average".

## Troubleshooting

### No Insights Appearing
1. Check user has data in last 14 days
2. Verify migration ran successfully
3. Check cron job logs for errors
4. Ensure feature flag `aiInsights` is enabled

### Generic Language in Insights
1. Check AI prompt includes "YOU/YOUR" instructions
2. Verify rule-based fallback uses personalized language
3. Review generated insights in database

### AI Not Working
1. Check API key is set
2. Verify API quota/credits
3. Rule-based insights still work without AI

## Files Changed

- ✅ `supabase/migrations/014_personal_insights_table.sql` - New table
- ✅ `lib/analysis-engine.ts` - Personal insight generation (replaced community)
- ✅ `app/api/cron/analyze-patterns/route.ts` - Saves personal insights
- ✅ `components/PersonalInsightsCard.tsx` - New component
- ✅ `app/page.tsx` - Displays personal insights
- ❌ `components/CommunityWisdomCard.tsx` - DELETED (replaced)
- ❌ `supabase/migrations/013_community_insights_table.sql` - OLD (replaced)

## Key Implementation Details

1. **Analysis Window**: Uses 14 days (not 30) for more recent, relevant patterns
2. **Expiration**: Insights expire after 7 days (shorter than community version)
3. **Uniqueness**: `UNIQUE(user_id, insight_text)` prevents duplicates
4. **Language**: All insights use "YOU/YOUR" - enforced in prompts and code
5. **Privacy**: Zero cross-user data - completely personalized

This rewrite ensures every insight feels like Mrs. Deer knows YOU personally! 🦌✨
