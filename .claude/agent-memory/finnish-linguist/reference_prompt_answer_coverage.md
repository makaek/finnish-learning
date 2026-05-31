---
name: prompt-answer-coverage
description: Authoring audit for sentences.seed.json that the integrity test CANNOT catch — every RU content word must surface in the Finnish, and every Finnish word must be a dictionary entry or an inflection of one (and be listed in `uses`)
metadata:
  type: reference
---

The automated integrity test only checks structural things (canonical in accepted,
wrong != accepted, `uses` ids exist). It does NOT catch semantic coverage bugs. When
authoring/reviewing sentence items, manually audit BOTH directions:

**(i) RU -> FI:** every content word in `ru` must be represented in `canonical`.
A faithful learner translation that includes the missing word would be graded WRONG.
Caught example: s30 prompt "Вчера он был дома" with canonical "Hän oli kotona" — the
adverb "Вчера" (eilen) was unrepresented. Fix: either add the word and put it in the
answer + `uses`, or drop it from the prompt. (We added `eilen` as f7 and reworded the
answer.) Note: dropped subject pronouns (Я/ты/он) are FINE — Finnish drops them and the
grader derives both variants. This is about lexical/adverb/object content, not pronouns.

**(ii) FI -> dictionary:** every word in `canonical`/`accepted` must be a dictionary
entry or an inflected form of one, AND its lemma id should be in `uses` (the app gates
exercises by learned words). Caught example: `suomea` (the language) appeared in s24/s25
but `suomi` was not a dictionary entry — it is not an inflection of any other entry, so
it was an orphan. Fix: added `suomi` as n16 (stem suome-: suomen/suomea/suomessa/suomeen,
lowercase as a language) and added n16 to those items' `uses`.

Borderline-OK: oblique forms whose case isn't a stored schema field (e.g. adessive
`autolla` from `auto`) still count as "an inflected form of a dict entry" and pass —
but make sure the lemma id IS in `uses`.

Related: [[wrong-match-collisions]], [[predicative-case]].
