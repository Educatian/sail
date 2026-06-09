// Adaptive review scheduler (planner/macro engine), TS port of sail-me/shared/review_scheduler.mjs.
// Turns the per-concept latent ME belief (competence + uncertainty, with FORGETTING drift) into a
// prioritized "what to review next" queue. Byte-mirrored worker<->server; numeric-equality contract
// with the .mjs is guarded by sim/review_contract.test.mjs.
interface Beta { a: number; b: number }
interface Belief { comp: Beta; cal?: Beta; biasSum?: number; biasN?: number; t?: number }

const SD_MAX = Math.sqrt(1 / 12);
const driftB = (b: Beta, dt: number, rho = 0.85): Beta => { const f = Math.pow(rho, Math.max(0, dt)); return { a: 1 + (b.a - 1) * f, b: 1 + (b.b - 1) * f }; };
const meanB = (b: Beta) => b.a / (b.a + b.b);
const sdB = (b: Beta) => Math.sqrt((b.a * b.b) / ((b.a + b.b) ** 2 * (b.a + b.b + 1)));
const U = (b: Beta) => Math.min(1, sdB(b) / SD_MAX);

export interface ReviewItem { concept_id: string; priority: number; competence: number; uncertainty: number; elapsedDays: number; reason: string; blockedBy?: string[] }
export interface SchedOpts { now?: number; msPerTick?: number; wGap?: number; wUnc?: number; elapsed?: number; threshold?: number; prereqs?: Record<string, string[]>; readyThreshold?: number }

export function scheduleReviews(byConcept: Record<string, unknown>, opts: SchedOpts = {}): ReviewItem[] {
  const now = opts.now ?? 0, mspt = opts.msPerTick ?? 86_400_000;
  const wGap = opts.wGap ?? 1.0, wUnc = opts.wUnc ?? 1.0;
  const items: ReviewItem[] = [];
  for (const [cid, rec] of Object.entries(byConcept || {})) {
    const r = rec as { comp?: Beta; voi?: Belief };
    const bel0: Belief | null = r && r.comp ? (r as Belief) : (r && r.voi && r.voi.comp ? r.voi : null);
    if (!bel0) continue;
    const elapsed = (bel0.t && now) ? Math.max(0, (now - bel0.t) / mspt) : (opts.elapsed ?? 0);
    const comp = elapsed > 0 ? driftB(bel0.comp, elapsed) : bel0.comp;
    const competence = meanB(comp), uncertainty = U(comp);
    const priority = wGap * (1 - competence) + wUnc * uncertainty;
    const reason = competence < 0.5 ? "low mastery"
      : (elapsed >= 3 && uncertainty > 0.45) ? "likely forgotten (stale)"
      : uncertainty > 0.5 ? "still building / uncertain" : "solid";
    items.push({ concept_id: cid, priority: +priority.toFixed(3), competence: +competence.toFixed(2), uncertainty: +uncertainty.toFixed(2), elapsedDays: +elapsed.toFixed(1), reason });
  }
  // prerequisite-awareness (graph-informed): defer a concept whose prerequisites are still weak,
  // so the planner surfaces the prerequisite first. opts.prereqs = {conceptId:[prereqIds]}.
  if (opts.prereqs) {
    const comp: Record<string, number> = Object.fromEntries(items.map(it => [it.concept_id, it.competence]));
    const ready = opts.readyThreshold ?? 0.5;
    for (const it of items) {
      const unmet = (opts.prereqs[it.concept_id] || []).filter(p => (comp[p] ?? 0) < ready);
      if (unmet.length) { it.priority = +(it.priority * 0.4).toFixed(3); it.blockedBy = unmet; it.reason = "needs prerequisite first: " + unmet.join(", "); }
    }
  }
  items.sort((a, b) => b.priority - a.priority);
  return items;
}
export const nextReview = (byConcept: Record<string, unknown>, opts?: SchedOpts) => scheduleReviews(byConcept, opts)[0] ?? null;
export function reviewNudge(byConcept: Record<string, unknown>, opts: SchedOpts = {}): string {
  const top = nextReview(byConcept, opts);
  if (!top || top.priority < (opts.threshold ?? 0.5)) return "";
  return `Suggested next review: "${top.concept_id}" (${top.reason}; mastery ${(top.competence * 100) | 0}%, uncertainty ${(top.uncertainty * 100) | 0}%).`;
}
