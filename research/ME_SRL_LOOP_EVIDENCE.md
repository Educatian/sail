# ME↔SRL Coupled-Tutor / Shared-OLM — Implemented & Validated Evidence Base

Grounding for the bidirectional loop (SRL-state-aware ME chatbot ⇄ ME-state-aware SRL
planner over a shared single-writer OLM). Every citation checked by fetching the arXiv
abstract / resolving the DOI; paywalled full texts marked **[VERIFIED-metadata]** (title/
authors/N corroborated across ≥2 sources). 2026 arXiv IDs are recent (env date 2026-06).

## Ranked evidence (implemented + validated + architectural overlap)

| # | Paper | ID/DOI [verify] | Implements | Validated (N/effect) | Code |
|---|---|---|---|---|---|
| 1 | Lee, Stinar, Zong et al. — Learning Behaviors Mediate AI Metacognitive-Calibration Support, **CHI 2025** (Best Paper HM) | 10.1145/3706598.3713960 [VERIFIED-metadata; NSF-PAR copy] | AI elicits predicted grade (JOL) vs actual → calibration, targets overconfidence | **RCT N=133**, +8.9% learning (p=.019, behavior-mediated); overconfident +4.1% calibration (p=.049) | – |
| 2 | Kadir — ES-LLMs (Ensemble of Specialized LLMs), **AIED 2026** | arXiv:2603.23990 [VERIFIED] | **Deterministic rules orchestrator + interpretable BKT student model + LLM renderer**; attempt-before-hint, hint caps, per-turn trace | Expert N=6 (91.7% pref), LLM-judge 79.2%, Monte-Carlo N=2400: 100% constraint adherence, 3.3× hint efficiency | – |
| 3 | Alsaiari, Baghaei, Lodge, Noroozi, Gašević, Boden, Khosravi — Directive/Metacognitive/Hybrid, **CAEAI 2026** | arXiv:2510.19685 / 10.1016/j.caeai.2026 [VERIFIED] | LLM feedback typed directive/metacog/hybrid (RiPPLE) | **Semester RCT N=329**; hybrid→most revisions, confidence high | – |
| 4 | Liu, Baraniuk, Sonkar — MetaCLASS | arXiv:2602.02457 [VERIFIED] | **Move-selection over 11 interpretable actions**; two-phase **plan-then-render conditioned on profile=calibration+help-seeking**; No_intervention first-class | 1,015 convos/7,711 turns labeled; benchmark (best 43.2% acc; compulsive-intervention bias). No outcome RCT | – |
| 5 | Puech, Macina, Chatain, Sachan, Kapur — StratL | arXiv:2410.03781 [VERIFIED] | Steers LLM to a predefined multi-turn plan as **transition graph** (Productive Failure) | Field N=17 HS; adheres, no negative spillover | **Yes** (GitHub RomainPuech/StratL) |
| 6 | Fan et al. — Beware of Metacognitive Laziness, **BJET 2024** | arXiv:2412.09315 / 10.1111/bjet.13544 [VERIFIED] | GenAI vs human vs analytics vs control; SRL process tracing | **RCT N=117**; ChatGPT best essay-score, **no** knowledge/transfer gain; SRL process differs | – |
| 7 | Li et al. — FLoRA engine, **C&E 2025** | arXiv:2507.07362 / 10.1016/j.compedu.2025 [VERIFIED] | Trace capture + **GenAI scaffold auto-triggered when a critical SRL process is absent in a time window** | Multi-study SRL gains (abstract) | Engine |
| 8 | Li et al. — FLoRA Engine (analytics), **JLA** | arXiv:2412.09763 [VERIFIED] | Trace parser **raw actions→SRL processes** (process mining) + adaptive scaffold | Think-aloud validation | Engine |
| 9 | Xu, Qiao et al. — Metacog support over GenAI, **BJET 2025** | 10.1111/bjet.13599 [VERIFIED-metadata; ERIC EJ1479919] | Explicit metacog layer over GenAI | Quasi-exp **N=68**, 4wk; no achievement diff; ↑ SRL strategy & self-eval | – |
| 10 | David, Ghosh — IntelliCode, **EACL 2026 Demo** | arXiv:2512.18669 [VERIFIED abstract] | **Versioned centralized learner state, single-writer**; mastery+misconceptions+review+engagement; 6 agents incl. spaced-rep | **Simulated learners only** | – |
| 11 | Ng et al. — SRLbot/Nemobot pilot, **BJET 2024** | 10.1111/bjet.13454 [VERIFIED-metadata] | GenAI SRLbot vs rule-based; personalized SRL recs | Comparative RCT **N=74** S4, 3wk; ↑ knowledge/engagement/motivation | – |
| 12 | GenAI-SRL RCT, **Educational Psychology Review 2026** | 10.1007/s10648-026-10133-8 [VERIFIED-metadata] | Pre-reg RCT ChatGPT vs SRLbot vs **Emotional-SRLbot**; forethought/perf/reflection | **RCT N=144** HS | – |
| 13 | AI-feedback→SRL three-level meta-analysis, **EdPsychRev 2026** | 10.1007/s10648-026-10166-z [VERIFIED-metadata] | Pooled AI-feedback→SRL | meta-analysis | – |

**Dropped / corrected:** "PedagogicalRL" — no canonical arXiv found → **[UNVERIFIED, dropped]**. IntelliCode "BKT+SM-2" not in primary abstract → treat algorithm names as **[UNVERIFIED]** (verified only "mastery + spaced-rep + single-writer"). MetaCLASS shares an acronym with an unrelated CS-classification project → cite by arXiv ID.

## Per-component most-validated method → our build

| Loop component | Use (most-validated) | Why strongest | Maps to |
|---|---|---|---|
| **(a) SRL state/phase for conditioning** | **FLoRA trace-parser** (2412.09763 / 2507.07362) | Only implemented engine mapping traces→theory-grounded SRL processes, think-aloud validated | SAIL: explicit `phase` enum (forethought/performance/reflection) + `active_goal/plan` object in OLM, populated FLoRA-style from events (we already ported traceParser) |
| **(b) ME/calibration signal** | **Lee CHI 2025** (10.1145/3706598.3713960) | Only **RCT** causally moving calibration(+4.1% overconf)+learning(+8.9%); calibration = predicted-grade(JOL) vs actual | ME→OLM: signed cal err = confidence − correctness → over/under flags (we compute this) |
| **(c) ME signal → planning control rule** | **ES-LLMs** orchestrator (2603.23990) + **MetaCLASS** move vocab (2602.02457) | ES-LLMs = only analog with quantified proof that explicit rules over interpretable model beat monolithic LLM (100% adherence, 3.3× efficiency); MetaCLASS supplies validated moves incl. No_intervention | SAIL: deterministic rule `overconfident(c) ⇒ insert self-check + schedule retrieval on c`; LLM render only |
| **(d) SRL context → ME (contextual)** | **MetaCLASS** two-phase plan-then-render-on-profile (2602.02457) + **StratL** transition-graph (2410.03781, code) | MetaCLASS = closest published instance of conditioning the within-task metacog move on a profile incl. calibration; StratL = only **field-validated (N=17)** multi-turn plan-adherence steering | ME: SRL active-goal/phase → selects/parameterizes ME plan graph → renderer |
| **(e) Evaluation to claim it works** | **Lee CHI 2025** RCT template + ES-LLMs offline policy-adherence sim | Pre-reg RCT w/ calibration + learning + behavior mediation, report **overconfident subgroup** (effect lives there); cheap offline sim for the deterministic policy | OSF pre-reg; secondary SRL-process/sequence per Fan BJET / EdPsychRev N=144 |

## Closest end-to-end analogs to copy
1. **ES-LLMs (2603.23990)** — structural twin: orchestrator+interpretable-model+renderer split, per-turn constraint logging. = our OLM-driven control loop in miniature.
2. **MetaCLASS (2602.02457)** — ME-side twin: move-selection over interpretable SRL actions, plan-then-render on calibration/help-seeking profile, No_intervention first-class. = our deterministic-move + LLM-renderer + ABSTAIN.
3. **StratL (2410.03781, public code)** + **FLoRA (2412.09763/2507.07362)** — copy StratL transition-graph plan adherence (reuse code) for ME & SRL plans; copy FLoRA trace→SRL-process parser + window-triggered scaffold for the macro loop.

## Novelty gaps (NO validated implementation exists — our contribution)
1. **Bidirectional ME↔SRL across two timescales.** Every validated system is single-loop. ES-LLMs/IntelliCode do macro→within-task (one way); MetaCLASS conditions ME on a *static* profile but never feeds ME calibration back to a between-task planner. **No implemented+validated system closes both arrows (A) SRL→ME and (B) ME-calibration→SRL-planning.** ← central novelty.
2. **Shared single-writer OLM written by BOTH a micro (ME) and a macro (SRL) agent** with field ownership (ME owns calibration/confusion/competence; SRL owns goal/plan/schedule), each conditioning the other. IntelliCode validates single-writer but all writers serve one timescale.
3. **Calibration error as the control variable that drives between-task review scheduling.** CHI 2025 validates calibration→learning *within* session; spaced-rep schedules on recall, not on miscalibration. "Schedule a self-check where overconfident" is unvalidated anywhere.
4. **Felt-signal (FOK/difficulty/confusion) tracing as a live input to planning.** MetaCLASS labels metacog turns offline; no validated system routes real-time Flavell-style experiences to a macro planner.
5. **No RCT yet ties a deterministic-policy+LLM-renderer ME tutor to between-task SRL outcomes.** A multi-session RCT of the coupled loop = net-new evidence.

## Build instruction (SAIL + sail-me + shared OLM)
- **OLM**: IntelliCode-style versioned single-writer, **field ownership** — ME writes `calibration_error / over|under_confident / confusion / competence_belief`; SRL writes `active_goal / plan / phase / review_schedule`.
- **sail-me (MICRO)**: MetaCLASS-style deterministic move policy (incl. No_intervention=ABSTAIN) + StratL transition-graph plan; LLM renderer only; calibration computed the CHI-2025 way.
- **sail (MACRO)**: ES-LLMs deterministic orchestrator consuming OLM calibration fields → control rule `overconfident(c) ⇒ insert self-check + schedule retrieval`; FLoRA trace parser sets `phase` / detects absent SRL processes to fire the macro loop.
- **Eval**: CHI-2025 RCT template + ES-LLMs offline policy-adherence sim; secondary SRL-process analysis.

_Compiled 2026-06-10 from web research (arXiv abstracts + DOI resolution; paywalled full texts metadata-verified)._
