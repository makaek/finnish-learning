---
name: pronoun-strip-set
description: The grader's dropped-pronoun strip-set is auto-built from EVERY dictionary entry with pos=="pronoun" — so adding interrogative/demonstrative pronouns (mikä/kuka/tämä/se) makes them leading-strippable and can create new wrong/accepted collisions
metadata:
  type: reference
---

`src/data/sentences.ts` builds the grader's strip-set as
`VOCAB.filter(item => item.pos === "pronoun").map(item => item.fi.toLowerCase())`.
It is NOT a hardcoded {minä,sinä,hän,me,te,he}. So **every** dictionary entry you add
with `pos:"pronoun"` becomes a token the grader will strip when it leads an answer
(one level, non-recursive — see `expandDroppedPronoun`).

**The trap (caught while adding levels 3–5):** interrogatives `mikä`/`kuka` and
demonstratives `tämä`/`se` were added as `pos:"pronoun"`. That made answers like
`"Mikä tämä on?"` derive a stripped form `"tämä on"`. A wrong `"kuka tämä on"` then
strips to `"tämä on"` too → collides with the derived-accepted form → integrity test
fails. Same hazard for `"se ..."` answers and any `<strippable> X` wrong sharing tail `X`.

**Rules when authoring questions/demonstratives:**
- Only the LEMMA `.fi` is stripped, not inflected forms. `mikä` is strippable but its
  partitive `mitä` is NOT (it isn't a lemma). Leading `missä`/`mihin`/`paljonko`/`kuinka`
  are pos `adv`, NOT strippable. `minun`/`minulla` are not lemmas, NOT strippable.
- For an item whose accepted form begins with a strippable pronoun, make every wrong
  differ in a token AFTER the leading pronoun, so stripping the leading word from BOTH
  can never equalize them. Don't write a wrong that only swaps the leading interrogative
  (e.g. accepted `mikä tämä on` + wrong `kuka tämä on` → both → `... tämä on`).

Related: [[wrong-match-collisions]] (the leading-pronoun-position case), [[prompt-answer-coverage]].
