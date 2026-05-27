# SAIL Benchmarking — 6 SRL/tutoring repos (2026-05-26)

Method: Understand-Anything scan (Phase 1 structural) + targeted deep reads against the SRL rubric.
Goal: extract best-of-breed architecture for SAIL, a higher-ed SRL AI-mentor MVP (build artifact for the KPIDT research line).

## Verified repos

| repo | exact | stack | files | role in SAIL |
|---|---|---|---|---|
| PracLog | akiho-suzuki/PracLog | Flutter/Dart + Isar | 152 | **SRL data model + 3-phase screen flow (TEMPLATE)** |
| Hephaestus | ls1intum/Hephaestus | Spring(Java) + React/TanStack | 2329 | **mentor prompt design + per-turn context injection** |
| DeepTutor | HKUDS/DeepTutor ⭐24k | Python agents + React | 1199 | **mentor engine: label-loop + memory + JSONL logging** |
| EduChat | jsalsman/EduChat | Streamlit/Python | 4 | **hint-not-answer constraint prompt (verbatim)** |
| SRLMS | AlphaZigy/SRLMS | React + Django | 208 | multi-course/lecturer infra (defer) |
| ChatTutor | HugeCatLab/ChatTutor ⭐1158 | Vue + ai-sdk | 323 | LLM-emits-viz-DSL pattern (defer to v2) |

## Per-repo verdict

### PracLog — PORT THE DATA MODEL (cleanest Zimmerman loop)
`Log` collection maps the 3 phases pristinely:
- Forethought: `goalsList: List<PracticeGoal{text, isTicked}>`, planned context
- Performance: `timerDataList: List<TimerData{startTime, endTime}>` (pause/resume = real time-on-task), `durationInMin`
- Reflection: `focus 1-5`, `progress 1-5`, `satisfaction 1-5`, `notes`
Screens = explicit phases: PrePracticeScreen → PracticeScreen → PostPracticeScreen. Has JSON export with date-range filter (`data_import_export.dart`). No LLM (clean slate for mentor). **This is SAIL's domain backbone.**

### Hephaestus — PORT MENTOR PROMPT + CONTEXT INJECTION (not phases)
- System prompt `server/.../agent/mentor/system.md`: Hattie **feed-up / feed-back / feed-forward**; "Ask ONE question, then wait"; "2-4 sentences then pause"; feedback layers Task/Process/Self-Regulation/Self; "explore challenges, don't jump to solutions."
- Per-turn **aspect snapshots** (user.json/workspace.json/...) pre-computed and injected each turn instead of tool calls — adapt to SRL metrics (goals, strategy attempts, mastery, reflection engagement).
- Tree-structured `ChatThread`/`ChatMessage` + status enum + per-turn lock (409). Continuous conversation, NOT a phase state machine — SAIL adds phase scaffolding itself (from PracLog).

### DeepTutor — PORT THE MENTOR ENGINE (steal sparingly)
- **Label-driven loop** (`core/agentic/loop.py` LabelProtocol): allowed/terminal/intermediate/final labels. SAIL labels = SOCRATIC / HINT_L1 / HINT_L2 / HINT_L3 / EXPLAIN / VERIFY / FINISH.
- **Memory snapshot injection** (not RAG): student profile text appended to system prompt every turn (`tutorbot/session/manager.py`, `agent/memory.py`).
- **ask_user checkpoints** (`tools/ask_user.py`): LLM pauses, renders MCQ/free-text card, waits, resumes — enforces Socratic checking.
- **JSONL append-only sessions** + consolidation; **event bus** for async metrics; provider abstraction (`client.py`). Markdown export (`web/lib/chat-export.ts`).
- OVERKILL to skip for MVP: multi-pipeline orchestrator, full RAG, math-animator, capability registry, admin dashboard.

### EduChat — PORT THE CONSTRAINT PROMPT (verbatim seed)
Single system prompt enforces coach-not-answer: "Only coach without giving away answers... if homework/quiz, don't answer; if clarification, explain... if pushed for a forbidden answer, include ⚠️... on success include ⭐." `temperature=0`, code-execution tool to avoid math confabulation. No guardrails lib needed — prompt suffices.

### SRLMS — DEFER (multi-course/lecturer infra)
React + Django, comprehensive but assignment/grading-centric; SRL mapped indirectly via snapshots, reflection UI is placeholder, no export, no live LLM. Borrow its multi-course/cohort + insight model only when SAIL scales past single-student MVP.

### ChatTutor — DEFER to v2 (visual layer)
Elegant pattern: LLM emits fenced DSL blocks (```ggbscript / ```mermaid); block-parser → typed actions → GeoGebra/Mermaid panels. Adopt only if SAIL needs diagrams later. Overkill for text-first SRL MVP.

## Composition decision (best-of-breed)
- **Domain/data + screens** ← PracLog (3-phase loop, ratings, time segments, export)
- **Mentor persona/prompt** ← EduChat constraint + Hephaestus Hattie/Socratic
- **Mentor engine** ← DeepTutor label-loop + memory snapshot + ask_user + JSONL + event metrics
- **Per-turn context** ← Hephaestus aspect snapshot (SRL-metric version)
- **Research instrumentation** ← DeepTutor JSONL/export + event bus (for KPIDT logging/condition/export)
- **Defer**: SRLMS cohort infra, ChatTutor viz.
