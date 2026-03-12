-- Multi-channel notification preferences and in-app notification storage
-- See docs/NOTIFICATION_STRATEGY.md

-- 1. User preferences: email, in-app, preferred channel
ALTER TABLE public.user_notification_settings
  ADD COLUMN IF NOT EXISTS email_notifications_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS in_app_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS preferred_channel text DEFAULT 'push' CHECK (preferred_channel IN ('push', 'email', 'in_app'));

-- 2. Delivery channel for analytics (which channel was used)
ALTER TABLE public.notification_logs
  ADD COLUMN IF NOT EXISTS channel text;

CREATE INDEX IF NOT EXISTS idx_notification_logs_channel ON notification_logs(channel);

-- 3. In-app notification center (read/unread list)
CREATE TABLE IF NOT EXISTS public.in_app_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  url text,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_in_app_notifications_user_id ON in_app_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_in_app_notifications_created_at ON in_app_notifications(created_at DESC);

ALTER TABLE public.in_app_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own in_app_notifications"
  ON in_app_notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own in_app_notifications (mark read)"
  ON in_app_notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage in_app_notifications"
  ON in_app_notifications FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
