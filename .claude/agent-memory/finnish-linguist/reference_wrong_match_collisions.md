---
name: wrong-match-collisions
description: Authoring trap in sentences.seed.json — a wrong.match must not collapse to an accepted form after the grader's auto dropped-pronoun derivation
metadata:
  type: reference
---

The integrity test for `data/sentences.seed.json` fails if any `wrong.match` coincides
with any `accepted` form of the same item — **including the dropped-subject-pronoun
variant the grader derives automatically for BOTH lists**.

**The non-obvious trap:** a "wrong" string that merely puts a subject pronoun in the
wrong *position* can collapse onto an accepted form once the grader strips a LEADING
pronoun. Example caught at s24: accepted `["Puhutko suomea?", "Puhutko sinä suomea?"]`;
a tempting wrong `"sinä puhutko suomea"` (wrong word order) → grader drops leading
`sinä` → `"puhutko suomea"` = accepted → test FAILS. Fix: make wrongs differ in a
substantive token (verb form, case ending, object), never only in pronoun placement.

**Safe pattern:** every `wrong.match` should differ from every accepted form by at
least one content token (verb person/tense, case ending, or lexical choice) so that
adding OR removing a leading pronoun can never equalize them.

Related: [[diacritic-minimal-pairs]] (the other automated-check trap when expanding decks).
