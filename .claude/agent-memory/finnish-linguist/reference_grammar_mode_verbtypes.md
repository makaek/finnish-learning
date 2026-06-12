---
name: grammar-mode-verbtypes
description: data/grammar.seed.json schema + slice-1 (Module B verb types 1-6 & negation) verified facts; markup conventions and verb-type classification traps
metadata:
  type: reference
---

New grammar-practice mode lives in `data/grammar.seed.json` (separate from
sentences/rules). Slice 1 = Module B (verbs): topics `endings, vt1, vt2, vt3, vt4,
vt56, negation`. Structure: `{ _meta, modules, topics, items }`. Each topic carries a
`theory` card (title/summary/body_ru/examples/paradigm/note_ru) + items tagged
`stage: warmup|drill`. Six item types: classify, choose_form, case_id, produce_form,
transform, fill_table. Prereqs: endings→vt1; vt1→vt2/vt3/vt4/negation; vt4→vt56.

**Topic `level` + item `set` (added 2026-06):** every TOPIC has `level` (1-19 curriculum
level it feeds; mastery now feeds level completion + balance gate). Every ITEM has
`set: 1|2|3` — variant lessons. A run uses ONE set (rotation by run count); mastery
needs passing 2 DIFFERENT sets. Each set = a complete lesson (>=1 warmup + >=1 drill,
in practice 4 warmup + 5-6 drill), SAME skill but DIFFERENT lemmas. Theory card is
shared per topic. Reuse the SAME `review_ru` labels across sets so «Повторите» stays
coherent. Module B now has 3 sets/topic (~28 items each topic; 194 items total).
Per-topic lemma rotation used (so sets don't repeat words): vt1 set1 nukkua/lukea/antaa,
set2 antaa/sanoa, set3 tietää/maksaa; vt2 set1 syödä, set2 tehdä/nähdä/juoda, set3
voida/saada; vt3 set1 mennä, set2 tulla/opiskella/nousta, set3 olla/kuunnella/mennä;
vt4 set1 haluta, set2 tilata/osata/varata, set3 herätä/pelata; vt56 set1 tarvita/vanheta,
set2 valita/tarvita/vanheta, set3 tarvita/vanheta/valita; negation rotates persons+verbs.
The full A1 topic→level plan lives in [[grammar-a1-plan]] — follow it in later passes.

**Markup conventions (code parses these):**
- Finnish form strings (`f`, `canonical`, cell canonical, case_id `prompt_fi`):
  `{…}` = primary highlight (личное/падежное окончание), `[…]` = alt highlight
  (чередование / гласная основы). `accepted`/`wrong.match` are PLAIN (no markup).
- Russian strings (body_ru, note_ru, ok_ru, why_ru, reasons_ru, near_ru…):
  `*…*` wraps a Finnish fragment (rendered bold+tinted).
- `classify`/`case_id`: `answer` = 0-based index; `reasons_ru` keys = 0-based indices
  of wrong options. `choose_form`: `answer` matches an option's `fi`; every WRONG
  option needs `why_ru`. `review_ru` = short reused error-pattern label for the
  end-of-lesson «Повторите» list.

**Verb-type classification (the `classify` items hinge on this — verified):**
- Type 1: vowel + `-a/-ä` (puhua, asua, ostaa, lukea, nukkua, antaa). Has gradation;
  weak grade before -n/-t/-mme/-tte, strong at hän/he + infinitive.
- Type 2: `-da/-dä` after long vowel/diphthong (syödä, juoda, tehdä, nähdä, voida,
  saada). NO gradation. hän form often = bare stem, no vowel doubling (syö, juo, voi).
- Type 3: `-lla/-llä, -nna/-nnä, -rra/-rrä, -sta/-stä` (olla, mennä, tulla, opiskella,
  kuunnella). Stem inserts `-e-`: mene-, tule-, ole-; hän doubles it (menee, tulee).
  olla→hän is irregular `on`.
- Type 4: vowel + `-ta/-tä` (haluta, tilata, osata, herätä). Stem drops the t, ends in
  vowel, often doubled before ending: halua+n→haluan; hän long vowel (haluaa, tilaa).
- Type 5: `-ita/-itä` → stem `-tse-` (tarvita→tarvitsen, valita→valitsen,
  punnita→punnitsen). hän adds -e: tarvitsee.
- Type 6: `-eta/-etä` → stem `-ne-` (vanheta→vanhenen, paeta→pakenen). hän: vanhenee.

**TRAP I corrected in the dictionary this slice:** `v24 herätä` was tagged
`verb_type:6` but herää-/herään is the standard TYPE 4 conjugation (type 6 needs a
`-ne-` stem). Fixed to type 4. Once `classify` items exist, the stored `verb_type`
field is load-bearing — audit it. Spot-check the rest of the dict against the rules
above. (NB existing `v57 valita` is tagged type 4 but is genuinely type 5 -tse- stem;
left untouched — not in this task's scope, flag if a classify item ever uses it.)

**Added to dictionary for B6 coverage:** `v134 vanheta` (type 6, vanhenen). `tarvita`
already existed as v56 (type 5) — did NOT duplicate it.

**Russian-learner error patterns encoded as distractors (reuse these when grading):**
infinitive instead of finite form (puhua for puhun); keeping the inf consonant in the
stem (juodan, halutan, mennän, tarvitan); missing gradation in weak slot (nukkun,
antan, luken); applying gradation/doubling where it shouldn't be (luee, syöö, tilataa);
wrong person (puhuu for minä, tulen for hän); after negation keeping the personal
ending (en puhun, hän ei juon); using `ei` for all persons instead of conjugating it
(ei puhu for «я»); vowel-harmony slips (puhuvät, syövat).

Related: [[pronoun-strip-set]], [[prompt-answer-coverage]], [[predicative-case]].
