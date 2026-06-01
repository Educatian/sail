# SAIL Project Concept

## One-Sentence Concept

SAIL is a self-regulated learning mentor for college and graduate students that turns every study session into a measurable cycle of planning, monitored performance, and reflection.

## Problem

Students often use AI tools to get answers faster, but answer delivery can weaken metacognitive monitoring, calibration, and productive help-seeking. In higher education, the more important design problem is not "can the AI explain this content?" but "can the AI help learners regulate their own learning process while they work?"

SAIL treats the AI mentor as a scaffold for self-regulation rather than as a general homework solver.

## Target Users

SAIL is designed around university learning work:

- Undergraduate coursework, exam preparation, projects, lab work, and reading.
- Graduate seminar reading, literature synthesis, research writing, thesis/dissertation work, and independent study.
- Research deployments where SRL, metacognition, help-seeking, calibration, and learning-context data need to be logged as analyzable traces.

## Theoretical Frame

SAIL operationalizes a three-phase self-regulated learning loop:

1. **Forethought**: goals, strategies, confidence, planned time, work type, learning context.
2. **Performance**: time-on-task, progress checks, help-seeking, strategy monitoring, graded hints, Socratic prompting.
3. **Reflection**: perceived focus/progress/satisfaction, calibration notes, learner-model correction, next-session adjustment.

The mentor design emphasizes:

- Metacognitive monitoring: "What do you think you know right now?"
- Control decisions: "What strategy will you try next?"
- Help-seeking quality: "What have you tried before asking for help?"
- Scaffold fading: "Can you take the next step before I give another hint?"
- Reflection and transfer: "What will you change next time?"

The detailed instructional design rules are documented in [`INSTRUCTIONAL_DESIGN_PRINCIPLES.md`](INSTRUCTIONAL_DESIGN_PRINCIPLES.md). The development rationale and evidence register are documented in [`DEVELOPMENT_LOG.md`](DEVELOPMENT_LOG.md).

## Mentor Experience

The mentor, Marin, has two research-facing modes:

- **Metacognitive**: foregrounds planning, monitoring, strategy selection, calibration, and reflection.
- **Plain**: offers more direct content support while still respecting academic-integrity boundaries.

The interface words these settings for students as simple choices, such as "Coach my process" and "Just help with content," while preserving the research constructs in telemetry.

SAIL also varies scaffold style and timing:

- Problematizing prompts that make the learner notice uncertainty or contradictions.
- Structuring prompts that organize the task, next step, or strategy.
- Responsive scaffolds when the learner asks or appears stuck.
- Proactive scaffolds at planned check-in points.

## Spatial and Context Data

SAIL includes an opt-in context acquisition layer because self-regulated learning happens in real places and routines.

The current design combines:

- Learner-selected place categories, such as library, classroom/lab, home/dorm, transit, work/social space, or no recording.
- Optional browser geolocation.
- Optional device-motion summaries where available.
- Rounded area labels and map preview.
- Dwell/transition style summaries for research features.

The system is designed not to store exact raw GPS paths. Research telemetry should support context-aware analysis without turning the app into a surveillance tool.

## Research Telemetry

SAIL logs research traces that can support analysis of:

- Session planning quality.
- Strategy selection and carry-forward.
- Mentor condition and scaffold choices.
- Help-seeking moments and hint level.
- Time-on-task and pauses.
- Goal progress.
- Context consent and detection state.
- Reflection ratings and next-session adjustment.
- Export and dashboard use.
- Client-side error events for deployment QA.

The Cloudflare Worker endpoint sanitizes event payloads and redacts raw latitude/longitude-like keys before writing telemetry to D1.

## What Makes SAIL Different

SAIL is not a generic chatbot wrapper. Its contribution is the coupling of:

- SRL theory as an app workflow.
- Mentor policy that separates scaffold decision-making from LLM phrasing.
- Student-facing wording that feels natural while still mapping to research constructs.
- Context-aware telemetry for studying when and where students regulate learning.
- Research export paths for trace analysis.
- A deployable web + Android prototype rather than a static design mockup.

## Current Implementation

Implemented:

- Web app deployed on Cloudflare Pages.
- Worker API with D1 persistence.
- Local Node/Hono API for development.
- Goal Studio, active mentor session, reflection, dashboard, and research evidence view.
- Optional GPS/motion context capture.
- OpenStreetMap-based location preview.
- Event telemetry and export routes.
- Android debug build path through Capacitor.

Current public prototype:

https://sail-dia.pages.dev

## Near-Term Development Priorities

1. Tighten participant consent and IRB-facing language.
2. Add instructor/researcher export views for repeated breakdowns and help-seeking patterns.
3. Validate telemetry schema against pilot sessions.
4. Add Canvas/LMS integration for external JOL collection.
5. Harden Android background context capture for field deployment.
6. Prepare analysis scripts for SRL phase transitions, scaffold timing, and help-seeking quality.
