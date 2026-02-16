# MailerLite Setup Checklist

## ✅ What's Already Done (Code)
- ✅ MailerLite SDK installed (`@mailerlite/mailerlite-nodejs`)
- ✅ Utility file created (`lib/mailerlite.ts`)
- ✅ User signup flow integrated (adds users to MailerLite on signup)

## 📋 What Needs MailerLite Dashboard Setup

### Step 1: Get API Key (5 minutes)
1. Log in to MailerLite
2. Go to **Integrations** → **Developers** → **API**
3. Click **"Generate new token"**
4. Name it: `"Wheel of Founders API"`
5. Copy the API key (starts with `eyJ...`)
6. Add to `.env.local`:
   ```bash
   MAILERLITE_API_KEY=your_api_key_here
   ```

### Step 2: Create Groups (10 minutes)
Create these groups in MailerLite (Subscribers → Groups → Create Group):

1. **"Active Users"** - All registered users
   - Copy the Group ID (you'll need this)
   
2. **"Beta Testers"** - Beta program participants (optional)
   - Copy the Group ID
   
3. **"Challenge Participants"** - 30-day challenge users (optional)
   - Copy the Group ID
   
4. **"Pro Subscribers"** - Paid Pro tier users (optional)
   - Copy the Group ID
   
5. **"Pro+ Subscribers"** - Paid Pro+ tier users (optional)
   - Copy the Group ID

**Note:** You only NEED "Active Users" for now. Others are optional.

### Step 3: Create Custom Fields (15 minutes)
Go to **Subscribers** → **Fields** → **Create Custom Field**

Create these fields:

1. **`user_id`** (Text) - Supabase user ID
2. **`tier`** (Text) - User tier: beta, free, pro, pro_plus
3. **`joined_date`** (Date) - When user signed up
4. **`challenge_day`** (Number) - Current challenge day (optional)
5. **`weekly_digest_ready`** (Boolean) - Trigger for weekly email automation
6. **`weekly_digest_date`** (Date) - Date of last weekly digest sent
7. **`focus_score_trend`** (Text) - Weekly focus score message
8. **`top_accomplishments`** (Text) - Top 3 wins (comma-separated)
9. **`pattern_insight`** (Text) - Weekly pattern insight
10. **`streak`** (Number) - Current streak count
11. **`mrs_deer_message`** (Text) - Personalized message from Mrs. Deer

### Step 4: Create Weekly Digest Email Template (30 minutes)
1. Go to **Campaigns** → **Templates** → **Create Template**
2. Name it: **"Weekly Digest"**
3. Design the email with these variables:
   - `{{name}}` - User's name
   - `{{focus_score_trend}}` - Focus score message
   - `{{top_accomplishments}}` - Top wins
   - `{{pattern_insight}}` - Pattern insight
   - `{{streak}}` - Current streak
   - `{{mrs_deer_message}}` - Mrs. Deer message
   - `{{weekly_digest_date}}` - Week date range

**Template Structure:**
```
Subject: Your Weekly Summary: {{weekly_digest_date}}

Hello {{name}},

Here's your weekly reflection for {{weekly_digest_date}}.

🦌 {{mrs_deer_message}}

🔥 Current Streak: {{streak}} days

Focus Score Trend:
{{focus_score_trend}}

Top 3 Accomplishments:
{{top_accomplishments}}

Pattern Insight:
{{pattern_insight}}

[View Full Dashboard Button]
```

### Step 5: Create Automation Workflow (20 minutes)
1. Go to **Automations** → **Create Automation**
2. Name it: **"Weekly Digest Trigger"**
3. **Trigger:** When custom field `weekly_digest_ready` = `true`
4. **Action:** Send email campaign "Weekly Digest"
5. **After sending:** Set `weekly_digest_ready` = `false` (reset trigger)

### Step 6: Add Environment Variables
Add to `.env.local`:
```bash
MAILERLITE_API_KEY=your_api_key_here
MAILERLITE_GROUP_ACTIVE=123456  # Replace with your "Active Users" group ID
MAILERLITE_GROUP_CHALLENGE=789012  # Optional: Challenge Participants group ID
MAILERLITE_GROUP_PRO=345678  # Optional: Pro Subscribers group ID
MAILERLITE_GROUP_PRO_PLUS=901234  # Optional: Pro+ Subscribers group ID
```

## 🧪 Testing Checklist

After setup:
1. ✅ Sign up a new user → Should appear in "Active Users" group
2. ✅ Check MailerLite dashboard → User should be visible
3. ✅ Trigger weekly email manually → Should update fields and send email
4. ✅ Verify email received → Check all variables populate correctly

## 📝 Notes

- **Welcome Email:** Can be set up as an automation that triggers when user is added to "Active Users" group
- **Challenge Emails:** Set up separate automation based on `challenge_day` field
- **Trial Ending:** Set up automation based on `tier` field changes
- **Weekly Digest:** Code updates fields → Automation sends email

## 🆘 Troubleshooting

**User not appearing in MailerLite:**
- Check API key is correct
- Check group ID is correct
- Check browser console for errors

**Weekly email not sending:**
- Verify automation is active
- Check `weekly_digest_ready` field is being set to `true`
- Verify email template has correct variable names

**Variables not populating:**
- Ensure custom field names match exactly (case-sensitive)
- Check field types match (Text vs Number vs Date)
