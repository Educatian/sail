# OLM Live Cross-App Demo — verified 2026-06-05

Proves the **micro→macro Open Learner Model (OLM) synergy** between the two apps on the **live
Cloudflare deployment**: the ME chatbot (micro / within-task) writes a learner's metacognitive
state, and SAIL (macro / between-session) reads it back through its review scheduler and the Marin
mentor. Also proves the **single-writer field-ownership guard**.

- Worker (live): https://sail-api.jewoong-moon.workers.dev  (Version `a7c0a19b`, model anthropic/claude-sonnet-4)
- Reproduce: `bash scripts/olm_live_demo.sh`
- Deploy that made the OLM routes live: remote D1 `olm` table applied (idempotent `schema.sql`),
  `wrangler deploy`. Before this, `/api/olm` and `/api/review` returned 404.

## Verified transcript (learnerId `olm-demo-1780659108`)

**STEP 1 — ME writes to the shared OLM** (writer=`me`, concept `confounder`):
```
{"ok":true,"rev":1,"applied":["by_concept.confounder.calibration_err","by_concept.confounder.jol_trend",
 "by_concept.confounder.confusion_label","by_concept.confounder.beta","by_concept.confounder.voi"],"rejected":[]}
```

**STEP 2 — SAIL attempts to write an ME-owned field → REJECTED** (single-writer guard):
```
{"ok":true,"rev":1,"applied":[],
 "rejected":[{"path":"by_concept.confounder.calibration_err","reason":"sail does not own by_concept.*.calibration_err"}]}
```

**STEP 3 — read-back** (ME fields persisted; SAIL's rejected write is absent):
```
{"learner_id":"olm-demo-1780659108","by_concept":{"confounder":{"calibration_err":0.42,
 "jol_trend":"overconfident","confusion_label":"impasse","beta":{"a":2,"b":5},"voi":{"comp":{"a":2,"b":5}}}},
 "global":{"srl_level":"medium"},"events":[{"writer":"me","type":"metacog_experience","feeling":"confidence","value":4,"phase":"pre"}],"_rev":1}
```

**STEP 4 — SAIL review queue from ME's latent Beta belief + forgetting drift:**
```
{"queue":[{"concept_id":"confounder","priority":1.268,"competence":0.29,"uncertainty":0.55,"elapsedDays":0,"reason":"low mastery"}]}
```

**STEP 5 — SAIL Marin (live LLM) surfaces the shared-OLM signal in conversation:**
> "Based on your recent practice, you were most overconfident about **'confounder'** — there's a
> pretty big gap between how confident you felt and how well you actually did on those problems.
> This kind of overconfidence can be tricky because it might lead you to skip studying something you
> actually need to work on more. What do you think might have caused you to feel more confident about
> confounders than your performance showed?"

This is `macroSummaryFrom()` ("the learner was overconfident on 'confounder' (calibration gap 0.42)")
injected into Marin's system prompt and faithfully surfaced. End-to-end micro→macro loop confirmed live.

## Notes
- Field ownership (`worker/src/olmCore.ts` `OWNERSHIP`): ME owns `calibration_err / jol_trend /
  confusion_label / beta / voi`; SAIL owns help-seeking / session / deadline context.
- `macroSummaryFrom` surfaces a concept only when `calibration_err >= 0.30`.
- Reflection mode opens with one question and may not surface the OLM note on turn 1; the `ask`-mode
  prompt above forces the cross-app read for demonstration.
