# Weekly Email Edge Function

This Supabase Edge Function sends personalized weekly summary emails to users who have opted in.

## Setup

1. **Install Supabase CLI** (if not already installed):
   ```bash
   npm install -g supabase
   ```

2. **Link your project**:
   ```bash
   supabase link --project-ref your-project-ref
   ```

3. **Set environment variables**:
   ```bash
   supabase secrets set RESEND_API_KEY=your_resend_api_key
   ```

   The function automatically uses `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from the Supabase environment.

4. **Deploy the function**:
   ```bash
   supabase functions deploy weekly-email
   ```

5. **Set up cron schedule** (in Supabase Dashboard):
   - Go to Database → Cron Jobs
   - Create a new cron job:
     - Name: `weekly-email`
     - Schedule: `0 20 * * 0` (Sunday at 8 PM UTC)
     - SQL:
       ```sql
       SELECT net.http_post(
         url := 'https://your-project-ref.supabase.co/functions/v1/weekly-email',
         headers := '{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
       );
       ```

## Resend.com Setup

1. Sign up at [resend.com](https://resend.com)
2. Create an API key
3. Verify your sending domain (or use the default)
4. Add the API key as a Supabase secret

## Email Preferences

Users can toggle weekly emails in their profile settings. The function only sends emails to users where:
- `user_profiles.weekly_email_enabled = true`
- `user_profiles.email_address` is set

## Testing

Test the function locally:
```bash
supabase functions serve weekly-email
```

Then call it:
```bash
curl -X POST http://localhost:54321/functions/v1/weekly-email \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```
