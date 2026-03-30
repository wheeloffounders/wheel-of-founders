-- Phase 1 email retention schema
-- Safe evolution from migration 087_email_preferences.sql

ALTER TABLE public.user_notification_settings
  ADD COLUMN IF NOT EXISTS email_morning_reminder_time TIME DEFAULT '09:00',
  ADD COLUMN IF NOT EXISTS email_evening_reminder_time TIME DEFAULT '20:00',
  ADD COLUMN IF NOT EXISTS email_frequency TEXT DEFAULT 'daily',
  ADD COLUMN IF NOT EXISTS email_unsubscribed_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_notification_settings_email_frequency_check'
  ) THEN
    ALTER TABLE public.user_notification_settings
      ADD CONSTRAINT user_notification_settings_email_frequency_check
      CHECK (email_frequency IN ('daily', 'weekly_only', 'achievements_only', 'none'));
  END IF;
END $$;

ALTER TABLE public.email_logs
  ADD COLUMN IF NOT EXISTS email_type TEXT,
  ADD COLUMN IF NOT EXISTS date_key TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Backward compatibility for old records that only used `type`.
UPDATE public.email_logs
SET email_type = type
WHERE email_type IS NULL AND type IS NOT NULL;

-- Fill missing date_key with sent date for legacy rows.
UPDATE public.email_logs
SET date_key = to_char(COALESCE(sent_at, NOW()), 'YYYY-MM-DD')
WHERE date_key IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'email_logs_email_type_check'
  ) THEN
    ALTER TABLE public.email_logs
      ADD CONSTRAINT email_logs_email_type_check
      CHECK (email_type IN (
        'welcome',
        'morning_reminder',
        'evening_reminder',
        'first_full_loop',
        'weekly_insight',
        'badge_earned',
        'streak_milestone',
        'feature_unlock',
        'inactivity_reminder'
      ));
  END IF;
END $$;

ALTER TABLE public.email_logs
  ALTER COLUMN email_type SET NOT NULL,
  ALTER COLUMN date_key SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_email_logs_user_type_date_key
  ON public.email_logs (user_id, email_type, date_key);

CREATE INDEX IF NOT EXISTS idx_email_logs_type_sent
  ON public.email_logs (email_type, sent_at);

