# SRL App Landscape — Design Architecture Review + Gap Analysis vs SAIL (2026-05-26)

Method: Understand-Anything/agent profiling of 6 cloned codebases (uniform architecture template) + literature on research ITS, LLM SRL systems, and commercial study apps. Goal: locate SAIL against the field and name the gaps that matter.

## 1. Four families (design-architecture patterns)

### A. Classic SRL ITS / open-ended learning environments (pre-LLM)
- **MetaTutor** (Azevedo): multi-agent — **4 pedagogical agents** nudge summarization/monitoring/prior-knowledge; designed to **detect, track, model, foster** SRL; **multichannel data** (log, eye-tracking, physio); adaptive scaffolds keyed to detected strategy use. Domain-locked (biology), heavy authoring, sensor-dependent, no natural-language dialogue. [Frontiers 2022](https://pmc.ncbi.nlm.nih.gov/articles/PMC9239319/)
- **Betty's Brain** (Biswas): **learning-by-teaching** OELE — student builds a causal model to teach agent "Betty"; SRL mentor + **affect regulation** version. Construction + teaching as the SRL engine.
- **Crystal Island** (Lester): narrative game-based ITS, expert agents, inquiry.
- **Pattern**: rigorous SRL detection + adaptive pedagogical-agent scaffolding + strong measurement; but domain-locked, authoring-heavy, no open dialogue.

### B. Recent LLM SRL systems (the live frontier)
- **SRLAgent** (arXiv 2506.09968): Minecraft 3D + LLM; **Planning Agent (forethought)** + **SubTask Monitor (performance metrics)** + structured **reflection prompts**; gamified; RCT improved SRL (d≈0.23). Closest research analog to SAIL.
- **DeepTutor** (HKUDS): agentic loop + **3-layer memory (L1 trace → L2 surface → L3 slots: Goals/Learnings/Struggles/Interests)** with LLM consolidation; RAG (LlamaIndex); label protocol; multi-provider; multi-channel (Slack/Telegram/email TutorBot).
- **Hephaestus** (TUM): Socratic mentor, **aspect-JSON context** per turn, **Hattie feed-up/back/forward**, Micrometer metrics, multi-tenant, in-flight turn dedup.
- **EduChat**: single-file **coach-not-answer constraint** prompt (hint-first, ⚠️/⭐), code-execution checking.
- **ChatTutor**: **LLM emits viz DSL** (```mermaid / ```ggbscript) → whiteboard/GeoGebra; U→S→T hidden plan.
- **Pattern**: natural dialogue + agentic flexibility + memory; but SRL pedagogy uneven, **fading mostly absent**, scaffold quality/fidelity a concern, many **over-help** (the "Help or Hype" critique).

### C. SRL data/structure apps
- **PracLog** (Flutter/Isar): **cleanest Zimmerman 3-phase** data + UI (pre→during→post screens, timer pause/resume, 1-5 ratings, JSON export); single-user, **no LLM**.
- **SRLMS** (React/Django): multiuser LMS-style SRL platform; SRL **dispersed** across tables; AI fields are **stubs**.

### D. Commercial study/habit apps
- **Forest** (focus timer + gamified trees), **Habitica** (RPG habits/dailies), **Notion** (flexible workspace + "Sunday review" ritual), **Motion/Reclaim** (AI scheduling), **Headspace Ebb** (AI companion with **memory + voice**, Dec 2025).
- **Pattern**: excellent **engagement/retention** (streaks, gamification, reminders, scheduling) + polish; but **not SRL-theory-grounded** — no metacognitive scaffolding, calibration, or help-seeking shaping.

## 2. Comparison matrix (✓ strong / ~ partial / ✗ absent)

| Dimension | MetaTutor | Betty's Brain | SRLAgent | DeepTutor | Hephaestus | PracLog | EduChat/ChatTutor | Forest/Habitica/Notion | **SAIL** |
|---|---|---|---|---|---|---|---|---|---|
| Forethought/Performance/Reflection | ✓ | ~ | ✓ | ~ | ~ | ✓ | ✗ | ~ | **✓** |
| Closed loop across sessions | ~ | ~ | ~ | ~ | ✗ | ✗ | ✗ | ~ | **✓ (carry-forward)** |
| SRL areas: cog/motiv/behav/context | ✓ | ✓ | ~ | ~ | ~ | ~ | ✗ | ~(behav) | ~ (cog/behav strong) |
| Scaffolding type | agents | mentor | agents | agentic | Socratic | none | hint/viz | none | **Socratic+graded hints** |
| Adaptive **fading** | ✓ | ~ | ~ | ✗ | ✗ | ✗ | ✗ | ✗ | **~ (competence-based)** |
| Learner-state detection | ✓ sensors | ~ | ~ | ~ | ~ rules | ✗ | ✗ | ✗ | **~ text-only (RQ13)** |
| JOL/calibration | ~ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | **✓ in-app** |
| Help-seeking shaping (exec→instrumental) | ~ | ✗ | ✗ | ✗ | ~ | ✗ | ✓(EduChat) | ✗ | **✓** |
| Memory / learner model | ✓ | ✓ | ~ | ✓✓ (3-layer) | ✓ aspect | ✗ | ✗ | ~ | ~ (model + recent refl) |
| RAG / knowledge grounding | n/a | n/a | ~ | ✓ | ✓ repo | ✗ | ~ | ✗ | **✗** |
| Engagement (gamify/streak/reminder) | ✗ | ~ | ✓ | ~ | ~ | ✗ | ✗ | ✓✓ | ~ (email reminder only) |
| Multiuser/auth/deploy | lab | lab | lab | ✓ | ✓✓ | ✗ | ✗ | ✓✓ | **✓ serverless** |
| Research instrumentation | ✓✓ | ✓ | ✓ | ~ | ✓ metrics | ✓ export | ✗ | ✗ | **✓✓ (conditions×style×timing, per-turn label+state, calibration, export)** |
| Visual/interactive tutoring | ~ | ✓ model | 3D | ✓ | ✗ | ✗ | ✓✓ | ✗ | ✗ |
| Affect regulation | ~ | ✓ | ~ | ✗ | ~ | ✗ | ✗ | ~(Ebb) | ✗ |

## 3. Where SAIL leads (novelty, already built)
1. **Self-instrumenting research platform** — manipulable condition × scaffoldStyle × scaffoldTiming in one deployed app, per-turn LABEL+STATE logging, JOL calibration, JSON/CSV export. No other system here is a deployable SRL-research instrument.
2. **Closed SRL loop across sessions** (reflection→carry-forward→next forethought). Classic ITS + commercial apps are within-session.
3. **JOL calibration in-app** (|confidence−performance|) — essentially unique in the set.
4. **Coach-not-answer + graded hints + help-seeking instrumentation** — directly answers the over-help critique most LLM tutors fail.
5. **Text-only contingent state detection (RQ13)** — MetaTutor needed eye-tracking/physio; SAIL infers from messages.
6. **Production shape** — serverless (Pages+Workers+D1), multiuser auth, email-scaffold reminders, cron.

## 4. Gaps that matter (prioritized to develop)

**Tier 1 — pedagogical depth (publishability + trust):**
- **RAG / knowledge grounding** (vs DeepTutor, Hephaestus): mentor is currently ungrounded → hallucination risk; ground on course materials. Also enables the "reliable scaffolding" line.
- **Affective scaffolding arm** (vs Betty's Brain, Ebb): no emotion/efficacy/anxiety support; needed for RQ2/RQ6 and engagement.
- **Memory consolidation** (vs DeepTutor L1/L2/L3): SAIL injects recent reflections but has no consolidated long-term learner memory (struggles/interests slots).

**Tier 2 — engagement/retention (real-world use):**
- **Gamification** (vs Forest/Habitica): streaks, focus rewards, momentum — SAIL has dashboard but no habit reinforcement → attrition risk in a pilot.
- **Scheduling/calendar** (vs Motion/Notion): SAIL has spacing nudges; add a real plan/calendar + Notion-style weekly review ritual.

**Tier 3 — modalities (depth of tutoring):**
- **Interactive math canvas** (vs ChatTutor GeoGebra/Mermaid): LLM-emits-viz-DSL for STEM.
- **Learning-by-teaching mode** (vs Betty's Brain): "explain it back to Marin" as an SRL mechanism.
- **Voice persona/output** (vs Ebb): SAIL has voice input only.

**Tier 4 — rigor/measurement:**
- **Scaffold fidelity/drift audit** (RQ15): label substrate exists; automate the check (addresses reliable-scaffolding concern).
- **Multichannel behavioral signals**: latency logged; add edit/retry, hint-request cadence as monitoring proxies (RQ14).
- **Open dialogue corpus + human-coding pipeline** (RQ13 gold standard) — a publishable artifact.

## 5. One-line verdict
SAIL already **integrates** the best of each family (PracLog's clean loop + EduChat's coach-not-answer + Hephaestus/DeepTutor dialogue + SRLAgent's phase agents + research instrumentation none of them have). Its distinctive moat is being a **deployable, self-instrumenting, contingent-fading SRL research platform**. The highest-leverage next builds are **RAG grounding, an affective arm, and engagement (streaks/scheduling)** — depth + retention, not more breadth.
