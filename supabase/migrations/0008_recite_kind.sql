-- Reading recitation ("recite") progress was added in code (the two-part reading mastery and the
-- «Уровни» mark-passed action both write `recite` rows) but was NEVER added to the progress.kind
-- CHECK constraint. A Supabase upsert is all-or-nothing, so any batch containing a recite row was
-- rejected wholesale ("new row for relation \"progress\" violates check constraint
-- progress_kind_check") and silently fell back to localStorage only — so reading/level mastery did
-- not persist for Supabase-backed users (it vanished on reload). Widen the constraint to include
-- 'recite'. Existing rows stay valid; nothing is dropped.

alter table public.progress drop constraint if exists progress_kind_check;
alter table public.progress
  add constraint progress_kind_check
  check (kind in (
    'recognition', 'production', 'sentences',
    'say_word', 'say_sentence',
    'listen_word', 'listen_sentence',
    'reading', 'recite'
  ));
