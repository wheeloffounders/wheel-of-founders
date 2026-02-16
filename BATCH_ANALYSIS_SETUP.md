# 2 AM Batch Analysis Setup Guide

This document explains how to set up and use the 2 AM batch analysis system.

## Overview

The batch analysis system runs every night at 2 AM UTC to analyze all users' data and generate personalized AI insights. These insights appear on the Dashboard the next morning.

## Setup Steps

### 1. Run Database Migration

Execute the migration in Supabase SQL Editor:
```bash
supabase/migrations/012_user_insights_table.sql
```

This creates:
- `user_insights` table - stores generated insights
- `analysis_logs` table - tracks analysis runs for debugging

### 2. Set Environment Variable

Add to your `.env.local` (and Vercel environment variables):
```bash
CRON_SECRET=your_secure_random_string_here
```

Generate a secure secret:
```bash
openssl rand -hex 32
```

### 3. Deploy to Vercel

The `vercel.json` file is already configured with:
```json
{
  "crons": [
    {
      "path": "/api/cron/analyze-patterns",
      "schedule": "0 2 * * *"
    }
  ]
}
```

After deploying, Vercel will automatically:
- Call `/api/cron/analyze-patterns` every day at 2 AM UTC
- Use the `CRON_SECRET` environment variable for authentication

### 4. Verify Setup

Check Vercel Dashboard → Settings → Cron Jobs to see the scheduled job.

## Manual Testing

### Test the Endpoint Locally

```bash
# Start dev server
npm run dev

# In another terminal, trigger analysis manually
curl -X POST http://localhost:3000/api/cron/analyze-patterns \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Or use GET with query param:
```bash
curl "http://localhost:3000/api/cron/analyze-patterns?secret=YOUR_CRON_SECRET"
```

### Test in Production

```bash
curl -X POST https://your-domain.com/api/cron/analyze-patterns \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## How It Works

1. **2 AM UTC**: Vercel Cron calls `/api/cron/analyze-patterns`
2. **Authentication**: Endpoint verifies `CRON_SECRET` header
3. **User Processing**: For each user:
   - Checks feature access (`aiInsights` flag)
   - Analyzes last 30 days of data
   - Generates 1-3 personalized insights
   - Saves to `user_insights` table
   - Logs result to `analysis_logs`
4. **Dashboard Display**: Users see insights the next morning

## Analysis Types

The system generates insights in these categories:

- **Productivity**: Task completion patterns, most productive days
- **Pattern**: Behavioral patterns (e.g., "You make most decisions on Tuesdays")
- **Suggestion**: Actionable recommendations
- **Achievement**: Positive recognition (e.g., "You're completing 85% of tasks!")

## Feature Flags

Insights are controlled by the feature flag system:
- **Beta users**: All insights enabled
- **Pro/Pro Plus**: All insights enabled
- **Free tier**: No insights (when implemented)

Check `lib/features.ts` for current access rules.

## Monitoring

### View Analysis Logs

```sql
SELECT * FROM analysis_logs 
ORDER BY analysis_date DESC, created_at DESC 
LIMIT 50;
```

### View User Insights

```sql
SELECT * FROM user_insights 
WHERE user_id = 'USER_ID' 
ORDER BY date DESC, created_at DESC;
```

### Check for Errors

```sql
SELECT * FROM analysis_logs 
WHERE status = 'error' 
ORDER BY created_at DESC;
```

## Troubleshooting

### Insights Not Appearing

1. Check `analysis_logs` for errors
2. Verify user has `aiInsights` feature access
3. Ensure user has data (tasks, reviews, etc.) in last 30 days
4. Check Vercel Cron logs for execution errors

### Cron Not Running

1. Verify `vercel.json` is deployed
2. Check Vercel Dashboard → Cron Jobs
3. Ensure `CRON_SECRET` is set in environment variables
4. Check Vercel function logs

### Performance Issues

- Analysis processes users sequentially
- Each user analysis takes ~1-3 seconds
- For 100 users, expect ~2-5 minutes total
- Consider batching if you have >1000 users

## Customization

### Adjust Analysis Window

Edit `lib/analysis-engine.ts`:
```typescript
const patterns = await analyzeUserPatterns(userId, 30) // Change 30 to desired days
```

### Add New Insight Types

1. Add pattern detection in `analyzeUserPatterns()`
2. Add insight generation in `generateInsights()`
3. Update `insight_type` CHECK constraint in migration

### Change Schedule

Edit `vercel.json`:
```json
"schedule": "0 2 * * *"  // 2 AM UTC daily
```

Cron format: `minute hour day month day-of-week`

## Support

For issues or questions:
1. Check `analysis_logs` table for errors
2. Review Vercel function logs
3. Test endpoint manually with curl
4. Verify database migrations are applied
