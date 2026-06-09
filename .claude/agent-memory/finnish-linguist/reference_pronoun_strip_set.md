---
name: pronoun-strip-set
description: The grader's dropped-pronoun strip-set is auto-built from EVERY dictionary entry with pos=="pronoun" — so adding interrogative/demonstrative pronouns (mikä/kuka/tämä/se) makes them leading-strippable and can create new wrong/accepted collisions
metadata:
  type: reference
---

`src/data/sentences.ts` (as of 2026-06-08) builds the strip-set as a HARDCODED closed
set `SUBJECT_PRONOUNS = {minä,sinä,hän,me,te,he}` **intersected** with the dictionary's
`pos:"pronoun"` lemmas. So ONLY those six personal subject pronouns are ever stripped;
interrogatives/demonstratives `mikä/kuka/tämä/se` are pos `pronoun` but are deliberately
NOT in the strip-set → adding more of them is now safe. (Earlier the set was every
`pos:"pronoun"` lemma — see history below — which is why this note once warned about
mikä/kuka/tämä/se. That hazard is now gone for new demonstratives/interrogatives.)

**Former trap (when the set was all pronoun lemmas, caught adding L3–5):** answers like
`"Mikä tämä on?"` derived a stripped `"tämä on"`; a wrong `"kuka tämä on"` stripped to
`"tämä on"` too → collided with derived-accepted. With the current hardcoded set this
specific collision can't happen, but the general `<strippable> X` / wrong sharing tail
`X` hazard STILL applies to the six personal pronouns.

**Rules when authoring questions/demonstratives:**
- Only the LEMMA `.fi` is stripped, not inflected forms. `mikä` is strippable but its
  partitive `mitä` is NOT (it isn't a lemma). Leading `missä`/`mihin`/`paljonko`/`kuinka`
  are pos `adv`, NOT strippable. `minun`/`minulla` are not lemmas, NOT strippable.
- For an item whose accepted form begins with a strippable pronoun, make every wrong
  differ in a token AFTER the leading pronoun, so stripping the leading word from BOTH
  can never equalize them. Don't write a wrong that only swaps the leading interrogative
  (e.g. accepted `mikä tämä on` + wrong `kuka tämä on` → both → `... tämä on`).

Related: [[wrong-match-collisions]] (the leading-pronoun-position case), [[prompt-answer-coverage]].
