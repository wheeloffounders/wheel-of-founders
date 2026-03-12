-- Add per-type notification toggles for insights and profile reminders
ALTER TABLE public.user_notification_settings
  ADD COLUMN IF NOT EXISTS weekly_insights_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS monthly_insights_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS quarterly_insights_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS profile_reminders_enabled boolean DEFAULT true;
