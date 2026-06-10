-- Maintenance: wipe ALL learning data, keep the schema.
--
-- This is NOT a migration (it lives outside supabase/migrations so it never auto-runs on a
-- deploy). Run it manually in the Supabase SQL editor when you want a clean slate.
--
-- DESTRUCTIVE: removes every row of progress and daily state for EVERY user and BOTH languages
-- (fi + en). It does NOT touch table structure, columns, constraints, RLS policies, or triggers —
-- so the 0009 primary keys (user_id, language, kind, item_id) / (user_id, language) stay intact.
-- It also does NOT delete auth users (anonymous sessions keep working; they just start empty).
--
-- TRUNCATE is faster than DELETE and resets the tables fully; one statement so both empty together.

truncate table public.progress, public.user_state;

-- Verify both are empty (expect 0, 0):
select
  (select count(*) from public.progress)   as progress_rows,
  (select count(*) from public.user_state) as user_state_rows;
