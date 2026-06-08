# CEFR milestones & the path to a complete A1

This is the curriculum's CEFR framing and a concrete plan for "finishing A1", based on the
`finnish-linguist`'s audit of the full corpus (dictionary + sentences + 50 reading texts).

> **Superseded:** the rigorous audit + completion spec now lives in
> [`cefr-a1-spec.md`](./cefr-a1-spec.md). The band map below is the current (sub-band) version.

## Band map (level → CEFR)
Assigned by the finnish-linguist from the actual content (encoded in `src/core/curriculum.ts`),
A1 split into its three sub-levels:

| Levels | Band | |
|---|---|---|
| 1–3 | **A1.1** | first words/phrases, greetings, numbers, days, "Mikä sinun nimi on?". |
| 4–6 | **A1.2** | personal Q&A, store/prices, present-tense actions + telling time, nationalities/languages. |
| 7–9 | **A1.3** | listing-style speech (family/food/rooms), routines, business (store/appointment/doctor), where from/to. |
| 10–12 | **A2** | comparatives, `että`-clauses, fuller case-government, transport, seasons/health, future. |

"**A1 complete**" = levels 1–9 mastered. A1 content gaps are being filled into the early levels
(see the spec); nothing relocks.

The app shows **progress toward the next milestone** in two places:
- **Home** — a compact `A1 ▓▓▓░ NN%` strip under the streak (`CefrBar`), tap → Метрики.
- **Метрики/dashboard** — an "Уровень владения (CEFR)" card: the same bar plus a per-band level
  breakdown (each level marked done ✓ / current / upcoming).

"Progress" = mean smoothed completion across the band's levels, where a level reads 100% at the
same advancement threshold (`LEVEL_COMPLETE_FRACTION`) that rolls the displayed level over. Finish
every A1 level → the milestone flips to A2.

## Is A1 done? — grammar yes, vocabulary light
**A1 grammar is essentially complete and verified**: present tense (all persons/types), past tense,
negation + connegative, yes/no + wh- questions, the local-case system, partitive (object / mass /
post-numeral / negation), genitive + total object, adessive possession, adjective agreement,
modals + infinitive, necessity, the core conjunctions, numbers, and time/weather idioms — all with
checked forms and drill sentences.

**What's thin for a confident "A1 complete":**
- **Vocabulary breadth** — ~300 content lemmas present; CEFR A1 wants ≈500–750. Gaps in everyday
  fields: more clothing, common foods (omena, peruna, liha, juusto, sokeri), professions, and
  high-frequency verbs (istua, seisoa, laittaa, pestä, leikkiä, laulaa, rakentaa).
- **Numbers** — stop at `sata` with few compound tens; A1 wants fluent 0–100 + first ordinals
  (ensimmäinen, toinen).
- **Plurals** — partitive plural is taught, but the **nominative plural** as a productive pattern
  (talot, kirjat, lapset) and basic plural agreement aren't drilled.
- **Possessive suffixes** — appear lexically (nimeni, perheeni) but aren't taught as a system.
- **Telling time** — beyond "kello on kaksi" (half/quarter, "at X o'clock").
- A few everyday function words / postpositions (liian, melko, todella; kanssa, vieressä) used in
  texts but missing as dictionary entries.

## Concrete plan to call A1 complete
Roughly, one more linguist content drop:
- **+150–200 vocabulary entries** across the everyday gaps above.
- **+10–12 number/ordinal entries** (rest of 0–100 + first ordinals).
- **3–4 small grammar additions + ~25–30 new drill sentences**: nominative plural & plural
  agreement, possessive suffixes as a pattern, fuller time-telling, a handful of postpositions.

That moves the trainer from "A1 grammar covered, A1-vocab-light" to a genuinely complete A1, with
comfortable A2 reach already in levels 7–12. (Not scheduled yet — this is the scoped next step.)
