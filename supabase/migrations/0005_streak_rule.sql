-- Slice 15: the streak now advances only on a *qualifying* day (>=10 lessons at >=80%
-- accuracy), so the per-day shape changes (lessons/answered/correct/qualified instead of a
-- single today_count). Recreating the table also resets streaks to start fresh under the
-- harder rule, as intended.

drop table if exists public.user_state;

create table public.user_state (
  user_id            uuid        not null primary key references auth.users (id) on delete cascade,
  streak             int         not null default 0,
  best_streak        int         not null default 0,
  last_qualified_date date,
  today_date         date,
  lessons            int         not null default 0,
  answered           int         not null default 0,
  correct            int         not null default 0,
  qualified          boolean     not null default false,
  updated_at         timestamptz not null default now()
);

create trigger user_state_touch_updated_at
  before update on public.user_state
  for each row execute function public.touch_updated_at();

alter table public.user_state enable row level security;

create policy "user_state is private to its owner"
  on public.user_state
  for all
  to anon, authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
