# SAIL Development Log and Evidence Register

This document records the main design and implementation decisions behind SAIL, with pointers to the files that provide evidence for each decision.

## Development Timeline

### 2026-06-10: Bidirectional ME↔SRL loop closed over the shared OLM (central novelty)

Operationalized the bidirectional ME↔SRL loop — the project's central contribution (no validated
system closes both arrows; see [`research/ME_SRL_LOOP_EVIDENCE.md`](research/ME_SRL_LOOP_EVIDENCE.md),
novelty gap #1). Both apps (SAIL macro/SRL + ME micro) now condition each other over the shared
single-writer OLM, and the round-trip is proven on the live worker.

**Field ownership (extended, [`worker/src/olmCore.ts`](worker/src/olmCore.ts) = `server/src/olmCore.ts`):**
ME owns `calibration_err / jol_trend / confusion_label / beta / voi`; SRL/SAIL now also owns
`global.active_goal / active_plan / phase / review_schedule` (single-writer arbiter unchanged; cross-writes
rejected). Drift-guarded by `sail-me/sim/arbiter_contract.test.mjs` + `server/test/parity.test.ts`.

**Direction B — ME signal → SRL planning (ES-LLMs deterministic control rule, evidence §c):** in
`marin.ts` (×2, byte-identical) `meControlRule()` maps each ME-flagged concept to a planning action **in
code, not LLM-decided** — `over_confident(c) ⇒ self-check + retrieval`, `confusion(c) ⇒ review block
before new material`, `competence low + stale ⇒ surface`. The prioritized list is injected as structured
context (`buildMePlanningContext`) into Marin's `plan`/`goal_setup` system prompt so the plan literally
adapts to ME calibration; a `planning_used_me_signal` event logs which concepts/reasons drove it
(`worker/src/index.ts`, `server/src/routes.ts`). The student sees the reason as **care, never a metric**
("felt sure but slipped a couple times — want a quick self-check?"); the prompt forbids the words
"calibration/overconfident/confusion".

**Direction A — SRL state → ME contextual render (MetaCLASS plan-then-render-on-profile + FLoRA phase,
evidence §d):** SAIL writes `active_plan`/`phase` to the OLM on session creation and `active_goal` on goal
creation; the ME app (`sail-me/index.html` + `shared/srl_context.mjs`) reads them into an `srlContext`
injected into the **renderer only** (selection stays deterministic), plus a light **phase→move bias** in
`engine.mjs candidateMoves` (forethought ⇒ ELICIT_FOK/JOL, performance ⇒ PROBE_CONFUSION, reflection ⇒
ELICIT_FOS). Feature-detected: no SRL state ⇒ ME = the P0 version exactly (no regression; the probe cap +
abstain-when-well-regulated are preserved).

**Live proof:** [`scripts/olm_live_demo.sh`](scripts/olm_live_demo.sh) +
[`scripts/OLM_LIVE_DEMO.md`](scripts/OLM_LIVE_DEMO.md) run a reproducible both-arrows-close round-trip on
`sail-api.jewoong-moon.workers.dev` (ME writes two concepts → SAIL plan prioritizes them + event logged +
plan→OLM → ME srlContext references the plan with phase bias). Tests: server 76→87, ME engine 63→74; all
suites green; app build + worker typecheck clean.

### 2026-05-26: Benchmarking and architecture selection

The first design pass compared six SRL, tutoring, and study-support codebases to identify a viable architecture for a research-grade prototype.

Evidence:

- [`BENCHMARKING.md`](BENCHMARKING.md) records the six-repository scan and the composition decision.
- [`ARCHITECTURE.md`](ARCHITECTURE.md) translates that scan into SAIL's stack, domain model, mentor engine, and telemetry plan.

Design outcome:

- Use a three-phase SRL workflow as the app backbone.
- Keep the LLM inside a controlled mentor role rather than making it the full pedagogy.
- Separate research measurement from chat interaction where contamination is likely.

### 2026-05-26 to 2026-05-31: MVP vertical slice

The MVP was built around one complete learner loop: plan a session, study with Marin, reflect, and carry forward evidence.

Evidence:

- `app/src/routes/GoalStudio.tsx`
- `app/src/routes/ActiveSession.tsx`
- `app/src/routes/Reflection.tsx`
- `app/src/routes/Dashboard.tsx`
- `screenshots/01-home.png`
- `screenshots/02-goal-studio_carry-forward.png`
- `screenshots/03-active-mentor.png`
- `screenshots/04-reflection.png`
- `screenshots/05-dashboard.png`

Design outcome:

- The product experience is organized around forethought, performance, and reflection.
- The dashboard exposes learner-model and research evidence rather than only engagement metrics.

### 2026-05-31: Context and spatial data architecture

SAIL added opt-in learning-context capture to study how place, movement, task type, and learner reflection relate to self-regulation.

Evidence:

- `app/src/components/LocationMap.tsx`
- `app/screenshots/map-location-qa.png`
- `worker/schema.sql`
- `worker/src/index.ts`
- `worker/src/domain.ts`
- [`ARCHITECTURE.md`](ARCHITECTURE.md)

Design outcome:

- Learners can choose a meaningful place category.
- Browser GPS and device-motion data are optional.
- Persisted telemetry stores rounded/summarized spatial signals, not exact raw GPS paths.
- The map is used as a student-facing confirmation surface, not as hidden surveillance.

### 2026-05-31 to 2026-06-01: Research telemetry and export readiness

The backend was expanded from session persistence to research event logging, policy evidence, and export support.

Evidence:

- `worker/src/index.ts`
- `worker/src/db.ts`
- `worker/src/analysis.ts`
- `server/src/routes.ts`
- `server/src/analysis.ts`
- [`IMPLEMENTATION_ALIGNMENT_CHECKLIST.md`](IMPLEMENTATION_ALIGNMENT_CHECKLIST.md)

Design outcome:

- Events log planning, strategy choice, policy action, help-seeking proxy, scaffold fidelity, context correction, reflection, and export use.
- Event payloads are sanitized before persistence.
- Dashboards and exports make the implementation auditable for research review.

### 2026-06-01: Public prototype and repository packaging

The project was packaged as a public GitHub repository with concept, architecture, deployment, and screenshot evidence.

Evidence:

- [`README.md`](README.md)
- [`PROJECT_CONCEPT.md`](PROJECT_CONCEPT.md)
- [`DEPLOY.md`](DEPLOY.md)
- GitHub repository: https://github.com/Educatian/sail
- Public prototype: https://sail-dia.pages.dev

Validation run:

- `npm run build` in `app/`
- `npx tsc --noEmit` in `worker/`
- `npx tsc --noEmit` in `server/`

## Evidence Register

| Claim | Evidence in the repository |
|---|---|
| SAIL targets college and graduate students | `README.md`, `PROJECT_CONCEPT.md`, `app/src/routes/GoalStudio.tsx` |
| The app implements a forethought-performance-reflection loop | `ARCHITECTURE.md`, `app/src/routes/GoalStudio.tsx`, `app/src/routes/ActiveSession.tsx`, `app/src/routes/Reflection.tsx` |
| Marin scaffolds learning instead of simply answering | `server/src/prompts.ts`, `worker/src/prompts.ts`, `server/src/policy.ts`, `worker/src/policy.ts` |
| The mentor is policy-controlled | `server/src/policy.ts`, `worker/src/policy.ts`, `IMPLEMENTATION_ALIGNMENT_CHECKLIST.md` |
| Spatial context is opt-in and summarized | `app/src/components/LocationMap.tsx`, `worker/src/domain.ts`, `worker/src/index.ts`, `ARCHITECTURE.md` |
| Research telemetry is logged and exportable | `worker/schema.sql`, `worker/src/db.ts`, `worker/src/index.ts`, `server/src/routes.ts` |
| The UI exposes research evidence to reviewers | `app/src/routes/ResearchEvidence.tsx`, `app/src/routes/Dashboard.tsx` |
| Android field-study packaging is prepared | `app/capacitor.config.ts`, `app/android/app/src/main/AndroidManifest.xml`, `MOBILE_QA_CHECKLIST.md` |

## Current Cautions

- Help-seeking quality and scaffold fidelity are rule-based proxies until validated against human-coded dialogue data.
- Location/context signals should be interpreted with task type, learner reflection, and session behavior; location alone is not an SRL construct.
- JOL is deliberately kept outside the mentor app for the intended KPIDT study to reduce contamination from the AI interaction.
- Production research use still requires IRB-aligned consent language, participant management, and export validation.
