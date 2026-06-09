---
name: numbers-time-possessives
description: Verified forms & traps for the A1-completion drop — compound numbers, ordinals, telling-time idioms (puoli = half-TO), possessive suffixes, nationalities/languages, appointment vocab
metadata:
  type: reference
---

A1-completion content drop (dictionary now ~n185/v74/a49/f80, sentences to s284,
texts to t66, rules +4). Verified facts worth keeping:

**Numbers (function_words).** 11–19 = unit + `toista` written ONE word
(yksitoista…yhdeksäntoista, f49–f57). Tens 30–90 = unit + `kymmentä` one word
(f58–f64). Compounds are ONE word: kaksikymmentäyksi, neljäkymmentäkolme. `tuhat` (f65,
part tuhatta, gen tuhannen). After any number >1 the counted noun is PARTITIVE SINGULAR
(euroa, kirjaa, lasta — never plural euroja/kirjoja). Ordinals f66–f73 (ensimmäinen,
toinen, kolmas, neljäs, viides, kuudes, seitsemäs, kymmenes); 13th = kolmastoista.

**Telling time (rule `telling-time`, tag keywords "time"/"clock").** TRAP for Russian
speakers: `puoli kolme` = 2:30 ("half TO three"), NOT 3:30 — every time-telling wrong
should include the puoli-off-by-one distractor. `vartin yli kaksi` = 2:15 (vartti in
GENITIVE), `varttia vaille kaksi` = 1:45 (vartti in PARTITIVE), `kymmenen yli/vaille`.
"At X o'clock" = kello + ABLATIVE of the number: `kahdelta`, `kahdeksalta` (f76 yli,
f77 vaille are adv; f74 puoli, f75 vartti are num). `aika` (n183) is the appointment
sense, gradation k→j: gen `ajan` ('varata ajan').

**Possessive suffixes (rule `possessive-suffixes`).** -ni/-si/-nsa/-mme/-nne/-nsa on the
GEN stem: siskoni, perheeni, huoneeni, huoneesi, huoneemme, talonne, hänen kirjansa.
3rd-person `hänen` is normally kept (don't drop it). minun/sinun are NOT dict lemmas so
the grader won't strip them — only the 6 personal subject pronouns get stripped.

**Nationalities/languages (rule `nationalities-languages`).** Nationality adj -lainen/
-läinen, lowercase (a44–a49: suomalainen, venäläinen, englantilainen, ruotsalainen,
amerikkalainen, saksalainen). Language NOUNS lowercase, partitive after puhua (n147 kieli,
n148 englanti, n149 venäjä, n150 ruotsi, n151 ranska, n152 saksa; suomi=n16). Country
origin uses ABLATIVE: 'Olen Venäjältä'. `mistä`(f79)/`mihin`(f78) added as real adv
lemmas with positive Q&A; `montako`(f80) + partitive sg.

**Rule teaches keywords I extended** so sentence tags map: added to verb-conjugation
["present action","routine","3rd person","small-talk"]; to inside-locatives
["ablative","origin"]; to numbers-11-100 ["tens","compound"] (the "tens (...)" tags
didn't substring-match number/ordinal). New rule ids: numbers-11-100, telling-time,
possessive-suffixes, nationalities-languages.

**Re-leveling done in batch 1 (DON'T raise these back up — A1-early placement is
the point):** kello n44 6→5; katsoa v25 6→4; siellä f41, täällä f42, vähän f43,
paljon f44 all 11→4. These foundational deixis/quantity/clock words were used in
early (L4–5) sentences and violated the `sentence.level ≥ max(uses word level)`
invariant. Lowering WORDS (not raising sentences) is the preferred fix here.

**BATCH 2 (breadth) added:** nouns n186–n225, verbs v75–v95, adjectives a50–a66,
function_words f81–f100 (~90 lemmas), sentences s285–s355, texts t67–t72. New rule
`adverbs` (teaches keywords ["adverb","manner adverb","sequence","frequency"], pos
["adv"]) — needed because -sti manner/sequence adverb sentences had no mapping rule.
New pos value `adp` for postposition `kanssa` (+genitive) and preposition `ilman`
(+partitive); adp matches no rule pos filter but those sentences map via teaches
keywords genitive/partitive — fine. NOTE: id gaps are INTENTIONAL (n190/n213/n215/n223,
v91–v93/v96/v97, a62 skipped) — I drop placeholder ids rather than reuse; don't treat
gaps as missing data. Orphan-word traps I hit & fixed (every FI content word must be a
dict lemma): `elokuva`, `kestää`, `pullo`, `lasi`, `vauva`, `ulkona` are NOT lemmas —
reworded those. `tunti`=n40, `vuosi`=n217, `kuukausi`=n218 (distinct from month lemmas
n135–n146).

Related: [[prompt-answer-coverage]], [[pronoun-strip-set]], [[wrong-match-collisions]],
[[texts-schema-and-weather-register]].
