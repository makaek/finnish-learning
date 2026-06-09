-- Multi-language: progress + daily state are now namespaced per TARGET language (the L2).
--
-- The app added English alongside Finnish, with each language's mastery and streak kept SEPARATE.
-- Both tables gain a `language` column (default 'fi' so every existing row is attributed to the
-- original Finnish content) and that column joins the primary key, so the same item_id can hold
-- independent progress per language. The backend filters/writes by it and uses the widened
-- conflict targets ('user_id,language,kind,item_id' and 'user_id,language').
--
-- Idempotent and non-destructive: existing rows are backfilled to 'fi' via the column default.
-- NOTE: untested against a live Supabase instance until deploy — local/dev runs on localStorage.

-- progress: add language, move it into the primary key.
alter table public.progress
  add column if not exists language text not null default 'fi';

alter table public.progress drop constraint if exists progress_pkey;
alter table public.progress
  add constraint progress_pkey primary key (user_id, language, kind, item_id);

-- user_state: one row per (user, language) — per-language streaks/daily goal.
alter table public.user_state
  add column if not exists language text not null default 'fi';

alter table public.user_state drop constraint if exists user_state_pkey;
alter table public.user_state
  add constraint user_state_pkey primary key (user_id, language);
