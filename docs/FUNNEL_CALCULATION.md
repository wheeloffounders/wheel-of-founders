# Funnel Calculation Reference

This document explains exactly how each funnel stage is calculated and how drops are computed.

## Data Sources (queried for last N days, default 90)

| Source | Table | Used For |
|--------|-------|----------|
| Auth | `auth.users` | All users (excluding admin emails) |
| Profiles | `user_profiles` | goal, personalization, onboarding completion |
| Journey events | `feature_usage` (feature_name='user_journey') | viewed_*, completed_*, typed_first_task, etc. |
| Morning saves | `feature_usage` (feature_name='morning_plan', action='save') | saved_morning |
| Evening saves | `feature_usage` (feature_name='evening_review', action='save') | saved_evening |
| Page views | `page_views` | viewed_goal, viewed_personalization, viewed_morning, viewed_evening |
| Funnel events | `funnel_events` | Backfill for viewed_morning/evening; interaction detection |
| Morning tasks | `morning_tasks` | returned_next_day |
| Evening reviews | `evening_reviews` | returned_next_day |

---

## Stage-by-Stage Calculation

### 1. Signed up
- **Count:** All users in `auth.users` (excluding admin emails)
- **Logic:** `() => true` — every user counts
- **Tables:** `auth.users`

### 2. Viewed goal
- **Count:** Users who viewed OR completed the goal page
- **Logic:** `journeyByUser.has('viewed_goal') OR journeyByUser.has('completed_goal') OR profile.primary_goal_text`
- **Sources:** `feature_usage` (user_journey), `page_views` (path='/onboarding/goal'), `user_profiles.primary_goal_text`

### 3. Completed goal
- **Count:** Users who submitted the goal form
- **Logic:** `profile.primary_goal_text` OR `journeyByUser.has('completed_goal')`
- **Sources:** `user_profiles.primary_goal_text`, `feature_usage` (action='completed_goal')

### 4. Viewed personalization
- **Count:** Users who viewed OR completed personalization
- **Logic:** `journeyByUser.has('viewed_personalization') OR journeyByUser.has('completed_personalization') OR (profile.struggles.length > 0 OR profile.onboarding_step >= 2)`
- **Sources:** `feature_usage`, `page_views` (path='/onboarding/personalization'), `user_profiles`

### 5. Completed personalization
- **Count:** Users who finished personalization
- **Logic:** `profile.struggles.length > 0 OR profile.onboarding_step >= 2` OR `journeyByUser.has('completed_personalization')`
- **Sources:** `user_profiles.struggles`, `user_profiles.onboarding_step`, `feature_usage`

### 6. Started tutorial
- **Count:** Users who started OR completed the tutorial (or have onboarding_completed_at)
- **Logic:** `journeyByUser.has('started_tutorial') OR has any tutorial_step_* OR has('completed_tutorial')` OR `profile.onboarding_completed_at`
- **Sources:** `feature_usage`, `user_profiles.onboarding_completed_at`

### 7. Tutorial step 1–5
- **Count:** Users with explicit `tutorial_step_N` event in `feature_usage`
- **Logic:** `journeyByUser.has('tutorial_step_N')` — no inference
- **Sources:** `feature_usage` (action='tutorial_step_1' through 'tutorial_step_5')
- **Note:** Only users who went through the Joyride tutorial with `?tutorial=start` get these.

### 8. Completed tutorial
- **Count:** Users who finished onboarding or completed the tutorial
- **Logic:** `profile.onboarding_completed_at` OR `journeyByUser.has('completed_tutorial')`
- **Sources:** `user_profiles.onboarding_completed_at`, `feature_usage` (action='completed_tutorial')

### 9. Viewed morning page
- **Count:** Users who viewed, typed, or saved on morning page
- **Logic:** `journeyByUser.has('viewed_morning') OR has('typed_first_task') OR has('saved_morning')`
- **Sources:** `feature_usage` (viewed_morning), `page_views` (path='/morning'), `funnel_events` (step='morning_page_view'), `feature_usage` (morning_plan save)

### 10. Typed first task
- **Count:** Users who typed in a task OR saved morning
- **Logic:** `journeyByUser.has('typed_first_task') OR has('saved_morning')`
- **Sources:** `feature_usage` (user_journey action='typed_first_task'), `feature_usage` (morning_plan save)

### 11. Saved first morning
- **Count:** Users who saved a morning plan
- **Logic:** `journeyByUser.has('saved_morning')`
- **Sources:** `feature_usage` (feature_name='morning_plan', action='save')

### 12. Viewed evening page
- **Count:** Users who viewed or saved evening
- **Logic:** `journeyByUser.has('viewed_evening') OR has('saved_evening')`
- **Sources:** `feature_usage`, `page_views` (path='/evening'), `funnel_events` (step='evening_page_view')

### 13. Saved first evening
- **Count:** Users who saved an evening review
- **Logic:** `journeyByUser.has('saved_evening')`
- **Sources:** `feature_usage` (feature_name='evening_review', action='save')

### 14. Returned next day
- **Count:** Users with activity on 2+ distinct dates
- **Logic:** `userActivityDates.get(uid).size >= 2`
- **Sources:** `morning_tasks.plan_date` + `evening_reviews.review_date` (distinct dates per user)

---

## Drop Calculation

**Definition:** `dropOff = prevCount - count`

- **prevCount** = number of users who reached the *previous* stage
- **count** = number of users who reached the *current* stage
- **dropOff** = users who reached the previous stage but **did NOT** reach the current stage

**Example:** "Viewed morning page: 8" → "Typed first task: 3" → **Drop = 5**
- 5 users reached "Viewed morning page" but never reached "Typed first task"
- They did NOT "reach this stage and then leave" — they never reached "Typed first task" at all

**Dropped users** = `affectedIds` = users where `fromCheck(uid) === true` AND `toCheck(uid) === false`

---

## User Journey (Current Stage)

For each user, "Current Stage" is the **last** stage they passed (iterating from bottom to top).

---

## API Debug: Validate a Specific User

Add `?userEmail=sniclam@gmail.com` to the funnel API URL to get a `userJourney` object in the response showing:
- For each stage: passed (true/false) and why
- Raw `journeyByUser` events for that user
- Profile fields used

Example: `GET /api/admin/journey-funnel?days=90&userEmail=sniclam@gmail.com`

Or use the **Validate user** input on the funnel dashboard page.
