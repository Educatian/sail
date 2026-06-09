# SAIL — Introduction (draft v1)

*Target venues: British Journal of Educational Technology / Computers & Education / Journal of Computing in Higher Education (the venues of the anchor works). English draft for submission. Integrates `THEORETICAL_GENEALOGY.md` (why) + `NOVELTY_DIALECTIC.md` (what is empty) + nearest-neighbor differentiation.*

---

## 1. The present crisis: when AI support severs the regulation loop

Learners can now obtain on-demand explanations from generative AI, and the field has responded with a surge of design work: in OpenAlex, the intersection of "generative AI / large language model / ChatGPT" with "self-regulated learning" returns 478 records, of which 467 (98%) appeared in or after 2024. Yet the most-cited recent empirical study in this space delivers a warning rather than a promise. In a randomized experiment, Fan, Tang, Le, Shen, and Tan (2024, *BJET*) found that generative-AI support can induce **metacognitive laziness**: when an agent supplies answers, learners offload the very monitoring and control operations that constitute self-regulation. The design problem in higher education is therefore not "can the AI explain the content?" but "can the AI help learners regulate their own learning while they work, in the places where they actually study?"

This paper argues that answering that question well requires recovering a piece of self-regulated learning (SRL) theory that has been declared but never instrumented for sixty years: the *environmental* arm of self-regulation. We then present SAIL, a context- and spatial-aware mobile SRL mentor, as the first design in which the two historical preconditions for instrumenting that arm, real-time situational sensing and adaptive language scaffolding, are simultaneously available.

## 2. A genealogy of the empty cell (1948–2024)

The deep structure of every SRL model is a control loop. Cybernetics formalized purposeful action as goal-deviation-correction (Wiener, 1948), and Miller, Galanter, and Pribram (1960) imported that loop into cognition as the **TOTE unit** (Test-Operate-Test-Exit). Zimmerman's three-phase cycle (forethought, performance, reflection) is TOTE written for education. Critically, the original loop modeled regulation as an *organism-internal* process; the environment entered as input, not as a constituent. Metacognition named the loop's monitor (Flavell, 1979; Nelson & Narens, 1990) but kept the target inside the head.

The social-cognitive turn appeared to close this gap. Bandura's triadic reciprocal determinism (1977, 1986) made person, behavior, and **environment** mutually causal, and SRL was built on this foundation (Zimmerman, 1989). Here lies the field's defining contradiction: **the theory named environment as a constituent term, but the dominant operationalization left it blank.** The Motivated Strategies for Learning Questionnaire (Pintrich & De Groot, 1990) became the standard SRL instrument, measuring self-regulation as a trait-like, retrospective, context-free self-report. The discipline that admitted environment into its theory pushed it furthest from its measurement.

A counter-tradition objected. Situated cognition (Brown, Collins, & Duguid, 1989) and distributed cognition (Hutchins, 1995; Lave & Wenger, 1991) argued that cognition is constituted by its physical and social setting and cannot be decontextualized. But the two traditions split into parallel paradigms rather than merging: SRL became an individual-differences psychology, situativity an anthropology of learning. The field entered the 2000s carrying both an internal contradiction (theory names environment, measurement omits it) and a paradigm rift.

Two enabling conditions arrived separately and late. Winne and Hadwin (1998) reconceived SRL as *events and traces* rather than a trait, which is in principle capturable in situ; mobile learning analytics finally provided the instrument to log those traces where learning happens (Tabuenca, Kalz, Drachsler, & Specht, 2015, *Computers & Education*). That closed half the gap: the environmental arm could now be *captured*, but not yet *responded to* adaptively. The other half arrived with generative AI, which can produce context-tailored language scaffolding in real time, that is, a dynamic realization of the loop's Operate step. The catch, as Fan et al. (2024) show, is that a naive engine *cuts* the loop instead of closing it.

## 3. The empty cell, measured

If the genealogy explains *why* a context-aware SRL mentor was deferred, a literature scan shows *that* its exact position is still unoccupied. Using OpenAlex strict-boolean title-and-abstract queries (2026-06-03):

| Literature region | Records | Since 2024 |
|---|---|---|
| self-regulated learning (alone) | 21,258 | 6,156 |
| generative AI x SRL | 478 | 467 |
| context-aware x SRL | 25 | 17 |
| location/spatial x SRL | 3 | 0 |
| mobile x generative AI x SRL | 10 | 9 |
| **spatial x generative AI x SRL** | **0** | **0** |

Context-aware SRL is not new in conception: the earliest cluster is pre-LLM (e.g., the mobile context-aware adaptive learning schedule, 2008; an ambient e-learning metacognitive approach, 2012), but it stalled at 25 records because rule-based schedulers could not respond to context with adaptive scaffolding. The four-way intersection that defines SAIL, spatial context combined with a generative mentor combined with SRL, returns **zero** records. The emptiness is not accidental; it is the trace of the two preconditions becoming jointly available only now.

## 4. Differentiation from nearest neighbors

Even the closest existing systems each vacate at least one axis SAIL occupies.

| System | Mentor engine | Anti-answer / loop-preserving | Spatial/context layer | Mobile-native | Self-instrumenting research telemetry | Measurement-intervention separation | Status |
|---|---|---|---|---|---|---|---|
| **Ng et al. (2024), SRLbot** (*BJET*) | GenAI chatbot | Personalized recommendations (not coach-not-answer) | No | Web, classroom | RCT measures (interactions), study-specific | JOL inside interaction | 3-week classroom study |
| **Han et al. (2025)** (*JCHE*) | GenAI chatbot | Not central | No | Mobile | Study-specific | Not separated | Flipped-classroom study |
| **Chang et al. (2023)** (*Sustainability*) | None (design principles) | Goal-setting/feedback/personalization, conceptual | No | n/a | n/a (no system) | Proposes JOL integration | Conceptual paper |
| **Fan et al. (2024)** (*BJET*) | GenAI (as stimulus) | Documents the laziness failure | No | No | Experimental only | n/a | Empirical study (antithesis) |
| **Tabuenca et al. (2015)** (*C&E*) | None (analytics) | n/a | Time/place logging, no adaptive scaffold | Mobile | Logging only | n/a | Instrument precursor |
| **SAIL (this work)** | **Policy-controlled GenAI (Marin)**; scaffold decision separated from LLM phrasing | **Coach-not-answer + graded hints** (Aleven et al., 2006 lineage) operationalizing the response to Fan et al. (2024) | **Opt-in place categories + summarized, non-raw spatial signals**, interpreted with task type and reflection | **Web + Android (Capacitor)**, deployed | **Conditions x scaffold style x timing x label protocol x state detection x calibration x context**, exportable | **JOL kept outside the bot** (Nelson-Narens monitoring-control) | **Deployed public prototype** (sail-dia.pages.dev) |

Ng et al. (2024) and Han et al. (2025) jointly establish that a mobile generative SRL chatbot is feasible and can reduce anxiety and sustain study habits, but neither instruments the situational arm. Chang et al. (2023) supply design principles (goal setting, feedback, personalization) without a deployed system or a context layer. Fan et al. (2024) is the antithesis SAIL answers rather than a competitor. Tabuenca et al. (2015) is the instrument precursor without an adaptive mentor.

## 5. Contribution and claims

We make three contributions.

1. **Theoretical.** We reframe context- and spatial-aware SRL not as a feature but as the overdue resolution of a sixty-year unfinished synthesis: it instruments the environmental term that triadic SRL declared (Bandura, 1986) yet standard measurement omitted (Pintrich & De Groot, 1990), and it operationally bridges the internalist control-loop tradition with the situativity critique (Brown et al., 1989), while avoiding the loop-severing failure of naive generative support (Fan et al., 2024).

2. **Methodological.** SAIL is a self-instrumenting research platform: it logs condition (metacognitive vs plain), scaffold style (problematizing vs structuring), scaffold timing (responsive vs proactive), a mentor label protocol, message-derived learner state, calibration error, and opt-in context signals into exportable traces, while keeping judgment-of-learning measurement outside the chatbot to avoid contamination. It introduces non-surveillance spatial telemetry (place categories and rounded/summarized signals, with raw coordinates redacted before persistence) into a region (location x SRL) with three prior records.

3. **Practical.** SAIL is a deployed web-plus-Android prototype on a zero-cost serverless stack (Cloudflare Workers + D1), with opt-in, IRB-defensible consent design and remote collaborator testing, ready to serve as the data-producing instrument for the intended higher-education SRL study.

## 6. Scope and honesty conditions

We do not claim spatial location is itself an SRL construct; it is a proxy entry to the environmental term and is interpreted only in conjunction with task type, reflection, and session behavior. Help-seeking quality and scaffold fidelity are currently rule-based proxies pending validation against human-coded dialogue. The bridge between internalist and situativist traditions is operational, not a philosophical unification: SAIL adopts the empirical insight that context modulates regulation without adopting situativity's anti-individualist ontology. These limits are stated to keep the contribution defensible.

---

### Reference anchors (verified via OpenAlex, 2026-06-03)

- Aleven, V., McLaren, B. M., Roll, I., & Koedinger, K. R. (2006). Toward meta-cognitive tutoring: A model of help seeking with a cognitive tutor. *IJAIED*.
- Bandura, A. (1977). Self-efficacy: Toward a unifying theory of behavioral change. / (1986). *Social Foundations of Thought and Action*.
- Brown, J. S., Collins, A., & Duguid, P. (1989). Situated cognition and the culture of learning.
- Chang, D., Lin, M. P.-C., Hajian, S., & Wang, Q. Q. (2023). Educational design principles of using AI chatbot that supports self-regulated learning. *Sustainability*.
- Fan, Y., Tang, L., Le, H., Shen, K., & Tan, S. (2024). Beware of metacognitive laziness. *BJET*.
- Flavell, J. H. (1979). Metacognition and cognitive monitoring.
- Han, I., Ji, H., Jin, S.-Y., & Choi, K. (2025). Mobile-based artificial intelligence chatbot for self-regulated learning in a hybrid flipped classroom. *JCHE*.
- Hutchins, E. (1995). *Cognition in the Wild*.
- Lave, J., & Wenger, E. (1991). *Situated Learning: Legitimate Peripheral Participation*.
- Miller, G. A., Galanter, E., & Pribram, K. H. (1960). *Plans and the Structure of Behavior*.
- Nelson, T. O., & Narens, L. (1990). Metamemory: A theoretical framework and new findings.
- Ng, D. T. K., Tan, C. W., & Leung, J. K. L. (2024). Empowering student self-regulated learning and science education through ChatGPT. *BJET*.
- Pintrich, P. R., & De Groot, E. V. (1990). Motivational and self-regulated learning components of classroom academic performance.
- Tabuenca, B., Kalz, M., Drachsler, H., & Specht, M. (2015). Time will tell: The role of mobile learning analytics in self-regulated learning. *Computers & Education*.
- Wiener, N. (1948). *Cybernetics: Or Control and Communication in the Animal and the Machine*.
- Winne, P. H., & Hadwin, A. F. (1998). Studying as self-regulated learning.
- Zimmerman, B. J. (1989). A social cognitive view of self-regulated academic learning.
