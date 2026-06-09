// ME engine (deterministic policy) ported from sail-me/engine.mjs — the evidence-based
// correction to LLM-driven stretch: the policy picks the move IN CODE, the LLM only renders it.
// Anchors: StratL (intent->prompt-chunk), MetaCLASS (abstain as 1st-class), "Knowing When to Quit" (V<λ).

export type Move =
  | 'ELICIT_FOK' | 'ELICIT_JOL' | 'PROBE_CONFUSION'
  | 'ELICIT_FOC' | 'ELICIT_FOS' | 'OFFER_HINT' | 'NAME_THE_FEELING' | 'ABSTAIN';
// OFFER_HINT = honest content-help scaffold (one conceptual step, never the answer) — added after a
// frustration walkthrough showed a feeling-only bot dodges low-prior + executive learners.
// All moves elicit a metacognitive EXPERIENCE (Efklides feelings + judgments), not knowledge.
// REVERSE_CONDITIONAL was removed (it elicited conditional KNOWLEDGE) → ELICIT_FOC + ELICIT_FOS.

export interface TracerState {
  confusion: number;                        // 0..1
  help_seeking: 'instrumental' | 'executive' | 'none';
  help_request: boolean;                    // explicit "explain / walk me through / I don't get it"
  confidence_signal: 'over' | 'under' | 'calibrated' | null;
  named: boolean;
  raw?: string;
}

const norm = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9{} ]/g, ' ').replace(/\s+/g, ' ').trim();

// ---- STATE TRACER (mock classification; an LLM classifier can replace this) ----
export function traceMessage(m: string): TracerState {
  const t = norm(m);
  const has = (...ws: string[]) => ws.some((w) => t.includes(w));
  const confusion = has('stuck', 'confused', 'lost', 'dont get', 'don t get', 'no idea', 'not sure why', 'makes no sense')
    ? 0.8 : has('maybe', 'i think', 'not sure', 'unsure', 'kind of', 'guess') ? 0.5 : 0.15;   // "why does" removed: instrumental, not confusion (playtest finding)
  const executive = has('just tell me', 'give me the answer', 'whats the answer', 'what s the answer', 'correct answer', 'the answer', 'actual answer', 'the solution');
  const instrumental = has('why', 'how come', 'help me understand', 'explain', 'what makes', 'because', 'reason', 'does that mean');
  const help_seeking: TracerState['help_seeking'] = executive ? 'executive' : instrumental ? 'instrumental' : 'none';
  const help_request = has('explain', 'walk me through', 'walk through', 'help me', 'i don t get', 'i dont get', 'don t get', 'dont get', 'don t really get', 'dont really get', 'don t understand', 'dont understand', 'no idea what', 'how do i', 'make it make sense', 'what is a', 'what s a');
  const overconf = has('obviously', 'clearly', 'definitely', 'easy', 'of course');
  const specific = has('i understand', 'i get', 'i know') && has('but', 'stuck on', 'except', 'not the');
  const confidence_signal: TracerState['confidence_signal'] = specific ? 'calibrated' : overconf ? 'over' : confusion >= 0.5 ? 'under' : null;
  return { confusion, help_seeking, help_request, confidence_signal, named: has('feels like', 'feeling', 'it s like', 'like i'), raw: m };
}

// ---- POLICY ENGINE (PURE). One move or ABSTAIN; abstain when V < λ. ----
export interface MoveDecision { move: Move; V: number; lambda: number; }
export function selectMove(state: Partial<TracerState>, ctx: { phase: 'dialogue' | 'post_answer'; correct?: number; confidence?: number }, lambda = 0.45): MoveDecision {
  const cand: [Move, number][] = [];
  if (ctx.phase === 'post_answer') {
    if (ctx.correct && (ctx.confidence ?? 0) >= 70) cand.push(['ELICIT_FOS', 0.8]);
    if (!ctx.correct && (ctx.confidence ?? 0) >= 70) cand.push(['PROBE_CONFUSION', 0.9]);
    if (ctx.correct && (ctx.confidence ?? 0) < 70) cand.push(['ELICIT_FOK', 0.6]);
    if (!ctx.correct && (ctx.confidence ?? 0) < 70) cand.push(['ELICIT_FOK', 0.7]);
    cand.push(['ELICIT_JOL', 0.5]);
  } else {
    if (state.help_request || state.help_seeking === 'executive') cand.push(['OFFER_HINT', 0.9]);   // genuinely stuck / wants the answer → one real conceptual step (not the answer)
    if ((state.confusion ?? 0) >= 0.7) cand.push(['PROBE_CONFUSION', 0.85]);
    if (state.named || (state.confusion ?? 0) >= 0.5) cand.push(['NAME_THE_FEELING', 0.55]);
    if (state.confidence_signal === 'over') cand.push(['ELICIT_FOC', 0.6]);
    if (state.confidence_signal === 'calibrated' && state.help_seeking !== 'executive' && (state.confusion ?? 0) < 0.5) cand.push(['ABSTAIN', 0.7]);   // ONLY when well-regulated
    cand.push(['ELICIT_FOK', 0.5]);   // floor ≥ λ: always engage — never silently abstain on a learner who spoke
  }
  cand.sort((a, b) => b[1] - a[1]);
  const [move, V] = cand[0];
  if (move === 'ABSTAIN' || V < lambda) return { move: 'ABSTAIN', V, lambda };
  return { move, V, lambda };
}

// ---- RENDERER STEERING (StratL intent->prompt-chunk). Constrains the LLM to ONE move. ----
const DIRECTIVE: Record<Move, string> = {
  ELICIT_FOK: 'CHOSEN MOVE = ELICIT_FOK. Ask the learner to put into their OWN words which part feels solid and which part is still loose right now. Do NOT explain anything yourself. One question, then stop.',
  ELICIT_JOL: 'CHOSEN MOVE = ELICIT_JOL. Ask the learner to predict (0-100) whether they could redo this unaided if the surface details changed, and whether that number feels solid or more of a guess. Emit a probe block (feeling="knowing", phase="post").',
  PROBE_CONFUSION: 'CHOSEN MOVE = PROBE_CONFUSION. The learner is stuck. Ask where it STARTS to feel confusing and what that stuck feeling is like. Do NOT resolve it — productive confusion. One question, then stop.',
  ELICIT_FOC: 'CHOSEN MOVE = ELICIT_FOC. The learner sounds confident. Ask how confident they actually FEEL right now, and what that confidence is resting on (a solid sense or a hunch). Do NOT confirm or give the answer. Emit a probe block (feeling="confidence", phase="pre").',
  ELICIT_FOS: 'CHOSEN MOVE = ELICIT_FOS. The learner has worked it through. Ask how it FEELS now — did it click, still feel shaky, or somewhere in between. Warm and brief. Emit a probe block (feeling="confidence", phase="post").',
  OFFER_HINT: 'CHOSEN MOVE = OFFER_HINT. The learner is genuinely stuck or wants the answer. Give ONE small conceptual step toward the idea — a nudge, never the final answer or full solution. If you already gave a hint earlier in this conversation and they are still stuck, make THIS hint MORE specific than the last (escalate). Keep it warm and brief, then invite them to take the next step themselves.',
  NAME_THE_FEELING: "CHOSEN MOVE = NAME_THE_FEELING. Ask the learner to give the current feeling a NAME (e.g. 'I can run the steps but can't say why'). Then stop.",
  ABSTAIN: 'CHOSEN MOVE = ABSTAIN. The learner is regulating well on their own. Do NOT scaffold or probe. Acknowledge their progress in ONE short sentence and hand control back.',
};

// Compute the steering suffix for a stretch turn + the decision (for telemetry).
// First turn (no learner message yet) -> pre-probe via ELICIT_FOK.
export function stretchSteering(
  history: { role: 'user' | 'assistant'; content: string }[],
  lambda = 0.45,
): { decision: MoveDecision; directive: string; tracer: TracerState | null } {
  const lastUser = [...history].reverse().find((m) => m.role === 'user');
  if (!lastUser) {
    const move: Move = 'ELICIT_FOK';
    return {
      decision: { move, V: 0.6, lambda },
      directive: DIRECTIVE[move] + ' Open with a pre probe block (feeling="knowing", phase="pre").',
      tracer: null,
    };
  }
  const tracer = traceMessage(lastUser.content);
  const decision = selectMove(tracer, { phase: 'dialogue' }, lambda);
  return { decision, directive: DIRECTIVE[decision.move], tracer };
}
