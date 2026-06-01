# Instructional Design Principles

SAIL is designed as a self-regulated learning scaffold, not as a generic answer bot. The following principles define how the prototype should behave and how future features should be judged.

## 1. Make SRL the Workflow, Not a Side Feature

Students should not have to infer the learning process from a chat window. SAIL turns self-regulation into the visible structure of the session:

- Forethought: goals, strategies, confidence, time plan, work type, learning context.
- Performance: timer, progress checks, help-seeking, scaffolded mentor dialogue.
- Reflection: ratings, learner-model correction, notes, next-session adjustment.

Implementation evidence:

- `app/src/routes/GoalStudio.tsx`
- `app/src/routes/ActiveSession.tsx`
- `app/src/routes/Reflection.tsx`

## 2. Coach the Process Before the Answer

Marin should first support planning, monitoring, strategy selection, and explanation attempts. Direct explanation is allowed only when it supports learning and does not replace the student's work.

Design rules:

- Ask one useful question before giving a large explanation.
- Use graded hints before full explanation.
- Ask what the learner has tried.
- Push the learner to articulate the next step.
- Avoid completing homework, quizzes, or graded work for the learner.

Implementation evidence:

- `server/src/prompts.ts`
- `worker/src/prompts.ts`
- `server/src/policy.ts`
- `worker/src/policy.ts`

## 3. Use Student-Facing Wording for Research Constructs

Research terms should be preserved in telemetry, but the learner should see plain language.

| Research construct | Student-facing wording |
|---|---|
| Metacognitive mentor condition | Coach my process |
| Plain/content-support condition | Just help with content |
| Problematizing scaffold | Make me think it through |
| Structuring scaffold | Give me more structure |
| Responsive timing | Only when I ask or get stuck |
| Proactive timing | Check in at the start |

Design rule:

- If a construct label is useful only to researchers, keep it in data and admin evidence, not primary student UI.

## 4. Balance Problematizing and Structuring Scaffolds

SAIL uses two complementary scaffold styles:

- **Problematizing**: helps students notice uncertainty, contradictions, missing evidence, or weak monitoring.
- **Structuring**: helps students organize the task, choose a strategy, sequence steps, or recover from overload.

The mentor should not only simplify the task. It should also help the learner see what is hard and worth regulating.

Implementation evidence:

- `server/src/policy.ts`
- `worker/src/policy.ts`
- `IMPLEMENTATION_ALIGNMENT_CHECKLIST.md`

## 5. Time Scaffolds Responsively and Proactively

SAIL should support two timing patterns:

- **Responsive**: intervene when the learner asks, stalls, requests an answer, or shows a help-seeking breakdown.
- **Proactive**: check in at planned points, such as session start, progress midpoint, or reflection.

Design rule:

- Proactive prompts should be short and low-friction.
- Responsive prompts should use the learner's current trace, goals, and recent mentor turns.

## 6. Fade Support When the Learner Can Proceed

Scaffolding should not become dependency. When progress is stable and the learner's strategy is clear, SAIL should reduce hints and ask the learner to take the next step.

Implementation evidence:

- `server/src/policy.ts`
- `worker/src/policy.ts`
- `app/src/routes/Dashboard.tsx`

## 7. Keep the Learner Model Open and Correctable

Learners should be able to see and correct what the system infers. This supports both transparency and better data quality.

Design rules:

- Show evidence as provisional, not as a fixed diagnosis.
- Ask for learner correction during reflection.
- Let corrections influence later scaffold decisions.

Implementation evidence:

- `app/src/routes/Reflection.tsx`
- `app/src/routes/ResearchEvidence.tsx`
- `server/src/learner.ts`
- `worker/src/learner.ts`

## 8. Treat Context as Meaningful, Not Deterministic

Where a learner studies can matter, but location is not learning. SAIL treats spatial/context data as one layer of evidence that must be interpreted with task type, behavior, and reflection.

Design rules:

- Ask the learner to choose the meaning of the place.
- Make GPS/motion capture optional.
- Store summarized and rounded signals rather than raw GPS paths.
- Provide a visible map so the learner knows what was detected.

Implementation evidence:

- `app/src/components/LocationMap.tsx`
- `worker/src/domain.ts`
- `worker/src/index.ts`

## 9. Instrument for Research Without Hiding the Instrumentation

SAIL is a research prototype. It should collect analyzable traces, but the learner and researcher should be able to inspect what the system is doing.

Design rules:

- Log policy actions, help-seeking proxies, scaffold fidelity, context corrections, reflection, and export use.
- Keep raw secrets, exact GPS, local logs, and private data out of the public repository.
- Treat automated labels as proxies until validated.

Implementation evidence:

- `worker/schema.sql`
- `worker/src/index.ts`
- `app/src/routes/ResearchEvidence.tsx`
- `DEVELOPMENT_LOG.md`

## 10. Preserve Calibration Measurement Integrity

The intended KPIDT study should collect JOL outside the mentor interaction, for example in Canvas or another LMS form, so the AI mentor does not directly contaminate calibration judgments.

Design rule:

- SAIL may log confidence-like planning fields for session support, but formal JOL calibration should remain externally administered unless the study design explicitly changes.

## 11. Design for Repeated Use, Not a Demo Moment

SAIL should support repeated academic work. A good session ends with usable evidence for the next session.

Design rules:

- Reflection should create a next action.
- Prior strategies and corrections should carry forward.
- Dashboards should highlight patterns, not only totals.

Implementation evidence:

- `app/src/routes/Dashboard.tsx`
- `server/src/learner.ts`
- `worker/src/learner.ts`

## Summary

SAIL's instructional design position is simple: AI should help learners regulate learning, not bypass it. Every major feature should either support planning, monitoring, control, reflection, or research-grade evidence about those processes.
