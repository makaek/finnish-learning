# Memory Index

- [Diacritic minimal pairs](reference_diacritic_minimal_pairs.md) — ä/a, ö/o pairs that break the produce.ts "missing dots" hint; check before deck expansion
- [Wrong-match collisions](reference_wrong_match_collisions.md) — sentences.seed.json integrity trap: wrong.match must not collapse onto an accepted form after auto pronoun-drop
- [Predicative case](reference_predicative_case.md) — nominative vs partitive predicate (Talo on iso / Kahvi on hyvää); rule for 'X on Y' sentences
- [Prompt/answer coverage](reference_prompt_answer_coverage.md) — manual audit the integrity test misses: every RU content word must surface in FI; every FI word must be a dict entry/inflection in `uses`
- [Pronoun strip-set](reference_pronoun_strip_set.md) — grader strips EVERY pos=="pronoun" lemma when it leads an answer; adding mikä/kuka/tämä/se creates new collision risk in question sentences
