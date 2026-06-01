-- Slice 14: the voice lessons get their own progress tracks ("say_word", "say_sentence"),
-- so repeating a word by speaking is tracked separately from typing/recognizing it.
-- Existing recognition/production/sentences rows stay valid; we only widen the check.

alter table public.progress drop constraint if exists progress_kind_check;
alter table public.progress
  add constraint progress_kind_check
  check (kind in ('recognition', 'production', 'sentences', 'say_word', 'say_sentence'));
