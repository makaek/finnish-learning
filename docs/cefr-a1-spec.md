# CEFR A1 Coverage Audit & A1-Completion Content Spec

> **⚠️ SUPERSEDED (2026-06-09).** This audit was written at ~300 lemmas and its entire
> content plan has since SHIPPED (A1-completion batch 1+2, then the imperative/`tykätä`/breadth
> gap-fill). The live corpus is now ~547 lemmas · 392 sentences · ~77 texts · 25 rules, and a
> fresh gap analysis against the uusikielemme.fi A1 taxonomy found A1 functionally complete.
> **Do not re-run this gap list** — it will re-propose lemmas that already exist. Kept for history.

**Status:** PLANNING / audit only. No seed edits made. This document is for the product
owner to approve before the `finnish-linguist` authors the content.

**Corpus audited (as of 2026-06-08):**
- `data/dictionary.seed.json` — 10 pronouns, 65 verbs (v1–v65), 134 nouns (n1–n134), 43 adjectives (a1–a43), 48 function words (f1–f48). **≈300 lemmas total.**
- `data/sentences.seed.json` — 169 graded sentences (s1–s169).
- `data/texts.seed.json` — 50 reading texts/dialogs (t1–t50).
- `data/rules.seed.json` — 18 grammar reference cards.

**The A1 standard used (verbatim from the product owner's brief)** — A1.1 simple
words/phrases, days, numbers, "Mikä sinun nimi on?"; A1.2 personal Q&A, store
interactions, simple present-tense actions + time; A1.3 listing-style speech on family,
food, weather, daily routines + basic business (store, appointment, doctor) + where
you are / come from / are going.

---

## Headline finding

The corpus is **broad and high quality, but it is not A1 — it is an A1→A2 continuum**,
and it has **specific, named A1.1/A1.2 holes that a CEFR examiner would fail it on.**
The grammar engine (cases, gradation, conjugation, partitive, negation, modals) already
**over-delivers** for A1 — much of it is A2 territory. The *vocabulary and the
can-do functions*, however, have concrete gaps precisely in the "baby" A1.1 layer:
core concrete nouns (kissa, koira, omena, juusto…), **nationalities & language names**,
**numbers as a usable system** (11–99 compounds, ordinals), **months**, and
**telling time beyond whole hours**. Several genuinely-A1 functions (store/prices,
doctor, asking the way) are present but **mis-leveled into 11–12**, so an A1 learner
never reaches them.

**Verdict:** ~75% of A1 *grammar/function* is covered, but only ~60% of the A1
*vocabulary breadth* and ~55% of the A1.1 *concrete-word + numeracy* layer. **A1 is NOT
complete.** The fixes are well-bounded (see size estimate at the end).

---

## 1. Coverage matrix

Legend: **C** = Covered, **P** = Partial, **M** = Missing. IDs cite backing content.

### A1.1 — first words, phrases, days, numbers, "what's your name?"

| Point | Status | Backing / gap |
|---|---|---|
| Simple greetings/phrases (hei, kiitos, anteeksi, kyllä) | **C** | f31 hei, f32 kiitos, f33 anteeksi, f34 kyllä; "Hyvää päivää/iltaa/yötä" in n38/n42/n43; t1, t13, t37 |
| "mitä kuuluu" / "kuinka voit" (how are you) | **P** | f11 kuinka notes "Kuinka voit?" but there is **no lemma `kuulua`**, no drilled sentence, no "Mitä kuuluu?" phrase entry. Greeting small-talk is under-served. |
| "minä olen englantilainen" (I am a nationality) | **M** | **No nationality adjectives/nouns at all** (no englantilainen, suomalainen, venäläinen). Cannot be built. |
| "minä rakastan sinua" | **C** | v31 rakastaa; s79 "Я люблю сестру", s87, s112 |
| Core A1.1 concrete nouns: poika, tyttö, kissa, kirja, pöytä | **P** | poika n54, tyttö n55, kirja n7, pöytä n46 exist — but **at level 7** (poika/tyttö); **kissa MISSING**, koira missing. The canonical A1.1 starter words are scattered to mid-levels or absent. |
| Days of the week | **C** | n75–n81 (maanantai…sunnuntai); rule `days-of-week`; s104, s105 |
| Numbers 0–10 | **C** | f14 nolla … f24 kymmenen |
| Numbers 11–99 (compounds, "fluency") | **P→M** | Only f25 kaksikymmentä (20) and the *pattern* is noted in f24/f25, but **11–19 (yksitoista…), 30/40/50/…/90, and compound units (21, 35, 47) have no entries and no drills.** A learner cannot reliably say "kolmekymmentäviisi". |
| Number 100 / 1000 | **P** | f26 sata (100); **tuhat (1000) missing**. |
| Ordinals (1st, 2nd…) | **M** | **No ensimmäinen, toinen, kolmas…** Needed for dates, floors, "the first time". |
| "Mikä sinun nimi on?" (asking name) | **C** | n20 nimi (notes the idiom); t1 Tutustuminen |

### A1.2 — personal Q&A, store, present-tense actions + time

| Point | Status | Backing / gap |
|---|---|---|
| "Kuka sinä olet?" | **C** | s32; p8 kuka; t17 |
| "Mitä kieltä sinä puhut?" → "Minä puhun englantia ja vähän suomea" | **P** | v6 puhua + suomi (n16) + f43 vähän exist, and s24 drills "puhutko suomea". But **the word `kieli` (language) is missing**, and **only Finnish exists as a language** — no englanti/venäjä/ruotsi/ranska to actually answer "what languages". |
| "Missä sinä asut?" → "Minä asun Helsingissä" | **C** | v7 asua; s4, s33; t4 |
| Store: ask where products are | **C** (mis-leveled) | t6/t26 Kaupassa, t29, t32 "Miten pääsen…"; but these sit at **L4 / L11**. |
| Store: ask prices, understand prices | **C** (mis-leveled) | v16 maksaa, f12 paljonko, n30 hinta, n31 euro; s45, s46, s150; t16 "Paljonko se maksaa?" (L3) — good, but the richer store dialogs are L11. |
| Simple present actions: istua, seisoa, syödä, juoda, katsoa | **P** | syödä v3, juoda v4, katsoa v25 ✓. **istua (sit) MISSING. seisoa (stand) MISSING.** The brief names these explicitly. |
| "me katsomme televisiota", "hän syö ruokaa" | **P** | katsoa v25 + ruoka n14 exist; but **televisio is MISSING** as a lemma (it appears only inside a verb note). |
| Form questions (Istutko sinä?, Missä sinä olet?) | **C** | -ko clitic drilled (s24); `questions` rule; missä (f8). (istua itself missing, see above.) |
| Telling the time — whole hours | **P** | n44 kello; t8 "Kello on kaksi"; **only whole hours.** |
| Telling the time — half / quarter / "at X o'clock" / minutes | **M** | **No puoli, no vartti, no "yli/vaille", no "kello kahdelta / kahdelta".** "Mihin aikaan?" appears once in t8 glosses but is not a teachable lemma. This is a named A1.2 requirement and is essentially absent. |

### A1.3 — listing-style speech: family, food, weather, routines, business, directions

| Point | Status | Backing / gap |
|---|---|---|
| Listing rooms ("Minulla on olohuone, makuuhuone…") | **C** | n88–n91, n45; t23, t24, t25, t49; s126, s132, s134 |
| Listing family ("kaksi siskoa ja veli") | **P** | äiti n17, isä n18, veli n52, sisko n53, perhe n51, lapsi n19, mies n21, nainen n22 ✓; s77, s78; t3, t20. **Missing: isoäiti/isoisä (grandparents), vaimo/mies-as-husband distinction, tytär (daughter) vs poika.** Listing works but is thin. |
| Listing food ("leipää, juustoa, voita ja kurkkua") | **P→M** | leipä n9, kala n35, ruoka n14, maito n34, kahvi n8, tee n32, olut n33 ✓. **Missing the brief's exact words: juusto (cheese), voi (butter), kurkku (cucumber), omena (apple), peruna (potato).** Also missing: liha, kana, riisi, makkara, sokeri, suola, hedelmä, vihannes. Food field is under-built for A1.3 listing. |
| Possessive-suffix listing pattern ("minun siskoni", "perheeni") | **P** | Suffix forms appear *ad hoc* in accepted answers (äitini s37, perheeni s77, kotiani t12) but there is **no rule card and no systematic drill** for `-ni/-si/-nsa`. A1.3 leans on this; it is taught only by osmosis. |
| Weather small-talk | **C** | sää n36, ilma n37, sataa v50, aurinko n66, sade n67, lumi n68, kylmä/lämmin/kuuma a5–a7, pilvinen/aurinkoinen a42/a43; s56, s101–s103, s163–s168; t19, t33, t36, t41 |
| Daily routine (herätä, nukkua, syödä, mennä töihin) | **C** | v23 nukkua, v24 herätä, v25 katsoa, n39 aamu, n42 ilta; s61–s63, s69, s70; t9 "Minun päiväni", t42 |
| Order in a store / café | **C** (mis-leveled) | v17 tilata; s47; t5 Kahvilassa (L4), t6/t26 |
| Reserve an appointment (varata aika) | **M** | **No `varata` (reserve), no `aika` (appointment) lemma.** No booking dialog. The doctor dialog t35 exists but the learner never *books* — they only describe symptoms. |
| Explain symptoms to a doctor | **C** (mis-leveled) | kuume n125, flunssa n126, lääke n127, sairas a39, kipeä a41, pää/vatsa/kurkku; v60 sairastua, v59 parantua; s156–s167; t35 Lääkärissä — **but at L12.** |
| Where you ARE (inessive/adessive) | **C** | s9, s43, s100; inessive rule |
| Where you COME FROM (mistä + elative) | **P** | v11 tulla notes "Tulen kaupasta"; s44 uses kaupasta; **but `mistä` is NOT a lemma** (only mentioned in f8's note), and there is **no "Mistä sinä olet/tulet?" / "Mistä maasta?" drill** — a core A1.3 can-do. n70 maa notes "Mistä maasta?" but it is never exercised. |
| Where you are GOING (mihin + illative) | **P** | Illative thoroughly drilled (s1, s6, s8, s42…); **but the question word `mihin` is not a lemma** (only in f8/s33 wrong-answers). "Mihin sinä menet?" is not a positive drill. |
| Directions (oikealle, vasemmalle, suoraan) | **C** (mis-leveled) | f38–f40; v54 kääntyä, v55 jatkaa; s143, s144; t7, t32 — at L5/L11. |

---

## 2. The gaps, concretely

**Numbers.** This is the single biggest *systemic* hole. We have 0–10, plus 20 and 100
as isolated tokens. We are missing: **11–19** (yksitoista, kaksitoista … yhdeksäntoista),
the **even tens 30–90** (kolmekymmentä, neljäkymmentä, viisikymmentä, kuusikymmentä,
seitsemänkymmentä, kahdeksankymmentä, yhdeksänkymmentä), and crucially the **compound
pattern** (kaksikymmentäyksi = 21, neljäkymmentäkolme = 43) drilled so a learner can
produce arbitrary 0–100. **tuhat** (1000) is also missing. **Ordinals are entirely
absent** (ensimmäinen, toinen, kolmas, neljäs, viides…) — needed for dates, floors,
"первый раз".

**Days AND months.** Days: **complete** (n75–n81). Months: **entirely missing** — no
tammikuu…joulukuu. A1.1/A1.3 (dates, birthdays, seasons-in-months) needs them.

**Telling time.** Only whole hours ("Kello on kaksi"). Missing the whole half/quarter
machinery: **puoli** (puoli kolme = half past two — note the Finnish "half *to*" logic,
a known Russian-speaker trap), **vartti / varttia** (quarter), **yli** (past) and
**vaille** (to), and the **"at X o'clock" adessive-of-number idiom** ("kello kahdelta"
/ "kahdelta", "Mihin aikaan?"). This is a named A1.2 requirement and is ~10% covered.

**Everyday action verbs named by A1.** Present in corpus: syödä (v3), juoda (v4),
katsoa (v25), kuunnella (v26), nukkua (v23), kirjoittaa (v27), lukea (v9). **Missing the
brief's explicit examples:** **istua (sit), seisoa (stand)**. Also worth adding for
routine listing: **pukea / pukeutua (dress), peseytyä/pestä (wash), syödä aamiaista**,
and **leikkiä (play, of children)**. `televisio` as a noun is missing (only in a note).

**Nationalities + languages.** **Entirely missing as a field.** Need nationality words
(suomalainen, venäläinen, englantilainen, ruotsalainen, and a few more) and the
**language-name set** (suomi ✓, but **englanti, venäjä, ruotsi, ranska, saksa** missing),
plus the noun **kieli** (language). The grammar (puhua + partitive language) is taught
(s24), so this is purely a *vocabulary fill* that unlocks a whole A1.2 can-do
("Mitä kieltä puhut?").

**"Where from / where to."** Cases are drilled, but the **question words `mistä` and
`mihin` are not lemmas** and have **no positive drills** ("Mistä sinä tulet?",
"Mihin sinä menet?", "Mistä maasta sinä olet?"). Add the lemmas + 3–4 sentences each.
`asua` + inessive is fully covered.

**Store / price phrases.** Vocabulary and grammar **present** (maksaa, paljonko, hinta,
euro, tilata, ostaa, kassa, kortti) and there are good dialogs (t5, t6, t16, t26).
**Issue is leveling, not coverage** — the transactional dialogs are L4/L11. Minor lexical
adds: **"Saanko…?"** ordering frame exists (v20 saada note) but isn't drilled as a store
phrase; **kuitti (receipt), pussi (bag), alennus (discount)** are optional A1.3 polish.

**Appointment booking.** **Missing.** Need **varata** (to reserve/book) and **aika** in
the "appointment" sense, plus one booking dialog (doctor/hairdresser) and 2–3 sentences
("Haluan varata ajan", "Minulla on aika kello kaksi").

**Basic doctor-symptom phrases.** **Present** (kuume, flunssa, lääke, sairas, kipeä,
body parts n119–n124, sairastua, parantua; s156–s167; t35). **Issue is leveling (L12).**
Optional adds: **särkeä / sattua** as proper lemmas ("päätä särkee" appears only in a
note), **yskä (cough), nuha (runny nose), kurkkukipu**.

**Core everyday nouns.** Present: pöytä, kirja, poika, tyttö, talo, auto, koti, etc.
**Missing high-frequency A1.1 concretes:** **kissa, koira** (cat/dog — textbook
first words), **televisio, tietokone, kynä, paperi, kello-as-watch, raha ✓, kauppa ✓**.
Food concretes listed above. **Clothing** is decent (takki, paita, kenkä) but **housut
(trousers), hattu, sukat** are missing for A1.3 listing.

**Family terms.** Core present; missing **isoäiti, isoisä, vaimo, tytär, vanhemmat
(parents), lapset ✓**. Thin but functional.

**Possessive-suffix listing pattern.** Used but never *taught*. Needs a **rule card**
(`-ni/-si/-nsa/-mme/-nne/-nsa`) and a short drill set so A1.3 listing ("perheeni",
"siskoni", "huoneeni") is systematic, not incidental.

**Overall vocab breadth.** Current ≈300 lemmas. The A1 norm the brief cites is
**~500–750 words**. We are **~40–55% of the way** by raw count, and the missing slice is
disproportionately the **high-frequency A1.1 concrete layer** (animals, foods,
nationalities, numbers-as-system, months) — i.e. the gaps hurt more than the count
suggests.

---

## 3. A1-completion content spec (buildable plan)

### 3a. Vocabulary to add (grouped; counts are target lemmas)

| Field | Count | Example lemmas |
|---|---|---|
| **Numbers 11–19** | 9 | yksitoista, kaksitoista, kolmetoista, neljätoista, viisitoista, kuusitoista, seitsemäntoista, kahdeksantoista, yhdeksäntoista |
| **Tens 30–90 + 1000** | 8 | kolmekymmentä, neljäkymmentä, viisikymmentä, kuusikymmentä, seitsemänkymmentä, kahdeksankymmentä, yhdeksänkymmentä, tuhat *(20, 100 already exist)* |
| **Ordinals 1st–10th** | ~8 | ensimmäinen, toinen, kolmas, neljäs, viides, kuudes, seitsemäs, kymmenes |
| **Months** | 12 | tammikuu, helmikuu, maaliskuu, huhtikuu, toukokuu, kesäkuu, heinäkuu, elokuu, syyskuu, lokakuu, marraskuu, joulukuu |
| **Telling-time words** | ~5 | puoli, vartti, yli, vaille, aika (+ idiom "kello kahdelta", "Mihin aikaan?") |
| **Nationalities** | ~6 | suomalainen, venäläinen, englantilainen, ruotsalainen, amerikkalainen, saksalainen |
| **Language names + "kieli"** | ~6 | kieli, englanti, venäjä, ruotsi, ranska, saksa *(suomi exists)* |
| **Everyday action verbs** | ~6 | istua, seisoa, leikkiä, pukeutua, peseytyä, soittaa-as-call ✓(have)/add **särkeä, sattua** for symptoms (≈2 more) |
| **Core concrete nouns (animals/objects)** | ~8 | kissa, koira, televisio, tietokone, kynä, paperi, lehti, kuva |
| **Food field** | ~12 | juusto, voi, kurkku, omena, peruna, liha, kana, riisi, makkara, sokeri, suola, hedelmä |
| **Family extras** | ~5 | isoäiti, isoisä, vaimo, tytär, vanhemmat |
| **Clothing extras** | ~4 | housut, hattu, sukat, mekko |
| **Question words as lemmas** | ~3 | mistä, mihin, kuinka-monta *(also surface `montako`)* |
| **Greeting/small-talk + transaction frames** | ~5 | kuulua ("Mitä kuuluu?"), varata, aika(appointment), kuitti, pussi |
| **TOTAL NEW VOCAB** | **≈95–105** | brings the dictionary from ≈300 → **≈400 lemmas** |

> Note: ≈400 still sits at the low end of the 500–750 A1 norm, but it covers **all the
> named A1 can-dos**. If the owner wants to hit the mid-norm, a further ~100 thematic
> nouns (transport, town, body, nature — many partially present) would do it; flagged as
> optional Phase 2.

### 3b. Grammar / function additions (with drill-sentence sizing)

| Addition | Drills | Notes |
|---|---|---|
| **Numbers 11–99 compound production** | ~12 | "Minulla on kaksikymmentäviisi euroa", phone numbers, ages. New rule card "Числа 11–100". |
| **Ordinals + dates** | ~6 | "Tänään on toinen maaliskuuta", "ensimmäinen kerta". |
| **Telling time (half/quarter/at X)** | ~10 | "Kello on puoli kolme", "vartin yli kaksi", "Tulen kello kahdelta". Rule card "Который час" (warn: Finnish puoli = half *to*). |
| **Nationalities + "Mitä kieltä puhut?"** | ~6 | "Olen venäläinen", "Puhun venäjää ja vähän suomea", "Hän on suomalainen". |
| **"Mistä?" / "Mihin?" Q&A** | ~8 | "Mistä sinä olet?" → "Olen Venäjältä", "Mihin menet?" → "Menen kauppaan", "Mistä maasta?". (Introduces -lta/-lle for countries lightly.) |
| **istua/seisoa + present-action set** | ~6 | "Minä istun", "Sinä seisot", "Lapsi leikkii", "Katsomme televisiota". |
| **Possessive suffixes (-ni/-si/-nsa)** | ~8 | "Tämä on siskoni", "perheeni on iso", "huoneeni". New rule card. |
| **Appointment booking** | ~4 | "Haluan varata ajan", "Minulla on aika kahdelta". |
| **Food listing (A1.3)** | ~6 | "Syön leipää, juustoa ja kurkkua", "Ostan omenoita ja perunoita". |
| **Small-talk frame** | ~3 | "Mitä kuuluu?" → "Kiitos, hyvää". |
| **TOTAL NEW SENTENCES** | **≈70–75** | brings sentences from 169 → **≈240**. |

New **rule cards** needed: (1) Числа 11–100 (compound formation), (2) Который час
(time-telling), (3) Притяжательные суффиксы, (4) Национальности и языки. → **4 rule cards**
(18 → 22).

### 3c. Reading texts / dialogs to add

These exercise A1.2/A1.3 conversational + transactional can-dos **at an A1-appropriate
level** (see boundary section). Many overlap thematically with existing L11–12 dialogs but
must be re-pitched simpler/earlier.

| New text/dialog | Type | Exercises |
|---|---|---|
| "Mistä sinä olet?" | dialog | nationality + country origin (mistä/-lta), "Mitä kieltä puhut?" |
| "Paljonko kello on?" (extended) | dialog | half/quarter/"at X o'clock" — **replaces/extends** the whole-hours-only t8 |
| "Kaupassa" (A1 version) | dialog | ask where products are, ask price, "Saanko…", pay — simpler twin of t6/t26, pitched early |
| "Varaan ajan" | dialog | booking an appointment (doctor or hairdresser) |
| "Lääkärissä" (A1 version) | dialog | symptoms — simpler twin of t35, pitched early |
| "Numerot ja ikä" | text | numbers 11–99 + age + phone number in context |
| "Minun viikkoni" | text | days + months + ordinal dates + routine |
| "Perheeni ja minä" (A1 version) | text | family + food listing with possessive suffixes |
| **TOTAL NEW TEXTS** | **≈8** | brings texts from 50 → **≈58** |

### 3d. Total size estimate

| Asset | Now | Add | After |
|---|---|---|---|
| Dictionary lemmas | ≈300 | **≈100** | ≈400 |
| Graded sentences | 169 | **≈72** | ≈241 |
| Reading texts/dialogs | 50 | **≈8** | ≈58 |
| Rule cards | 18 | **4** | 22 |

**Bottom line: ≈100 vocab + ≈72 sentences + ≈8 texts + 4 rules to make A1 genuinely
complete** against the cited standard. (An optional Phase-2 of ~100 more thematic nouns
would push breadth to the mid-A1 norm but is not required for can-do completeness.)

---

## 4. Boundary recommendation (A1 vs A2; where "A1 complete" falls)

**Do not force A1/A2 onto the existing 12 levels.** The current `level` field is a
*difficulty/SRS ordering*, and it currently mixes true-A1 functions into late levels
(store at L4/L11, doctor at L12, directions at L5/L11, comparative at L9). CEFR-wise:

- **Genuinely A1 grammar already in the corpus:** present tense + person, negation
  (ei + connegative), the local cases (inessive/elative/illative/adessive), partitive
  basics (mass/number/negation object), genitive possession + total object, copula
  predicative, basic questions (-ko, mikä/kuka/missä), modals + infinitive, the core
  conjunctions (ja/mutta/että/koska/kun/jos), days, simple weather.
- **Already in the corpus but really A2 (leave in, but don't call it "A1"):** the
  **comparative** (`comparative` rule, s120–s122, f37 kuin), the **allative as dative for
  recipients** (s110, s111, s123, allative rule), finer object-aspect contrasts, the
  larger abstract-noun/emotion vocabulary (a27–a32, n82–n87), and several L8–L12 verbs
  (saapua, liikkua, ehtiä, etc.). These are fine to keep as "stretch" content.

### Recommended structure

1. **Introduce an explicit CEFR band tag** (e.g. `cefr: "A1.1" | "A1.2" | "A1.3" | "A2"`)
   on dictionary/sentence/text entries, **decoupled from the numeric `level`.** This lets
   the app say "A1 complete" without renumbering 12 levels or relocking anything (matches
   the existing balance-gate philosophy of never relocking).

2. **Map the bands onto levels roughly as:**
   - **A1.1 → Levels 1–3**, **A1.2 → Levels 4–6**, **A1.3 → Levels 7–9**,
     **A2 → Levels 10–12.**
   - Under this map, **"A1 complete" falls at the end of Level 9** once the gaps are
     filled. (Today the corpus already runs to L12, so A1-completion does **not** require
     new levels — it requires *filling and re-banding*, not extending.)

3. **Fill the A1.1/A1.2 holes into the EARLY levels, not the end.** The new numbers,
   months, time-telling, nationalities/languages, istua/seisoa, mistä/mihin, food
   concretes, and possessive suffixes belong at **Levels 2–6**. They are foundational;
   putting them late would leave the early experience with the exact gaps a CEFR examiner
   targets.

4. **Reconcile the mis-leveled transactional functions (store/prices L11, doctor L12,
   directions L11) — RE-LEVEL the simple core down, DUPLICATE only the hard polish up.**
   Concretely:
   - **Re-level (move earlier):** the *basic* "ask price / ask where / pay" store
     interaction and the *basic* "I'm sick / I have a fever / rest at home" doctor
     exchange and the *basic* "turn right / go straight" directions are **A1.2/A1.3** and
     should be reachable by **L4–L6**. Author the new A1 twin dialogs (3c) at those levels
     rather than physically moving t6/t26/t35 (which carry L11–L12 vocabulary like
     kauppakeskus, terveys, kortti and are fine where they are).
   - **Keep at L11–L12 (as A2 "polish"):** the richer versions with bigger vocabulary
     (kauppakeskus shopping, clothing-fitting `sopia`, detailed symptom/recovery talk,
     multi-step navigation). Tag them `A2`.
   - Net effect: the learner meets each transactional can-do **first in a small A1 form
     early**, then meets a **richer A2 form later** — duplication is intentional and
     pedagogically correct (spiral curriculum), not redundancy.

5. **Sequencing note for the author pass:** numbers/time/nationalities have no new grammar
   risk (the case/partitive machinery to support them already exists and is verified), so
   they are low-risk, high-coverage wins to author first. The two genuinely new grammar
   points — **possessive suffixes** and **time-telling idioms (puoli = "half to")** —
   carry Russian-speaker traps and should get explicit rule cards + extra wrong-answer
   patterns.

---

## Appendix — what is already strong (do not rebuild)

- Local-case system (inessive/elative/illative/adessive/allative) — thoroughly drilled,
  verified, with Russian "где/куда/откуда" framing.
- Partitive (mass / post-number / negation / process-object) — excellent coverage and
  wrong-answer scaffolding.
- Verb conjugation across all 6 types, gradation, past tense, negation, modals — complete
  for A1 and beyond.
- Predicative case (nominative vs partitive on countable vs mass subjects) — verified,
  with a dedicated rule and many drills.
- Days, weather, daily-routine vocabulary and reading texts — solid.
- The 50 reading texts give good A1.2/A1.3 *exposure*; the gap is in the *productive
  drill + dictionary* layer, plus the specific A1.1 lexical/numeracy holes above.
