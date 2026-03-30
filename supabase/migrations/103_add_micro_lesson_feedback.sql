alter table if exists public.user_profiles
add column if not exists micro_lesson_feedback jsonb not null default '{}'::jsonb;
