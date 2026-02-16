# Phase 2B: Smart Constraint Engine Setup

This document explains the Community Insights (Smart Constraint Engine) feature that analyzes patterns across all users and generates AI-powered insights.

## Overview

The Smart Constraint Engine runs **after** individual user analysis in the 2 AM batch job. It:
1. Analyzes anonymized, aggregated patterns across all users
2. Identifies what high-performing founders do differently
3. Generates actionable "smart constraints" using AI (or rule-based fallback)
4. Displays insights on the Dashboard as "Community Wisdom"

## Privacy & Ethics

✅ **Fully anonymized**: Only aggregated data is used
✅ **Minimum threshold**: Requires 10+ active users before generating insights
✅ **No individual exposure**: Never exposes individual user data
✅ **Opt-out available**: Users can disable in Settings
✅ **Data source transparency**: Shows "Patterns from X+ founders"

## Setup Steps

### 1. Run Database Migration

Execute in Supabase SQL Editor:
```sql
supabase/migrations/013_community_insights_table.sql
```

This creates:
- `community_insights` table - stores generated community insights
- Adds `community_insights_enabled` column to `user_profiles`

### 2. Set AI API Key (Optional)

For enhanced AI-generated insights, add one of:
```bash
OPENAI_API_KEY=your_openai_api_key
# OR
ANTHROPIC_API_KEY=your_anthropic_api_key
```

**Note**: If no AI key is set, the system uses rule-based insights (still valuable!)

### 3. Deploy

The cron job automatically includes community analysis. No additional setup needed.

## How It Works

### Analysis Process

1. **Individual Analysis** (Phase 2): Each user's patterns analyzed
2. **Community Analysis** (Phase 2B): After all users processed:
   - Aggregates patterns across all users
   - Identifies high-focus-score users
   - Analyzes what they do differently
   - Generates smart constraints

### Insight Categories

- **Productivity**: Task completion patterns, peak times
- **Focus**: What high-focus-score founders prioritize
- **Decision**: Decision-making patterns and timing
- **Prevention**: Emergency prevention strategies
- **Pattern**: Behavioral patterns across founders

### Example Insights Generated

- "Founders who schedule 1+ Needle Mover before lunch complete 60% more tasks"
- "Founders with high focus scores prioritize 'Systemize' actions"
- "The most effective founders review their decisions on Mondays"
- "Systemizing on Monday mornings reduces Tuesday emergencies"

## Display on Dashboard

The `CommunityWisdomCard` component shows:
- Latest active community insight
- Category icon (⚡🎯🧠🛡️📊)
- Data source: "Patterns from X+ founders"
- Privacy disclaimer (click info icon)

## User Controls

### Settings Page

Users can toggle community insights:
- **Enabled** (default): See community wisdom on Dashboard
- **Disabled**: Hide community insights, but data still contributes (anonymized)

### Privacy Notice

The card includes:
- Info icon with privacy details
- Clear data source attribution
- Opt-out instructions

## AI Integration

### OpenAI (Preferred)

Uses `gpt-4o-mini` for cost-effective generation:
- Prompt: Founder patterns + Mrs. Deer tone
- Output: JSON array of insights
- Fallback: Rule-based if API fails

### Anthropic (Fallback)

Uses `claude-3-haiku` if OpenAI unavailable:
- Same prompt structure
- Similar output format

### Rule-Based (No API)

If no AI key configured:
- Still generates valuable insights
- Based on statistical patterns
- Examples: peak productivity days, common action plans

## Monitoring

### View Community Insights

```sql
SELECT * FROM community_insights 
WHERE is_active = true 
AND expires_at > NOW()
ORDER BY relevance_score DESC, generated_at DESC;
```

### Check Generation Status

Community insights are generated in the cron job response:
```json
{
  "results": {
    "communityInsightsGenerated": 3
  }
}
```

### Expiration

Insights expire after 30 days and are automatically deactivated.

## Troubleshooting

### No Insights Appearing

1. Check user count: Need 10+ active users
2. Verify migration: `community_insights` table exists
3. Check cron logs: Community analysis runs after individual analysis
4. Verify opt-out: User hasn't disabled in Settings

### AI Not Working

1. Check API key: Set `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`
2. Check API quota: Ensure credits available
3. Check logs: API errors logged but don't fail job
4. Fallback: Rule-based insights still generated

### Privacy Concerns

1. All data is aggregated - no individual data exposed
2. Minimum 10 users required
3. Users can opt out
4. Data source clearly attributed

## Customization

### Adjust Relevance Threshold

Edit `generateSmartConstraints()`:
```typescript
relevanceScore: 4  // 1-5 scale
```

### Change Expiration

Edit cron job:
```typescript
expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
```

### Add New Categories

1. Update `category` CHECK constraint in migration
2. Add category to `generateSmartConstraints()`
3. Add emoji to `CommunityWisdomCard`

## Testing

### Manual Trigger

```bash
curl -X POST https://your-domain.com/api/cron/analyze-patterns \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Check response for:
```json
{
  "results": {
    "communityInsightsGenerated": 3
  }
}
```

### Verify Display

1. Ensure 10+ users have data
2. Run cron job
3. Check Dashboard for Community Wisdom card
4. Verify insight appears

## Future Enhancements

- A/B testing different insight formats
- User feedback on insight relevance
- Personalized insight selection based on user patterns
- Weekly community insights email digest
