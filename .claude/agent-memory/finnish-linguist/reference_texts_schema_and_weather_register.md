---
name: texts-schema-and-weather-register
description: texts.seed.json now carries bilingual titles (Finnish `title` + Russian `titleRu`); plus the corpus-wide convention that impersonal weather uses NOMINATIVE (on kylmä/lämmin) not partitive — keep it consistent, don't "fix" it
metadata:
  type: reference
---

Two conventions established during the L1-12 reading/vocab review pass (texts t1-t50):

**(1) Bilingual titles in `texts.seed.json`.** Every text item carries BOTH:
- `title` = short idiomatic **Finnish** name (this is what the UI shows; `reading.ts`
  `parseText` requires non-empty `title`).
- `titleRu` = Russian translation (revealed on a button; loader ignores it, so adding
  it is backward-safe). The `_meta.schema.text` doc was updated to describe this.
When authoring NEW texts, ALWAYS supply both fields.

**(2) Impersonal weather register — keep NOMINATIVE, it's deliberate.** Standard
written Finnish prefers partitive for subjectless weather (`On kylmää`, `On lämmintä`,
`On aurinkoista`). BUT the existing reading corpus consistently uses the colloquial
NOMINATIVE form `On kylmä` / `On lämmin` (t11, t19, t21, t28, t33, t34, t36 lines +
their question accepted-sets). This is acceptable spoken A1 Finnish and is internally
consistent, so it was left as-is rather than "fixed" — changing it would cascade through
many accepted/wrong sets and create a contradiction the learner sees on screen.
- EXCEPTION already in the seed: adjectives derived from -nen that describe weather DO
  take partitive even here: `On pilvistä`, `On aurinkoista`, `Tänään on aurinkoista`
  (s163, t33, t34) — because there's no `*aurinkoinen`-nominative idiom for "солнечно".
  Contrast `lämmin/kylmä` which have the bare-nominative idiom.
- Countable weather subjects stay nominative regardless: `Kesä on lämmin`, `Pää on kipeä`,
  `Sää on kylmä` (sää treated as countable). See [[weather-and-location-cases]],
  [[predicative-case]].

The full Phase-1 audit of dictionary/sentences/texts/rules found the corpus clean (no
substantive inflection/gradation/government errors); these two were the only judgment
calls worth recording.
