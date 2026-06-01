# SAIL — MVP Architecture Blueprint

**SAIL** = Self-regulated AI Learning mentor. Higher-ed SRL-promoting AI mentor; build artifact for the KPIDT research line (jh1016). Navigation metaphor → Zimmerman 3 phases: chart course (forethought) → sail (performance + mentor) → log voyage (reflection).

## Stack decision
- **Frontend**: Vite + React + TypeScript + TanStack Router (SPA) + Tailwind. (Matches Hephaestus webapp; per project skill note this codebase uses Vite+TanStack, NOT Next.js.)
- **Backend**: Node API (Hono) — LLM proxy (keys server-side only), JSONL session logging, event metrics, export, future `ltijs` Canvas LTI mount.
- **LLM**: provider abstraction; default Anthropic Claude (`claude-sonnet-4-6`), OpenAI/Azure fallback. Streaming.
- **DB**: SQLite (better-sqlite3) MVP; mirrors PracLog `Log` + dialogue/event logs. Trivial CSV/JSON export.
- **Theory split (critical)**: UX runs Zimmerman forethought→performance→reflection. Research *measurement* (JOL calibration) stays OUTSIDE the bot (Canvas form, Nelson-Narens, per Cash 2025) to avoid LLM contaminating calibration. SAIL logs help-seeking + metacog signals only.

## Domain model (TS, ported from PracLog)
```ts
type Phase = 'forethought' | 'performance' | 'reflection';
interface SessionGoal { id: string; text: string; isTicked: boolean; createdAt: string }
interface TimerSegment { startTime: string; endTime?: string } // pause/resume = real time-on-task
interface StrategyChoice { id: string; kind: 'retrieval_practice'|'self_explanation'|'worked_example'|'interleaving'|'spaced'|'other'; note?: string }
interface StudySession {
  id: string; studentId: string; subject: string; date: string;
  condition: 'metacog'|'plain';            // research condition assignment
  // forethought
  goals: SessionGoal[]; strategies: StrategyChoice[]; plannedMinutes: number;
  // performance
  timerSegments: TimerSegment[]; actualMinutes: number; inProgress: boolean;
  // reflection (1-5 Likert + free text) — NOT JOL (JOL lives in Canvas)
  focus?: 1|2|3|4|5; progress?: 1|2|3|4|5; satisfaction?: 1|2|3|4|5; notes?: string;
  adjustment?: string;                      // forward plan ("next time I will...")
  completed: boolean; createdAt: string; updatedAt: string;
}
```

## Mentor engine (ported from DeepTutor + EduChat + Hephaestus)
- **Label protocol**: `allowed = [SOCRATIC, HINT_L1, HINT_L2, HINT_L3, EXPLAIN, VERIFY, FINISH]`; intermediate = SOCRATIC/HINT_*; final/visible = EXPLAIN/VERIFY/FINISH; tool label triggers `ask_user`.
- **System prompt** (`prompts/mentor.system.md`): EduChat coach-not-answer constraint (⚠️ on push, ⭐ on success) + Hephaestus Hattie feed-up/feed-back/feed-forward + "ask ONE question then wait; 2-4 sentences; explore before solving." Metacog variant adds explicit strategy/monitoring prompts; plain variant omits them (the research manipulation).
- **Context snapshot** (Hephaestus aspect pattern, per turn): inject `student.json` = {current goals + tick state, chosen strategies, elapsed minutes, recent reflections, hint level requested}. Not RAG.
- **ask_user checkpoints**: LLM pauses → React card (MCQ/free-text) → resume. Enforces Socratic checking.
- **Sessions**: append-only JSONL per (student, session). Provider abstraction. Streaming to UI.

## Screens (TanStack routes) ↔ SRL phases
1. `/study/new` **Goal Studio** (forethought): subject, goals, plannedMinutes.
2. `/study/plan` **Strategy Planner** (forethought): pick evidence-based strategies (retrieval practice, self-explanation, worked-example...).
3. `/study/active` **AI Mentor Chat + timer** (performance): timer play/pause, live goal checklist, mentor chat (questions/hints not answers), ask_user checkpoints.
4. `/dashboard` **Progress Dashboard**: goal completion, time-on-task, strategy use, focus/progress/satisfaction trends, hint-level distribution.
5. `/study/reflect` **Reflection Log** (reflection): ratings + notes + forward adjustment; mentor poses 1 reflection question.

## Research instrumentation (for KPIDT)
- Per-turn JSONL dialogue log: {role, content, label, hintLevel, latencyMs, condition, ts}.
- Event metrics (DeepTutor event-bus pattern): hint_requested(level), checkpoint_correct, time_on_task, strategy_selected, policy_decided, help_seeking_classified, scaffold_fidelity, context_corrected, reflection_submitted.
- Condition assignment field on session (metacog vs plain) — within-subject ready.
- Context trace field stores abstract learner-controlled place categories (`stable_study`, `classroom`, `home_like`, `transit`, `work_social`, `other`, `not_shared`).
- Spatial acquisition field stores opt-in browser GPS/device-motion metadata: rounded coordinates, accuracy, speed, motion magnitude, mobility state, source, permission state, live-tracking state, sample count, distance, dwell seconds, transition count, normalized route preview, and `rawLocationStored: false`.
- Map rendering uses foreground GPS points only on-device while the session screen is open. The UI renders current location, accuracy radius, and optional route over OpenStreetMap tiles; persisted/exported research data keeps only rounded coordinates and movement summaries.
- Client telemetry posts to `/api/events` for app open/auth mode, forethought changes, spatial consent/detection, map rendering, timer start/pause, live tracking start/stop/mode/sample summaries, mentor turn start/completion, checkpoint answers, voice input, reflection changes, export, and client errors. The endpoint redacts raw latitude/longitude-like keys before writing D1 `events`.
- University task type is captured on every session (`coursework`, `seminar_reading`, `exam_prep`, `research_writing`, `thesis_dissertation`, `project_lab`) so SRL interpretation is tied to college/graduate work.
- Dashboard and export expose implementation-alignment evidence: policy counts, help-seeking quality, scaffold fidelity, task mix, context mix, and learner-model corrections.
- Export: `/api/export?studentId=` → JSON + CSV (anonymizable ids). Markdown transcript export.
- JOL explicitly NOT collected in-app.

## Strengthened 5-layer architecture (2026-05-31 brainstorming)
1. **Trace layer**: dialogue, goals, strategies, external JOL linkage/placeholder, task performance, help-seeking labels, time/session logs, optional place/context category, opt-in spatial sensor trace, foreground live-tracking summary, reflection responses.
2. **SRL parser layer**: detects planning absence, monitoring risk, executive help-seeking, persistence/avoidance, and context-specific strategy patterns.
3. **Open learner model layer**: exposes calibration state, scaffold level, hint trend, strategy efficacy, spacing, and context patterns; learners can correct the model during reflection.
4. **Pedagogical policy layer**: chooses `abstain`, `prompt_monitoring`, `prompt_control`, `prompt_reflection`, `fade`, or `escalate`.
5. **LLM dialogue layer**: converts the selected move into one short Socratic prompt. The LLM does not independently choose when to intervene.

## Build order (vertical slice first)
1. Scaffold Vite+React+TS+TanStack+Tailwind, Hono API, SQLite schema, domain types.
2. Mentor engine core: label-loop + provider client + system prompts + JSONL logging.
3. Vertical slice: Goal Studio → Active (timer + mentor chat + 1 checkpoint) → Reflection. One full SRL loop end-to-end.
4. Strategy Planner + Progress Dashboard.
5. Export endpoints + condition assignment + event metrics.
6. (later) Canvas LTI via ltijs; (v2) ChatTutor-style viz; SRLMS cohort infra.
