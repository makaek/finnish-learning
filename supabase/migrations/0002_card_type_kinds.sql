-- Slice 11: progress is now tracked per EXERCISE TYPE, not per (vocab|sentence).
-- A word has independent 'recognition' and 'production' records; sentences use 'sentences'.
--
-- The old rows used kind in ('vocab','sentence') and can't be mapped unambiguously
-- (a 'vocab' row could be either recognition or production), so we drop them and widen the
-- check constraint. This is safe because the app had no production data yet.

delete from public.progress where kind in ('vocab', 'sentence');

alter table public.progress drop constraint if exists progress_kind_check;
alter table public.progress
  add constraint progress_kind_check
  check (kind in ('recognition', 'production', 'sentences'));
