# Phase 3: Tier-Based Features & Live AI Coach Setup

This document explains the tier-based feature system and Live AI Coach implementation.

## New Tier Structure

- **FREE**: $0 - 2 days history view, no AI features
- **PRO**: $19/month (annual) or $24/month (monthly) - Unlimited history + Smart Constraints + Weekly AI insights
- **PRO+**: $39/month (annual) or $49/month (monthly) - Everything in Pro + Real-time AI prompts + Video templates
- **BETA**: All users get PRO+ access free during beta

## Feature Flags Updated

### `lib/features.ts`

All feature access is now controlled by tier:
- `canViewFullHistory`: Free users see last 2 days only
- `viewableHistoryDays`: Free = 2, others = Infinity
- `smartConstraints`: Pro and Pro+ (2 AM batch analysis)
- `aiCoachWeekly`: Pro and Pro+ (Monday insights)
- `aiCoachRealTime`: Pro+ only (real-time prompts)
- `videoTemplates`: Pro+ only
- `fiveYearTrends`: Pro+ only

## History Page Access Control

### `components/HistoryAccessGate.tsx`

- Wraps history content with blur/upgrade overlay
- Free users see blurred content for dates older than 2 days
- Shows upgrade prompt with pricing link
- Pro/Pro+ users see all history

### Implementation

The history page:
1. Checks user tier on load
2. Filters data fetch based on `viewableHistoryDays`
3. Wraps content sections with `HistoryAccessGate`
4. Shows upgrade prompt for locked dates

## AI Coach Real-Time Prompts (Pro+)

### Trigger Points

1. **Morning Before** (`morning_before`):
   - Triggered when user opens morning page
   - Analyzes yesterday's data
   - Provides planning insight

2. **Morning After** (`morning_after`):
   - Triggered after saving morning plan
   - Reviews today's plan
   - Provides feedback and suggestions

3. **Evening After** (`evening_after`):
   - Triggered after saving evening review
   - Analyzes today's patterns
   - Provides reflection insights

### Components

- `lib/ai-coach.ts`: Generates personalized prompts based on user data
- `components/AICoachPrompt.tsx`: Floating prompt card (bottom-right)
- Integrated into `app/morning/page.tsx` and `app/evening/page.tsx`

## Video Template Library (Pro+)

### `components/VideoTemplates.tsx`

5 video templates for structured reflections:
1. Weekly Planning Walkthrough (5 min)
2. Morning Intention Setting (3 min)
3. Evening Reflection (4 min)
4. Decision Log Review (3 min)
5. Monthly Review (7 min)

### Access

- Page: `/video-templates`
- Link in Dashboard Quick Actions (Pro+ only)
- Each template shows duration and step-by-step prompts

## Pricing Page

### `app/pricing/page.tsx`

- Displays all 3 tiers with features
- Shows current tier badge
- Highlights Pro+ as "Most Popular"
- FAQ section
- During beta: Shows "Beta (Pro+ features unlocked)" message

### Features Listed

**Free:**
- Daily planner
- Basic stats
- 2 days history view
- Mobile app
- Export archive access

**Pro:**
- Everything in Free
- Smart Constraint Insights
- AI Coach Weekly Insights
- Unlimited history view
- Weekly email digest
- Export to CSV/PDF
- Yearly Insight Report

**Pro+:**
- Everything in Pro
- AI Coach Real-time Prompts
- Video Template Library
- Priority support
- Custom analytics
- 5-Year Trends
- Monthly Strategy Sessions

## Export Archive System

### Database

Run `015_data_exports_table.sql`:
- Tracks export requests
- Stores file URLs (Supabase Storage)
- 30-day expiration
- Status tracking (pending/processing/completed/failed)

### API Endpoint

`/api/export`:
- POST request with `exportType`
- Validates tier access
- Generates JSON/CSV export
- Returns downloadable file

### Export Types

1. **Full History**: All user data (Pro/Pro+ only)
2. **Yearly Report**: Current year data
3. **Custom Range**: User-specified dates
4. **5-Year Trends**: Last 5 years (Pro+ only)

### Settings Page Integration

- Export section in Settings
- Dropdown to select export type
- Download button
- Shows tier limitations

## Data Storage Policy

✅ **All data stored forever** - regardless of tier
✅ **Free users**: Can view last 2 days, but all historical data remains
✅ **Upgrade anytime**: Full history becomes accessible
✅ **Export available**: All tiers can export (Free = last 2 days)

## Testing

### Free Tier Restrictions

1. Set user tier to 'free' in database:
   ```sql
   UPDATE user_profiles SET tier = 'free' WHERE id = 'USER_ID';
   ```

2. Verify:
   - History page shows blur for dates > 2 days old
   - Upgrade prompt appears
   - Export limited to 2 days
   - No AI Coach prompts
   - No video templates

### Pro Tier Access

1. Set user tier to 'pro':
   ```sql
   UPDATE user_profiles SET tier = 'pro' WHERE id = 'USER_ID';
   ```

2. Verify:
   - Full history accessible
   - Smart Constraints visible
   - Weekly AI insights work
   - No real-time AI Coach prompts
   - No video templates

### Pro+ Tier Access

1. Set user tier to 'pro_plus':
   ```sql
   UPDATE user_profiles SET tier = 'pro_plus' WHERE id = 'USER_ID';
   ```

2. Verify:
   - All features accessible
   - Real-time AI Coach prompts appear
   - Video templates accessible
   - 5-year trends available

## Files Created/Modified

### New Files
- ✅ `components/HistoryAccessGate.tsx`
- ✅ `components/AICoachPrompt.tsx`
- ✅ `components/VideoTemplates.tsx`
- ✅ `lib/ai-coach.ts`
- ✅ `app/pricing/page.tsx`
- ✅ `app/video-templates/page.tsx`
- ✅ `app/api/export/route.ts`
- ✅ `supabase/migrations/015_data_exports_table.sql`

### Modified Files
- ✅ `lib/features.ts` - Updated with new tier structure
- ✅ `app/history/page.tsx` - Added access control
- ✅ `app/morning/page.tsx` - Added AI Coach prompts
- ✅ `app/evening/page.tsx` - Added AI Coach prompts
- ✅ `app/page.tsx` - Added video templates link
- ✅ `app/settings/page.tsx` - Added export section
- ✅ `components/Navigation.tsx` - Added pricing link

## Next Steps

1. **Run Migrations**: Execute `015_data_exports_table.sql` in Supabase
2. **Set Up Storage**: Configure Supabase Storage bucket for exports
3. **Payment Integration**: Integrate Stripe/Paddle for subscriptions
4. **Beta Override**: Ensure all users default to 'beta' tier
5. **Test Tiers**: Manually set tiers in database to test restrictions

## Beta Period

During beta:
- All users automatically get `tier='beta'`
- Beta = Pro+ access (all features unlocked)
- No payment required
- Full feature testing enabled

When beta ends:
- Users default to 'free' tier
- Payment required for Pro/Pro+
- Feature restrictions apply based on tier

Phase 3 is complete! 🎉
