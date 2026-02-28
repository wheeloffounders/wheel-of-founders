-- User notification settings: reminder times, push subscriptions, last sent tracking
create table if not exists public.user_notification_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade unique,

  -- Morning notification settings
  morning_enabled boolean default true,
  morning_time time default '08:00:00',

  -- Evening notification settings
  evening_enabled boolean default true,
  evening_time time default '20:00:00',

  -- Push notification subscription (for web push)
  push_subscription jsonb,

  -- Last sent timestamps (to avoid duplicates)
  last_morning_sent timestamptz,
  last_evening_sent timestamptz,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.user_notification_settings enable row level security;

-- RLS policies for end users
drop policy if exists "Users can view their own notification settings" on public.user_notification_settings;
create policy "Users can view their own notification settings"
  on public.user_notification_settings
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can update their own notification settings" on public.user_notification_settings;
create policy "Users can update their own notification settings"
  on public.user_notification_settings
  for update
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own notification settings" on public.user_notification_settings;
create policy "Users can insert their own notification settings"
  on public.user_notification_settings
  for insert
  with check (auth.uid() = user_id);

-- Service role access for cron job
drop policy if exists "Service role can manage all notification settings" on public.user_notification_settings;
create policy "Service role can manage all notification settings"
  on public.user_notification_settings
  for all
  to service_role
  using (true);

-- Indexes for cron job queries
create index if not exists idx_notification_settings_morning
  on public.user_notification_settings (morning_enabled, morning_time);

create index if not exists idx_notification_settings_evening
  on public.user_notification_settings (evening_enabled, evening_time);

