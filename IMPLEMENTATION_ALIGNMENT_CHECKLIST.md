# SAIL implementation alignment checklist

Use this file to audit whether the KPIDT brainstorming claims are concretely implemented in the app.

## 1. Trace-informed SRL coach, not generic chatbot
- Evidence in code: session traces include task type, goals, strategies, external JOL linkage/placeholder, performance, context trace, reflection, and learner correction.
- Evidence in logs: `session_started`, `strategy_selected`, `state_detected`, `help_seeking_classified`, `policy_decided`, `scaffold_fidelity`, `context_corrected`, `reflection_submitted`.
- Evidence in UI: Goal Studio, Active Session policy panel, Reflection correction fields, Dashboard research panels.

## 2. Spatially situated, without weak location claims
- Evidence in code: `ContextTrace` stores learner meaning; `SpatialTrace` stores opt-in browser GPS/device-motion metadata with rounded coordinates, sample count, distance, dwell/transition summaries, normalized route preview, and `rawLocationStored: false`.
- Evidence in UI: Goal Studio includes "Detect location + motion"; Active Session includes foreground live tracking; Dashboard includes spatial acquisition counts.
- Safety rule: exact raw GPS is not stored. Location is not treated as SRL by itself.
- Valid interpretation requires triangulation with task type, action/performance, and reflection.

## 3. Policy-controlled LLM
- Evidence in code: `decidePolicy()` runs before `buildSystemPrompt()` and LLM generation.
- Evidence in logs: `policy_decided` is exported with action, phase target, intensity, reason, confidence.
- Required policy actions: `abstain`, `prompt_monitoring`, `prompt_control`, `prompt_reflection`, `fade`, `escalate`.

## 4. Help-seeking quality
- Evidence in code: user turns are classified as `instrumental`, `executive`, `avoidance`, or `none`.
- Evidence in logs/dashboard: `help_seeking_classified` events and help-seeking distribution.
- Research caution: this is a rule-based proxy until human-coded dialogue validation is added.

## 5. Open learner model and correction
- Evidence in code: learner model exposes calibration, hint trend, strategy efficacy, spacing, context patterns, task mix, and recent corrections.
- Evidence in UI: Reflection lets learners correct the model.
- Evidence in policy: recent learner corrections can soften over-intervention decisions.

## 6. Fading and abstention
- Evidence in code: policy can select `fade` when progress is stable and scaffold need is low; `abstain` when no regulation breakdown is detected.
- Evidence in dashboard/export: policy action counts and hint-depth trend.

## 7. Scaffold fidelity
- Evidence in code: selected policy action is compared against the mentor label after generation.
- Evidence in logs/dashboard: `scaffold_fidelity` counts `aligned` vs `drift`.
- Research caution: this is a first-pass automated audit; human rubric validation still needed.

## 8. University learner target
- Evidence in UI/prompt: copy names college and graduate workflows: coursework, seminar reading, exams, research writing, thesis/dissertation, projects/labs.

## 9. Export readiness for RQ16-RQ20
- Required export variables: policy actions, learner states, help-seeking quality, task type, context trace, context helpfulness, learner correction, scaffold fidelity, calibration, reflection.
- Check endpoint: `/api/export?studentId=...`.

## Known gaps
- Automatic acquisition is browser-session foreground only; no background native mobile collection yet.
- Dwell time and transition count are implemented as browser-session summaries; repeated-place routine detection is still missing.
- No instructor-facing escalation dashboard yet.
- No human-coded gold standard for help-seeking or scaffold fidelity yet.

## Mitigations added
- Active Session includes `Study spot` vs `Route` mode and an `I'm staying still` correction for indoor GPS jitter.
- Research Evidence includes an explicit Method status panel warning that learner state, help-seeking, and scaffold fidelity are automated proxies.
- Mobile QA checklist exists in `MOBILE_QA_CHECKLIST.md` for pre-demo and pre-data-collection checks.
