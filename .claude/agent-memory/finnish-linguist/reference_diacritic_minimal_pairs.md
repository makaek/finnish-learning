---
name: diacritic-minimal-pairs
description: Finnish ä/a and ö/o minimal pairs that break the "missing dots" hint in produce.ts; check before expanding the deck
metadata:
  type: reference
---

The typed-production grader (`src/core/produce.ts`) folds ä→a, ö→o, å→a to detect a
"right word, you just dropped the dots" near-miss. It deliberately does NOT fold y
(y is a full phonemic vowel /y/, not a diacritic of u — folding it would be wrong).

**Risk:** if the deck ever contains two distinct lemmas that differ ONLY by ä/a or
ö/o, the fold makes them collide and the hint lies ("you missed the dots" when the
learner actually typed a different word).

As of the A1 seed deck (data/dictionary.seed.json, ~35 entries) there are NO such
collisions — verified by folding every dotted lemma and comparing against all others.
Folding å is harmless: å appears in no deck entry (defensive for future loanwords).

**Known real Finnish minimal pairs to watch for when expanding the deck** (any pair
here, if both members enter the deck, breaks the hint): sää/saa, hän/han, säde/sade,
tällä/talla, tölkki/tolkku, töitä/toita, sänky/sanky-type, päivä-bare-vowel confusions.
Check new entries against existing lemmas (folded) at /expand-sentences time.
