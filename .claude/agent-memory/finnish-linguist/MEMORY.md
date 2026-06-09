# Memory Index

- [Diacritic minimal pairs](reference_diacritic_minimal_pairs.md) — ä/a, ö/o pairs that break the produce.ts "missing dots" hint; check before deck expansion
- [Wrong-match collisions](reference_wrong_match_collisions.md) — sentences.seed.json integrity trap: wrong.match must not collapse onto an accepted form after auto pronoun-drop
- [Predicative case](reference_predicative_case.md) — nominative vs partitive predicate (Talo on iso / Kahvi on hyvää); rule for 'X on Y' sentences
- [Prompt/answer coverage](reference_prompt_answer_coverage.md) — manual audit the integrity test misses: every RU content word must surface in FI; every FI word must be a dict entry/inflection in `uses`
- [Pronoun strip-set](reference_pronoun_strip_set.md) — grader now strips ONLY the 6 personal subject pronouns (hardcoded set ∩ dict); mikä/kuka/tämä/se safe again
- [Weather & location cases](reference_weather_and_location_cases.md) — L11/L12 verified: impersonal weather on+PARTITIVE adj; which places take adessive -lla vs inessive; käydä/mennä/sopia/aikoa government
- [Texts schema & weather register](reference_texts_schema_and_weather_register.md) — texts.seed.json bilingual titles (title=FI + titleRu); corpus keeps NOMINATIVE on kylmä/lämmin for impersonal weather (deliberate, don't "fix")
- [Numbers, time & possessives](reference_numbers_time_possessives.md) — A1-completion drop facts: compound numbers (one word, partitive sg after), puoli=half-TO trap, possessive suffixes, nationalities/languages, ablative origin
