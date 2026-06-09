// Server OLM store: persistence wrapper over the pure arbiter core (olmCore). Write-through to sqlite
// so the shared learner model SURVIVES server restarts. Both apps read/write here via /api/olm.
import { type OLM, type Diff, newOLM, applyToOlm, betaUpdate, macroSummaryFrom } from './olmCore.js';
import { loadOlmRow, saveOlmRow } from './db.js';

export type { Diff };
export { betaUpdate };

const cache = new Map<string, OLM>();

export function getOLM(id: string, course?: string): OLM {
  if (!cache.has(id)) { const row = loadOlmRow(id) as OLM | undefined; cache.set(id, row ?? newOLM(id, course)); }
  return cache.get(id)!;
}

export function applyUpdate(id: string, writer: 'me' | 'sail', diff: Diff) {
  const olm = getOLM(id);
  const r = applyToOlm(olm, writer, diff);
  if (r.applied.length || (diff.events && diff.events.length)) saveOlmRow(id, olm);   // persist only on real change
  return { olm, ...r };
}

export const macroSummary = (id: string): string => macroSummaryFrom(getOLM(id));
