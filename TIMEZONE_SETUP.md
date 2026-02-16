# Timezone System Setup

This document explains the timezone-aware batch analysis system.

## Overview

The batch analysis system now runs between 2-5 AM in **each user's local timezone**, ensuring insights are ready when users wake up.

## Database Migration

Run `016_add_timezone_columns.sql` in Supabase:

```sql
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC',
ADD COLUMN IF NOT EXISTS timezone_offset INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS timezone_detected_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_analyzed_at TIMESTAMPTZ;
```

## Automatic Timezone Detection

### `lib/auth.ts`

- `detectAndStoreTimezone()`: Detects browser timezone and stores it
- Called automatically when:
  - New user profile is created
  - User logs in and timezone is not set
- Uses `Intl.DateTimeFormat().resolvedOptions().timeZone`
- Calculates offset in minutes (UTC+)

## Timezone Settings Page

### `/app/settings/timezone/page.tsx`

- User can view and change their timezone
- Shows 14 common timezones
- Displays analysis schedule (2-5 AM local time)
- Updates `timezone` and `timezone_offset` in database

### Access

- Link from main Settings page
- Direct URL: `/settings/timezone`

## Hourly Cron Job

### Updated: `/app/api/cron/analyze-patterns/route.ts`

**Changes:**
1. Runs **every hour** (not just 2 AM UTC)
2. Checks each user's local time
3. Only analyzes users in 2-5 AM window
4. Skips users already analyzed today
5. Updates `last_analyzed_at` timestamp

**Logic:**
```typescript
// Get user's local hour
const userLocalHour = getUserLocalHour(nowUTC, timezoneOffset)

// Only analyze if 2-5 AM local time
if (userLocalHour >= 2 && userLocalHour <= 5) {
  await analyzeUser(userId)
}
```

**Skip Conditions:**
- User already analyzed today (`last_analyzed_at >= startOfDayUTC`)
- Not in 2-5 AM window (`userLocalHour < 2 || userLocalHour > 5`)

## Vercel Cron Configuration

### `vercel.json`

Updated schedule from:
```json
"schedule": "0 2 * * *"  // 2 AM daily
```

To:
```json
"schedule": "0 * * * *"  // Every hour
```

This allows checking which users are in their 2-5 AM window each hour.

## Manual Analysis Trigger

### `/app/api/analyze-manual/route.ts`

- New endpoint for user-initiated analysis
- Bypasses timezone window check
- Useful if analysis was missed (user offline, etc.)
- Accessible from Settings page

**Usage:**
```typescript
POST /api/analyze-manual
// No body required - uses authenticated user's session
```

**Response:**
```json
{
  "message": "Analysis completed successfully",
  "analysisDate": "2026-02-01",
  "insightsGenerated": 3,
  "processingTimeMs": 1234
}
```

## Settings Page Integration

### `/app/settings/page.tsx`

Added two new sections:

1. **Timezone Settings**
   - Quick link to timezone management page
   - Shows current timezone info

2. **Manual Analysis**
   - Button to trigger analysis immediately
   - Shows success/error messages
   - Useful for testing or missed runs

## How It Works

### Example Flow

1. **User in Los Angeles (PST, UTC-8):**
   - Timezone: `America/Los_Angeles`
   - Offset: `-480` minutes
   - Analysis window: 2-5 AM PST (10 AM - 1 PM UTC)

2. **User in Tokyo (JST, UTC+9):**
   - Timezone: `Asia/Tokyo`
   - Offset: `540` minutes
   - Analysis window: 2-5 AM JST (5-8 PM UTC previous day)

3. **Cron runs hourly:**
   - At 10 AM UTC: Analyzes LA users (2 AM PST)
   - At 5 PM UTC: Analyzes Tokyo users (2 AM JST)
   - Each user gets analyzed once per day in their local morning

## Edge Cases

### Default Timezone
- If timezone not set: Defaults to UTC
- New users: Auto-detected on first login

### Missed Analysis
- If user offline during window: Manual trigger available
- `last_analyzed_at` prevents duplicate runs

### Timezone Changes
- User can update timezone anytime
- Next analysis uses new timezone
- Historical data unaffected

## Testing

### Test Different Timezones

1. Set user timezone in database:
   ```sql
   UPDATE user_profiles 
   SET timezone = 'America/New_York', timezone_offset = -300
   WHERE id = 'USER_ID';
   ```

2. Calculate expected window:
   - EST: UTC-5 → 2 AM EST = 7 AM UTC
   - Analysis should run at 7 AM UTC

3. Manually trigger cron:
   ```bash
   curl -X POST http://localhost:3000/api/cron/analyze-patterns \
     -H "Authorization: Bearer YOUR_CRON_SECRET"
   ```

4. Check logs for:
   - `skippedNotInWindow`: Users not in 2-5 AM window
   - `skippedAlreadyAnalyzed`: Users already analyzed today
   - `processed`: Users successfully analyzed

### Test Manual Trigger

1. Go to Settings page
2. Click "Run Analysis Now"
3. Check dashboard for new insights
4. Verify `last_analyzed_at` updated

## Monitoring

### Analysis Logs

Check `analysis_logs` table:
```sql
SELECT 
  user_id,
  analysis_date,
  status,
  insights_generated,
  processing_time_ms,
  created_at
FROM analysis_logs
ORDER BY created_at DESC
LIMIT 100;
```

### User Profiles

Check timezone distribution:
```sql
SELECT 
  timezone,
  COUNT(*) as user_count
FROM user_profiles
GROUP BY timezone
ORDER BY user_count DESC;
```

## Files Created/Modified

### New Files
- ✅ `supabase/migrations/016_add_timezone_columns.sql`
- ✅ `app/settings/timezone/page.tsx`
- ✅ `app/api/analyze-manual/route.ts`
- ✅ `TIMEZONE_SETUP.md`

### Modified Files
- ✅ `lib/auth.ts` - Added timezone detection
- ✅ `app/api/cron/analyze-patterns/route.ts` - Timezone-aware logic
- ✅ `vercel.json` - Changed to hourly schedule
- ✅ `app/settings/page.tsx` - Added timezone and manual trigger sections

## Next Steps

1. **Run Migration**: Execute `016_add_timezone_columns.sql`
2. **Update Vercel Cron**: Deploy updated `vercel.json`
3. **Test**: Create test users with different timezones
4. **Monitor**: Check logs to verify correct timing
5. **User Communication**: Let users know about timezone settings

## Benefits

✅ **Better UX**: Insights ready when users wake up  
✅ **Global Support**: Works for users worldwide  
✅ **Efficient**: Only analyzes users in their window  
✅ **Flexible**: Manual trigger for missed runs  
✅ **Transparent**: Users can see and change their timezone  

The timezone system is complete! 🌍⏰
