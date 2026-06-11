---
name: ru-error-patterns
description: Recurring Russian-speaker English errors verified while authoring the A1 deck — encode these in sentence/question `wrong[]` arrays and flag them when grading
metadata:
  type: project
---

High-frequency Russian-L1 mistakes encoded across the A1 sentence deck (use as the `wrong[]`
template for new items; explain, don't hand-wave):

1. **Dropped copula** — "I student" / "the coffee hot" / "the bank next to the station". Russian drops
   "to be"; English never does. #2 source of error overall.
2. **Missing/extra article** — "I have dog" (need a), "I drink a coffee" (uncountable, no a),
   "to bank" (need the). #1 source of error.
3. **do/does/did support** — present: "you speak english", "she don't eat"; PAST: "you went to work
   yesterday" (need did) and "i didn't bought" / "did you went" (bare verb after did/didn't).
4. **3rd-person -s** — "he like", "she sleep"; and the -s moving onto does/doesn't.
5. **Overgeneralized regular past** — "goed/buyed/seed/haved/payed" instead of went/bought/saw/had/paid.
   was vs were ("we was", "i were", "the shoes was").
6. **Preposition mismatches (rarely 1:1)** — wait FOR, pay FOR, listen TO, go TO; "speak on english"
   (no prep), "near to" (no to), "next the station" (need to). Flag prepositions explicitly.
7. **how much vs how many** for price ("how many is the ticket").
8. **Word order** — "from where you are", "what is the time it", adverb placement ("he has always
   breakfast" → "he always has").
9. **Double negative** — "she doesn't never sleep" (never already negates).
10. **Subject vs object pronoun** — "me have a dog", "help i" (need me).

See [[content-pack-layout]] for where these get encoded and the grader normalization rules.
