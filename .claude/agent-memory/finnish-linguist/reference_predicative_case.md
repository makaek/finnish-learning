---
name: predicative-case
description: Finnish predicative case rule — nominative for countable subjects, partitive for mass nouns; needed when authoring 'X on Y' sentences
metadata:
  type: reference
---

When authoring predicative ("X on Y") sentences, the predicate case depends on the
SUBJECT, and this is a frequent place to seed/grade errors for Russian speakers (Russian
has no such split):

- **Countable / individuated subject -> predicative in NOMINATIVE.** `Talo on iso.`
  (not *isoa*). `Olen opiskelija.` (identity noun, nominative — not *opiskelijaa*).
- **Mass / uncountable subject -> predicative in PARTITIVE.** `Kahvi on hyvää.`
  (the coffee, as a substance, is good — *hyvä* would be marked/odd here). `Vesi on
  kylmää`. The subject itself stays nominative (`kahvi`, not *kahvia*).

Good Russian-speaker wrong patterns to encode: nominative where partitive is needed
(`kahvi on hyvä`), and partitive where nominative is needed (`talo on isoa`,
`olen opiskelijaa`).

See `data/sentences.seed.json` s13 (Talo on iso), s14 (Kahvi on hyvää), s29 (Olen
opiskelija) for verified examples.
