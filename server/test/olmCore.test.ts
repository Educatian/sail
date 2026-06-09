import { describe, it, expect } from 'vitest';
import { newOLM, applyToOlm, betaUpdate, macroSummaryFrom } from '../src/olmCore.js';

// Single-writer arbiter contract (ME owns micro calibration signals, SAIL owns
// macro session/help-seeking signals). The cross-repo drift guard lives in
// sail-me/sim/arbiter_contract.test.mjs; this suite makes the same contract
// executable inside SAIL's own CI.

describe('olm arbiter ownership', () => {
  it('ME may write calibration_err', () => {
    const olm = newOLM('s1');
    const r = applyToOlm(olm, 'me', { concept_id: 'confounder', set: { calibration_err: 0.4 } });
    expect(r.applied).toContain('by_concept.confounder.calibration_err');
    expect(olm.by_concept.confounder.calibration_err).toBe(0.4);
  });
  it('ME may NOT write help_seeking (SAIL-owned)', () => {
    const r = applyToOlm(newOLM('s1'), 'me', { concept_id: 'confounder', set: { help_seeking: 'executive' } });
    expect(r.applied).toHaveLength(0);
    expect(r.rejected).toHaveLength(1);
  });
  it('SAIL may write global.deadline_proximity but NOT calibration_err', () => {
    const olm = newOLM('s1');
    expect(applyToOlm(olm, 'sail', { set: { 'global.deadline_proximity': 0.8 } }).applied).toHaveLength(1);
    expect(applyToOlm(olm, 'sail', { concept_id: 'c', set: { calibration_err: 0.1 } }).rejected).toHaveLength(1);
  });
  it('bumps _rev only on applied writes or events', () => {
    const olm = newOLM('s1');
    applyToOlm(olm, 'me', { concept_id: 'c', set: { help_seeking: 'x' } }); // all rejected
    expect(olm._rev).toBe(0);
    applyToOlm(olm, 'me', { concept_id: 'c', set: { jol_trend: 'over' } });
    expect(olm._rev).toBe(1);
  });
  it('blocks prototype pollution', () => {
    const r = applyToOlm(newOLM('s1'), 'me', { concept_id: '__proto__', set: { calibration_err: 1 } });
    expect(r.rejected[0].reason).toMatch(/unsafe/);
    expect(({} as Record<string, unknown>).calibration_err).toBeUndefined();
  });
  it('tags events with their writer', () => {
    const olm = newOLM('s1');
    applyToOlm(olm, 'sail', { events: [{ kind: 'session_end' }] });
    expect(olm.events[0].writer).toBe('sail');
  });
});

describe('betaUpdate', () => {
  it('shifts Beta evidence toward the outcome', () => {
    expect(betaUpdate(undefined, 1)).toEqual({ a: 2, b: 1 });
    expect(betaUpdate({ a: 2, b: 1 }, 0)).toEqual({ a: 2, b: 2 });
  });
});

describe('macroSummaryFrom (micro→macro synergy)', () => {
  it('is silent when no concept is flagged', () => {
    expect(macroSummaryFrom(newOLM('s1'))).toBe('');
    expect(macroSummaryFrom(undefined)).toBe('');
  });
  it('surfaces the worst-calibrated concept for the SAIL mentor', () => {
    const olm = newOLM('s1');
    applyToOlm(olm, 'me', { concept_id: 'collider', set: { calibration_err: 0.5, jol_trend: 'overconfident' } });
    applyToOlm(olm, 'me', { concept_id: 'confounder', set: { calibration_err: 0.35, jol_trend: 'underconfident' } });
    const note = macroSummaryFrom(olm);
    expect(note).toContain('collider');
    expect(note).toContain('overconfident');
  });
});
