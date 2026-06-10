# OLM Live Cross-App Demo — BIDIRECTIONAL ME↔SRL loop verified 2026-06-10

Proves the **bidirectional ME↔SRL loop** (the project's central novelty — see
`research/ME_SRL_LOOP_EVIDENCE.md`) closes BOTH ways on the **live Cloudflare deployment**, over the
shared single-writer Open Learner Model (OLM):

- **Direction B (ME calibration/confusion → SRL planning):** ME writes `over_confident`/`confusion`
  on two concepts; SAIL's `plan` mode runs a **deterministic ES-LLMs control rule in code** (NOT
  LLM-decided) that prioritizes those concepts (`over_confident ⇒ self-check`, `confusion ⇒ review
  block`), injects them as structured context so Marin's plan literally adapts, logs
  `planning_used_me_signal`, and writes the resulting plan back to the SRL-owned OLM fields.
- **Direction A (SRL state → ME contextual render):** ME reads the SRL-owned `active_plan`/`phase`
  back from the OLM into `srlContext` (renderer-only) + a phase→move bias (performance ⇒ favor
  PROBE_CONFUSION). Feature-detected: no SRL state ⇒ ME = P0 behavior.

Also proves the **single-writer field-ownership guard** (ME-owned vs SRL-owned fields).

- Worker (live): https://sail-api.jewoong-moon.workers.dev  (model anthropic/claude-sonnet-4)
- Reproduce: `bash scripts/olm_live_demo.sh`  (uses a fresh ephemeral learnerId; cleans up after)

## Field-ownership map (final)

| Owner | Fields |
|---|---|
| **ME** (micro) | `by_concept.*.calibration_err`, `jol_trend` (over/under_confident sign), `confusion_label`, `beta`, `voi` (competence Beta) |
| **SRL/SAIL** (macro) | `by_concept.*.help_seeking`, `last_session`; `global.deadline_proximity`, `srl_level`, **`active_goal`, `active_plan`, `phase`, `review_schedule`** |

The bolded SRL fields are new (this build): SAIL writes them on goal/session creation; ME reads them
for `srlContext`. Cross-writes are rejected by the arbiter (`olmCore.ts` `OWNERSHIP`).

## Both-arrows-close transcript (2026-06-10, learnerId `olm-loop-*`)

```
STEP 1 (ME → OLM): wrote confounder(overconfident) + collider(confusion).

STEP 2 (B: ME signal → SRL planning): Marin plan reply (warm, jargon-free):
  "I noticed that on confounders you've felt sure but slipped a couple times recently —
   want to start with a quick 5-minute self-check there first…?"
  • mentions confounder (overconfident): YES ✓
  • NO metric/jargon word leaked:        clean ✓
  → planning_used_me_signal LOGGED:
     - confounder → self_check   [overconfident; calibration gap 0.42]
     - collider   → review_block [confusion flagged; calibration gap 0.31]

STEP 2b (SRL → OLM): session created → active_plan + phase written (writer=sail):
     active_plan = {"subject":"causal inference","strategy":"retrieval_practice","minutes":25,"concepts":["confounder","collider"]}
     phase       = performance

STEP 3 (A: SRL state → ME): renderer srlContext built from the live OLM:
     {"subject":"causal inference","strategy":"retrieval_practice","phase":"performance","focusConcepts":["confounder","collider"]}
  • renderer references subject (causal inference): YES ✓
  • phase→move bias active (phase=performance):     YES ✓ (favor PROBE_CONFUSION)

STEP 4: BOTH ARROWS CLOSE on the LIVE worker. ✓
```

The deterministic control rule chose the plan items in code; the LLM only rendered them warmly
(self-check on the overconfident concept, no "calibration"/"overconfident" word to the student). The
plan was written to the SRL-owned OLM fields and read straight back into the ME renderer's srlContext —
closing the loop both ways. ME's `over_confident` reason surfaces to the student as *care*, not a metric.

## Earlier micro→macro transcript (learnerId `olm-demo-1780659108`)

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
