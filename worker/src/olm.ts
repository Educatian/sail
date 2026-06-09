// Worker OLM store: D1-backed persistence wrapper over the pure arbiter core (olmCore), for the
// DEPLOYED path (Cloudflare workers are stateless, so the shared model must live in D1). Mirrors
// server/src/olm.ts (which uses sqlite). Apply the `olm` table from schema.sql to the D1 database.
import { type OLM, type Diff, newOLM, applyToOlm, betaUpdate, macroSummaryFrom } from './olmCore.js';

export type { Diff };
export { betaUpdate };

export async function getOLM(db: D1Database, id: string, course?: string): Promise<OLM> {
  const row = await db.prepare('SELECT json FROM olm WHERE learnerId = ?').bind(id).first<{ json: string }>();
  return row ? (JSON.parse(row.json) as OLM) : newOLM(id, course);
}
async function saveOLM(db: D1Database, id: string, olm: OLM): Promise<void> {
  await db.prepare('INSERT INTO olm (learnerId, json, updatedAt) VALUES (?1,?2,?3) ON CONFLICT(learnerId) DO UPDATE SET json=?2, updatedAt=?3')
    .bind(id, JSON.stringify(olm), new Date().toISOString()).run();
}
export async function applyUpdate(db: D1Database, id: string, writer: 'me' | 'sail', diff: Diff) {
  const olm = await getOLM(db, id);
  const r = applyToOlm(olm, writer, diff);
  if (r.applied.length || (diff.events && diff.events.length)) await saveOLM(db, id, olm);
  return { olm, ...r };
}
export async function macroSummary(db: D1Database, id: string): Promise<string> {
  return macroSummaryFrom(await getOLM(db, id));
}
