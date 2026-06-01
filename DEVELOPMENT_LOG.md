# SAIL Development Log and Evidence Register

This document records the main design and implementation decisions behind SAIL, with pointers to the files that provide evidence for each decision.

## Development Timeline

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
