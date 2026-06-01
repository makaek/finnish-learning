-- Slice 12: per-user daily-loop state (one row per user) for the streak + daily goal.

create table if not exists public.user_state (
  user_id          uuid        not null primary key references auth.users (id) on delete cascade,
  streak           int         not null default 0,
  best_streak      int         not null default 0,
  last_active_date date,
  today_date       date,
  today_count      int         not null default 0,
  updated_at       timestamptz not null default now()
);

drop trigger if exists user_state_touch_updated_at on public.user_state;
create trigger user_state_touch_updated_at
  before update on public.user_state
  for each row execute function public.touch_updated_at();

alter table public.user_state enable row level security;

drop policy if exists "user_state is private to its owner" on public.user_state;
create policy "user_state is private to its owner"
  on public.user_state
  for all
  to anon, authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
