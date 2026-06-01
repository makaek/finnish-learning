-- Slice 5: per-user learning progress.
--
-- One row per (user, item). `user_id` is the Supabase auth uid (anonymous sessions count),
-- so progress follows the visitor across devices/reloads once the same session is restored.
-- Apply via `supabase db push`, the Supabase SQL editor, or the CLI.

create table if not exists public.progress (
  user_id       uuid        not null references auth.users (id) on delete cascade,
  kind          text        not null check (kind in ('vocab', 'sentence')),
  item_id       text        not null,
  box           int         not null default 0 check (box between 0 and 5),
  correct_streak int        not null default 0,
  total_correct int         not null default 0,
  total_seen    int         not null default 0,
  last_seen     timestamptz,
  updated_at    timestamptz not null default now(),
  primary key (user_id, kind, item_id)
);

-- Keep updated_at fresh on every upsert.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists progress_touch_updated_at on public.progress;
create trigger progress_touch_updated_at
  before update on public.progress
  for each row execute function public.touch_updated_at();

-- Row-level security: a user may only see and write their own rows.
alter table public.progress enable row level security;

-- `anon` is required: Supabase anonymous sign-ins run under the anon role (auth.uid() is
-- still populated). `authenticated` is included so the same rows keep working if the user
-- is ever upgraded to a real (email/OAuth) account.
drop policy if exists "progress is private to its owner" on public.progress;
create policy "progress is private to its owner"
  on public.progress
  for all
  to anon, authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
