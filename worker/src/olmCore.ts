// PURE arbiter core (single source of truth for ownership + apply logic). No imports, no I/O.
// Byte-identical between worker/ and server/ (drift-guarded by sim/arbiter_contract.test.mjs).
// Persistence is runtime-specific and lives in the olm.ts wrappers (server=sqlite, worker=D1/memory).

export type Writer = 'me' | 'sail';
export const OWNERSHIP: Record<Writer, string[]> = {
  me:   ['by_concept.*.calibration_err', 'by_concept.*.jol_trend', 'by_concept.*.confusion_label', 'by_concept.*.beta', 'by_concept.*.voi'],
  sail: ['by_concept.*.help_seeking', 'by_concept.*.last_session', 'global.deadline_proximity', 'global.srl_level'],
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
