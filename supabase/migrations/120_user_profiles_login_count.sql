-- Track login count for rotating social-proof messages on dashboard.
alter table public.user_profiles
  add column if not exists login_count integer not null default 0;

update public.user_profiles
set login_count = 0
where login_count is null;

