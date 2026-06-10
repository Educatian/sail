// PURE arbiter core (single source of truth for ownership + apply logic). No imports, no I/O.
// Byte-identical between worker/ and server/ (drift-guarded by sim/arbiter_contract.test.mjs).
// Persistence is runtime-specific and lives in the olm.ts wrappers (server=sqlite, worker=D1/memory).

export type Writer = 'me' | 'sail';
// Single-writer field ownership. ME (micro) owns the calibration/confusion/competence signal;
// SRL/SAIL (macro) owns goal/plan/phase/schedule. Neither may write the other's fields (arbiter
// rejects cross-writes). This is the substrate of the bidirectional ME<->SRL loop (see
// research/ME_SRL_LOOP_EVIDENCE.md: IntelliCode single-writer + field ownership).
export const OWNERSHIP: Record<Writer, string[]> = {
  // ME-owned: calibration sign (CHI-2025 confidence-correctness), confusion, competence Beta (voi/beta).
  me:   ['by_concept.*.calibration_err', 'by_concept.*.jol_trend', 'by_concept.*.confusion_label', 'by_concept.*.beta', 'by_concept.*.voi'],
  // SRL-owned: active goal/plan + forethought/performance/reflection phase + review schedule (FLoRA phase,
  // goal_setup/plan Marin modes). Written by SAIL, READABLE by ME for srlContext (Direction A).
  sail: ['by_concept.*.help_seeking', 'by_concept.*.last_session', 'global.deadline_proximity', 'global.srl_level',
         'global.active_goal', 'global.active_plan', 'global.phase', 'global.review_schedule'],
};
export interface OLM {
  learner_id: string; course_id?: string;
  by_concept: Record<string, Record<string, unknown>>;
  global: Record<string, unknown>;
  events: Array<Record<string, unknown>>; _rev: number;
}
export interface Diff { concept_id?: string; set?: Record<string, unknown>; events?: Array<Record<string, unknown>>; }

export const newOLM = (id: string, course?: string): OLM => ({ learner_id: id, course_id: course, by_concept: {}, global: { srl_level: 'medium' }, events: [], _rev: 0 });

function ownsField(writer: Writer, path: string): boolean {
  return (OWNERSHIP[writer] || []).some(p => new RegExp('^' + p.replace(/\./g, '\\.').replace(/\*/g, '[^.]+') + '$').test(path));
}
function setDeep(obj: Record<string, unknown>, path: string, value: unknown) {
  const ks = path.split('.'); let o = obj;
  for (let i = 0; i < ks.length - 1; i++) { o[ks[i]] ||= {}; o = o[ks[i]] as Record<string, unknown>; }
  o[ks[ks.length - 1]] = value;
}

// Mutates `olm` in place; enforces field ownership (single-writer). Returns applied/rejected paths.
export function applyToOlm(olm: OLM, writer: Writer, diff: Diff): { applied: string[]; rejected: Array<{ path: string; reason: string }> } {
  const applied: string[] = []; const rejected: Array<{ path: string; reason: string }> = [];
  if (diff.set) for (const [field, value] of Object.entries(diff.set)) {
    const path = diff.concept_id ? `by_concept.${diff.concept_id}.${field}` : field;
    if (path.split('.').some(s => s === '__proto__' || s === 'constructor' || s === 'prototype')) { rejected.push({ path, reason: 'unsafe key blocked' }); continue; }   // prototype-pollution guard
    const ownPath = path.replace(/by_concept\.[^.]+\./, 'by_concept.*.');
    if (!ownsField(writer, ownPath)) { rejected.push({ path, reason: `${writer} does not own ${ownPath}` }); continue; }
    if (diff.concept_id) { (olm.by_concept[diff.concept_id] ||= {}); olm.by_concept[diff.concept_id][field] = value; }
    else setDeep(olm as unknown as Record<string, unknown>, path, value);
    applied.push(path);
  }
  if (diff.events) for (const e of diff.events) olm.events.push({ writer, ...e });
  if (applied.length || diff.events) olm._rev += 1;
  return { applied, rejected };
}

export const betaUpdate = (b: { a: number; b: number } | undefined, correct: number) => correct ? { a: (b?.a ?? 1) + 1, b: b?.b ?? 1 } : { a: b?.a ?? 1, b: (b?.b ?? 1) + 1 };

// macro read helper SAIL's mentor folds into context (micro→macro synergy)
export function macroSummaryFrom(olm: OLM | undefined): string {
  if (!olm) return '';
  const flagged = Object.entries(olm.by_concept)
    .filter(([, v]) => typeof v.calibration_err === 'number' && (v.calibration_err as number) >= 0.3)
    .sort((a, b) => (b[1].calibration_err as number) - (a[1].calibration_err as number));
  if (!flagged.length) return '';
  const [cid, rec] = flagged[0];
  return `From their practice (ME chatbot): the learner was ${rec.jol_trend} on "${cid}" (calibration gap ${(rec.calibration_err as number).toFixed(2)}) — consider a brief review.`;
}

// ============================================================================
// BIDIRECTIONAL ME<->SRL LOOP — pure helpers (shared by both runtimes + both apps).
// Evidence: ME_SRL_LOOP_EVIDENCE.md. Direction B = ME signal -> SRL planning control rule
// (ES-LLMs deterministic orchestrator). Direction A = SRL state -> ME contextual render (MetaCLASS).
// ============================================================================

// --- Direction B: read ME-owned fields into a per-concept signal the planner can act on. ---
// over_confident(c) = CHI-2025-style signed calibration: jol_trend 'overconfident' (confidence > correctness).
// confusion(c) = ME confusion_label at an impasse. competence = Beta mean (voi/beta), staleness from t.
export interface MeConceptSignal {
  concept_id: string;
  over_confident: boolean;
  under_confident: boolean;
  confusion: boolean;
  calibration_err: number;
  competence: number | null;
  staleDays: number;
}
function betaMean(b: unknown): number | null {
  const x = b as { a?: number; b?: number } | undefined;
  if (!x || typeof x.a !== 'number' || typeof x.b !== 'number' || x.a + x.b <= 0) return null;
  return x.a / (x.a + x.b);
}
export function meSignalsFrom(olm: OLM | undefined, now = Date.now()): MeConceptSignal[] {
  if (!olm) return [];
  const out: MeConceptSignal[] = [];
  for (const [cid, rec] of Object.entries(olm.by_concept || {})) {
    const trend = rec.jol_trend as string | undefined;
    const ce = typeof rec.calibration_err === 'number' ? rec.calibration_err as number : 0;
    const conf = rec.confusion_label as string | undefined;
    const voi = rec.voi as { comp?: unknown; t?: number } | undefined;
    const comp = betaMean(voi?.comp ?? rec.beta);
    const t = (voi && typeof voi.t === 'number') ? voi.t : undefined;
    const staleDays = t ? Math.max(0, (now - t) / 86_400_000) : 0;
    out.push({
      concept_id: cid,
      over_confident: trend === 'overconfident',
      under_confident: trend === 'underconfident',
      confusion: conf === 'impasse' || conf === 'confused' || conf === 'stuck',
      calibration_err: ce,
      competence: comp,
      staleDays: +staleDays.toFixed(1),
    });
  }
  return out;
}

// --- Direction A: read SRL-owned fields into a plain-language context block for the ME renderer. ---
// Returns null when no SRL plan/goal/phase is present (feature-detect: ME then behaves as P0).
export interface SrlContext { goal?: string; subject?: string; strategy?: string; minutes?: number; phase?: string; focusConcepts?: string[]; }
export function srlContextFrom(olm: OLM | undefined): SrlContext | null {
  if (!olm) return null;
  const g = (olm.global || {}) as Record<string, unknown>;
  const goal = g.active_goal as { distal?: string } | string | undefined;
  const plan = g.active_plan as { subject?: string; strategy?: string; minutes?: number; concepts?: string[] } | undefined;
  const phase = typeof g.phase === 'string' ? g.phase as string : undefined;
  const distal = typeof goal === 'string' ? goal : goal?.distal;
  if (!distal && !plan && !phase) return null;
  const ctx: SrlContext = {};
  if (distal) ctx.goal = distal;
  if (plan?.subject) ctx.subject = plan.subject;
  if (plan?.strategy) ctx.strategy = plan.strategy;
  if (typeof plan?.minutes === 'number') ctx.minutes = plan.minutes;
  if (phase) ctx.phase = phase;
  if (Array.isArray(plan?.concepts) && plan!.concepts!.length) ctx.focusConcepts = plan!.concepts!.slice(0, 6);
  return Object.keys(ctx).length ? ctx : null;
}
