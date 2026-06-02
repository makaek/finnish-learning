-- Slice 32: the listening (dictation) lessons get their own progress tracks
-- ("listen_word", "listen_sentence"), so hearing a word/sentence and typing it is tracked
-- separately from recognising, typing, or speaking it.
-- Existing rows stay valid; we only widen the check.

alter table public.progress drop constraint if exists progress_kind_check;
alter table public.progress
  add constraint progress_kind_check
  check (kind in (
    'recognition', 'production', 'sentences',
    'say_word', 'say_sentence',
    'listen_word', 'listen_sentence'
  ));
