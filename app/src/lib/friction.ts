// Shared per-session "friction budget": caps how many times SAIL interrupts a learner
// with a check-in card or a feeling-probe in a single study session. Measurement stays
// invisible; care stays visible. Logging is unaffected — this only gates whether a
// student-facing prompt is allowed to surface.
//
// Both the in-session momentary check (ActiveSession) and the stretch feeling-probe
// (MarinChat) draw from the SAME budget, keyed by sessionId, so a learner is never
// peppered across the two surfaces.

const MAX_INTERRUPTIONS = 2;
const KEY = (sessionId: string) => `sail-friction:${sessionId}`;

function read(sessionId: string): number {
  if (!sessionId) return 0;
  try {
    const n = Number(localStorage.getItem(KEY(sessionId)));
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch { return 0; }
}

/** How many auto-initiated interruptions remain for this session. */
export function frictionRemaining(sessionId: string): number {
  return Math.max(0, MAX_INTERRUPTIONS - read(sessionId));
}

/** True when SAIL may still surface an auto-initiated check/probe for this session. */
export function canInterrupt(sessionId: string): boolean {
  return frictionRemaining(sessionId) > 0;
}

/** Record that one auto-initiated interruption was surfaced. Returns remaining budget. */
export function spendInterruption(sessionId: string): number {
  if (!sessionId) return 0;
  const next = read(sessionId) + 1;
  try { localStorage.setItem(KEY(sessionId), String(next)); } catch { /* ignore */ }
  return Math.max(0, MAX_INTERRUPTIONS - next);
}

export const FRICTION_BUDGET = MAX_INTERRUPTIONS;
