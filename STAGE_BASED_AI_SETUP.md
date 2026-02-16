# Stage-Based AI System Setup

Complete guide for the tiered AI system with stage-based cross-user analysis.

## Overview

**PRO TIER ($19/$24):** Community Wisdom
- Smart Constraints: Cross-user pattern analysis grouped by founder stages
- Runs 2-5 AM daily (timezone-aware)
- LLM analyzes ANONYMIZED data from all Pro users
- Groups users by JOURNEY STAGE (not calendar date)
- When 5+ users in SAME STAGE share pattern → Generate insight
- Weekly Insights: Cross-user weekly trends (Sunday 6 PM)

**PRO+ TIER ($39/$49):** Personal Coach
- AI Coach: Real-time analysis of INDIVIDUAL user data
- Uses FULL Mrs. Deer personality + Gentle Architect framework
- 3 LIVE prompts daily:
  1. Morning Dashboard Prompt (Gentle Architect with 4-part structure)
  2. Post-Morning Plan Analysis
  3. Post-Evening Reflection Insight
- Weekly Insights: Personalized (Sunday 6 PM)
- Monthly Insights: Personalized (1st of month)

## Database Migration

Run `019_stage_based_ai_tables.sql` in Supabase:

```sql
-- Creates:
-- 1. community_insights (Pro tier)
-- 2. personal_prompts (Pro+ tier)
-- 3. user_stages (stage tracking)
-- 4. cross_user_analysis_enabled column in user_profiles
```

## Stage Detection

### Founder Stages

1. **FIRE_FIGHTING_STAGE**: High emergencies (>0.5/day), low systemizing (<20%)
2. **SYSTEM_BUILDING_STAGE**: High systemizing (>40%), low emergencies (<0.3/day)
3. **STRATEGIC_GROWTH_STAGE**: High decision frequency (>2/day), high completion (>80%)
4. **MOMENTUM_BUILDING_STAGE**: High quick win ratio (>50%)
5. **BALANCED_STAGE**: Default/other patterns

### Detection Logic

`lib/stage-detection.ts` analyzes last 7 days of user behavior:
- Emergency rate
- Systemizing ratio
- Completion rate
- Decision frequency
- Quick win ratio

## Mrs. Deer Rules

### Safety Rules (NEVER BREAK)
1. NEVER give financial, legal, or medical advice
2. NEVER encourage harmful or illegal activities
3. NEVER share personal opinions on politics, religion, etc.
4. ALWAYS maintain professional boundaries
5. If asked about sensitive topics, redirect to professional help

### Founder-Specific Rules
1. Focus on actionable, practical founder advice
2. Base insights on the user's actual data when available
3. Emphasize sustainable growth over quick fixes
4. Encourage work-life balance and founder wellness
5. Suggest consulting professionals for complex decisions

### Response Guidelines
1. Keep responses under 300 words
2. Use bullet points for actionable steps
3. Include 1-2 reflective questions
4. End with encouraging next steps
5. Use 1-2 relevant emojis maximum
6. Stay in character as Mrs. Deer

## Gentle Architect Framework (Pro+ Morning Prompts)

### 4-Part Structure

1. **AFFIRMATION (The Mirror)**
   - Validate effort, reframe 'failure' as data, reinforce agency
   - Formula: "Good morning. [Specific, positive observation about recent effort/learning]."

2. **THE CORE INSIGHT (The Pattern)**
   - Connect personal experience to system philosophy
   - Formula: "You proved that [Core System Hypothesis] by [Their Specific Behavior]."

3. **THE VICTORY REDEFINITION (The Shift)**
   - Elevate win from task completion to emotional/sustainable outcome
   - Formula: "You didn't just [Metric]. You [Emotional/Sustainable Outcome]."

4. **THE FORWARD-FOCUSED QUESTION (The Map)**
   - Provide gentle, guiding constraint for the day's planning
   - Formula: "Today's question: How will you [Protect/Extend/Build on] the [Key Outcome] from yesterday?"

## Privacy & Anonymization

### Rules
- **minUsers**: 5 (minimum users before sharing any pattern)
- **maxSpecificity**: 10 (never say "12 founders", say "many founders")
- **noPersonalData**: true (never include user IDs, emails, etc.)
- **aggregateOnly**: true (only use aggregated, averaged data)
- **optOutAllowed**: true (users can opt out via `cross_user_analysis_enabled`)

### Implementation

`lib/community-analysis.ts`:
- Groups users by stage
- Finds common patterns within stage groups
- Only generates insights if 5+ users in same stage
- Anonymizes user counts
- Never exposes individual user data

## Scheduling

### Pro Tier
- **Daily**: 2-5 AM user local time (Smart Constraints batch)
- **Weekly**: Sunday 6 PM user local time (Community insights)

### Pro+ Tier
- **Morning**: On Dashboard open (if after 5 AM local)
- **Post-Morning**: Immediately after saving morning plan
- **Post-Evening**: Immediately after saving evening reflection
- **Weekly**: Sunday 6 PM local time
- **Monthly**: 1st of month 6 AM local time

## Implementation Files

### Core Logic
- `lib/mrs-deer.ts` - Mrs. Deer rules and Gentle Architect framework
- `lib/stage-detection.ts` - Stage detection algorithm
- `lib/community-analysis.ts` - Pro tier cross-user analysis
- `lib/personal-coaching.ts` - Pro+ tier personal coaching

### API Routes
- `app/api/cron/analyze-patterns/route.ts` - Hourly cron (updated)
  - Generates Pro community insights at 3 AM UTC
  - Generates Pro+ weekly/monthly prompts (timezone-aware)
  - Updates user stages

### UI Components
- `components/CommunityWisdomCard.tsx` - Display Pro community insights
- `components/PersonalPromptsCard.tsx` - Display Pro+ personal prompts
- `components/PersonalInsightsCard.tsx` - Existing personal insights (2 AM batch)

### Pages
- `app/morning/page.tsx` - Updated to use `generateProPlusPrompt`
- `app/evening/page.tsx` - Updated to use `generateProPlusPrompt`
- `app/page.tsx` - Dashboard displays both community and personal insights

## Feature Flags

Updated `lib/features.ts`:
- `smartConstraints`: Pro & Pro+ (community insights)
- `communityWeeklyInsights`: Pro & Pro+
- `dailyMorningPrompt`: Pro+ only
- `dailyPostMorningPrompt`: Pro+ only
- `dailyPostEveningPrompt`: Pro+ only
- `personalWeeklyInsight`: Pro+ only
- `personalMonthlyInsight`: Pro+ only
- `liveAICoach`: **Always false** (no live chat)

## Testing

### Test Stage Detection
1. Create test user with high emergency rate → Should detect FIRE_FIGHTING_STAGE
2. Create test user with high systemizing → Should detect SYSTEM_BUILDING_STAGE
3. Verify stage updates in `user_stages` table

### Test Community Insights
1. Create 5+ Pro users in same stage
2. Run cron job at 3 AM UTC
3. Verify insights appear in `community_insights` table
4. Check Dashboard shows Community Wisdom card

### Test Personal Prompts
1. Login as Pro+ user
2. Open Dashboard → Should see morning prompt
3. Save morning plan → Should see post-morning prompt
4. Save evening review → Should see post-evening prompt
5. Wait for Sunday 6 PM → Should see weekly prompt
6. Wait for 1st of month 6 AM → Should see monthly prompt

## Privacy Compliance

- All cross-user data is anonymized
- Individual user data never exposed
- Users can opt out via settings
- Minimum 5 users required before sharing patterns
- User counts anonymized (never exact numbers)

## Next Steps

1. Run migration `019_stage_based_ai_tables.sql`
2. Test stage detection with sample users
3. Verify cron job generates insights correctly
4. Test UI components display properly
5. Monitor privacy compliance

The complete tiered AI system is ready! 🎯
