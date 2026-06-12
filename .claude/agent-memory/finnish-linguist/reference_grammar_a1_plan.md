---
name: grammar-a1-plan
description: The full A1 grammar-mode curriculum (Modules A/B/C/D) — ALL DONE (20 topics/545 items in grammar.seed.json); per-topic level/prereq/lemma map + the dictionary edits each pass made
metadata:
  type: reference
---

The A1 grammar curriculum for `data/grammar.seed.json`. Levels are the EXISTING
curriculum levels (src/core/curriculum.ts is authoritative: A1.1=1-3, A1.2=4-7,
A1.3=8-11; A2.1=12-16, A2.2=17-19). Grammar topics FEED level completion + the balance
gate. Invariants the integrity tests assert: topic.level present & 1-19; every
prereq.level <= topic.level; every topic has >=2 sets; every set has >=1 warmup + >=1
drill. NOTE: src/core/levelTitles.ts header comment is STALE (says A2=10-12); trust
curriculum.ts.

**Level assignment rule used:** match the level's theme (levelTitles.ts) AND drill only
words unlocked by that level (dictionary `level` field). Prefer earliest level where
the skill + enough vocab are available.

### Module B — Глагол (verb)  [DONE pass 1-2, 3 sets each]
- `endings` L1  (личные окончания; puhua/asua/ostaa/lukea/sanoa — all level 1-2)
- `vt1` L2  prereq endings  (тип 1; nukkua/lukea/antaa/ostaa/sanoa/tietää/maksaa)
- `vt2` L2  prereq vt1  (тип 2; syödä/juoda/tehdä/nähdä/voida/saada — all <=8, core <=2)
- `vt3` L2  prereq vt1  (тип 3; mennä/tulla/olla/opiskella/kuunnella/nousta)
- `vt4` L6  prereq vt1  (тип 4; haluta L2, tilata L6, osata/varata L8, herätä L9, pelata L11)
- `vt56` L12 (A2!) prereq vt4  (типы 5/6; tarvita L16, valita L15, vanheta L19 — lemmas
   are all A2-tier, so this topic deliberately sits at L12, OUTSIDE A1. Kept in the file
   for completeness; not part of A1 completion.)
- `negation` L3  prereq vt1  (ei + коннегатив; reuses core verbs)

### Module A — Механика (mechanics)  [DONE pass 2, 3 sets each, module id "mechanics", n:0]
- `vowel-harmony` L1  prereq none  (гармония a/o/u vs ä/ö/y; rule:partitive). Drills
   inessive -ssa/-ssä, partitive -a/-ä, he -vat/-vät on talo/koulu/työ/leipä/auto/kirja
   + verbs. Distractor pattern = wrong-harmony ending (talossä, työssa, syövat).
- `gradation-1` L2  prereq none  (чередование I: kk/k, pp/p, tt/t; kauppa, lettu, nukkua,
   kirjoittaa, auttaa, odottaa). NOTE: low-level kk-NOUNS don't exist (kukka L12,
   pankki L15), so kk is drilled via the VERB nukkua — fine, the pattern is what counts.
- `gradation-2` L2  prereq gradation-1  (чередование II: k→∅, p→v, t→d, nk→ng, nt→nn;
   lukea, leipä, äiti, ruoka, kaupunki, lehti, antaa, tietää). k→∅ rendered with EMPTY
   highlight `lu[]e{n}`, `ruo[]an` — code must treat empty `[]` as a zero-width alt span.
   Each gradation set's 5th drill is a SHARP-STEP/partitive item ("чередования НЕТ").
   (NB Module B vt1 already leans on gradation in distractors — these A-topics formalize it.)
Module A item ids: vh-*, grad1-*, grad2-* (set 2/3 use -s2-/-s3- infix). 81 items added;
grammar.seed.json now 10 topics / 275 items.

### Module C — Падежи (cases)  [DONE pass 3, 3 sets/topic, module id "cases" n:2]
7 topics, 21 sets, ~140 new items (grammar.seed.json now 17 topics). case_id item type
USED for recognition (25 case_id items; same shape as classify: prompt_fi+prompt_ru+
options_ru+answer+reasons_ru+ok_ru+correct_ru; stage MUST be warmup/drill, NOT the type).
Topic orders 20-26 (global sort, module groups in UI).
- `stems` L2 (MOVED from L1!) prereq gradation-2. RESOLUTION of the L1-vs-gradation-2(L2)
   prereq conflict: moved stems to L2 (kept the gradation-2 prereq) rather than dropping
   it — stem-alternation and gradation are the same "dict form hides the real stem"
   phenomenon, and stems' drill nouns (vesi→vede-, leipä, naine-) interleave gradation, so
   gradation-2-first is linguistically right. rule:cases-overview. Lemmas: nainen/nimi/
   suomi/vesi (s1), huone/ovi (s2), vesi paradigm (s3). huone/ovi are L9 but the only clean
   -e/-i stem demonstrators; led with low-level words.
- `genitive` L2 prereq stems (генитив -n + слабая ступень; talo/kauppa/äiti/koti/leipä/
   koulu + minun/sinun). rule:genitive-total-object + consonant-gradation.
- `partitive` L3 prereq stems (вещество/процесс/отрицание/rakastaa; kahvi/leipä/vesi/suomi/
   ruoka/tee/maito/auto). rule:partitive.
- `inside-locatives` L4 prereq stems (-ssa/-sta/-Vn; kauppa/koulu/talo/Helsinki + koti
   irregular kotona/kotiin). rule:inside-locatives.
- `outside-locatives` L7 prereq inside-locatives (-lla/-lta/-lle + средство; tori/katu(t→d)
   + auto/juna/bussi/polkupyörä as means). rule:adessive + allative. NOTE: did NOT use
   asema for -lla (dict stores asemassa = regular inessive); used tori (n108) + katu (n28),
   both dict-confirmed adessive-place words.
- `possession` L7 prereq outside-locatives (minulla on; auto/koira/kissa nom vs rahaa part;
   ei ole + part; minulla/sinulla/hänellä/meillä). rule:adessive.
- `object-cases` L11 prereq genitive,partitive (полный генитив vs партитив; kirja/kahvi/
   auto/leipä/ruoka; ostaa/lukea/juoda/syödä; отрицание→part). rule:object-total-partitive.
Item-id scheme: `<topic>-w*/-d*` (set1), `<topic>-s2-*`, `<topic>-s3-*`. fill_table needs
>=4 cells (test asserts) — padded locative/means/possession tables with a genitive/partitive/
extra-person 4th cell. All forms dict-verified; needs_review:false throughout.

### Module D — Согласование и числа (agreement)  [DONE pass 4, 3 sets/topic, module id "agreement" n:3]
3 topics, 9 sets, 81 items (grammar.seed.json now 20 topics / 545 items). Orders 30-32.
A1 GRAMMAR CURRICULUM AUTHORING COMPLETE (Modules A/B/C/D all done).
- `numbers-partitive` L4 prereq partitive (число >1 → ПАРТИТИВ ЕД.Ч., not plural: kaksi
   taloa/kolme kissaa/viisi euroa; yksi→номинатив; gармония -a/-ä). rule:numbers-11-100 +
   partitive. Lemmas: talo/kissa/euro (s1), kirja/auto/koira (s2), kahvi/leipä/tunti (s3).
- `telling-time` L8 prereq numbers-partitive (Kello on kaksi; PUOLI TRAP puoli kolme=2:30
   half-TO; vartin yli=after, varttia vaille=before; «в X часов»=аблатив kahdelta/viideltä/
   neljältä from number gen-stem kahde-/viide-/neljä-; Paljonko kello on?). rule:telling-time
   + numbers-11-100. Mostly case_id+choose_form for the puoli/yli/vaille traps (those readings
   aren't single-word produce items); produce_form only for verified forms.
- `adjective-agreement` L11 prereq genitive,inside-locatives (adj repeats noun's case:
   isossa talossa, uuden auton, isoon taloon, uudessa autossa). rule:adjective-agreement +
   inside-locatives. Lemmas: iso+talo/uusi+auto (s1), vanha+talo/pieni+auto (s2),
   uusi+auto/vanha+kirja/pieni+kissa (s3).

DICTIONARY EDIT (this pass): adjectives previously stored only gen_sg/part_sg — added
`iness_sg`+`illat_sg` (and gen_sg where missing) to the 4 agreement adjectives per the noun
schema so every drilled form is a stored verified field: a2 iso (ison/isossa/isoon), a3 pieni
(+pienessä/pieneen), a4 uusi (+uudessa/uuteen), a13 vanha (+vanhassa/vanhaan). All corpus-
confirmed (sentences.seed has isossa/vanhassa/pienessä talossa, uuden auton). needs_review:false.

A2/Module E (imperative, conditional, perfect, passive, 3rd inf, vt56-as-A2) excluded
from A1 plan — later initiative.

### Dictionary `+add` notes
- Module C used tori (n108) + katu (n28) for -lla places (NOT asema — it stores asemassa).
- Module D added iness_sg/illat_sg to adjectives a2/a3/a4/a13 (see above). If a later pass
  drills agreement on more adjectives, add the same case fields first.
- vt56 already covered (tarvita v56, valita v57, vanheta v134).

Related: [[grammar-mode-verbtypes]] (schema, markup, verb-type rules).
