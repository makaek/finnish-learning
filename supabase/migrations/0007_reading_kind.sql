-- Slice 53: reading texts/dialogs get a graded "reading" progress track recording
-- comprehension-quiz mastery (one row per text id). Existing rows stay valid; we only
-- widen the check.

alter table public.progress drop constraint if exists progress_kind_check;
alter table public.progress
  add constraint progress_kind_check
  check (kind in (
    'recognition', 'production', 'sentences',
    'say_word', 'say_sentence',
    'listen_word', 'listen_sentence',
    'reading'
  ));
