import { describe, it, expect } from 'vitest';
import { newOLM, applyToOlm, betaUpdate, macroSummaryFrom, sourceBindingFor } from '../src/olmCore.js';

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

// Item 1 — two-channel JOL SOURCE guardrail (Cash 2025 contamination made structural). The in-bot felt
// (experiential) channel must be STRUCTURALLY UNABLE to write the measurement_* DV fields, and vice versa.
describe('olm source guardrail (two-channel JOL; Item 1)', () => {
  it('binds measurement_* → out_of_bot and experiential_calibration → in_bot_felt', () => {
    expect(sourceBindingFor('by_concept.c.measurement_jol')).toBe('out_of_bot');
    expect(sourceBindingFor('by_concept.c.measurement_calibration')).toBe('out_of_bot');
    expect(sourceBindingFor('by_concept.c.experiential_calibration')).toBe('in_bot_felt');
    expect(sourceBindingFor('by_concept.c.affect')).toBe('emoji_ema');
    expect(sourceBindingFor('by_concept.c.calibration_err')).toBeNull(); // unbound = back-compat
  });
  it('in_bot_felt CANNOT write the measurement_* DV (rejected like a cross-write)', () => {
    const olm = newOLM('s1');
    const r = applyToOlm(olm, 'me', { concept_id: 'c', source: 'in_bot_felt', set: { measurement_calibration: 0.3 } });
    expect(r.applied).toHaveLength(0);
    expect(r.rejected[0].reason).toMatch(/out_of_bot/);
    expect(olm.by_concept.c?.measurement_calibration).toBeUndefined();
  });
  it('out_of_bot writes the DV; in_bot_felt writes the experiential adaptation field', () => {
    const olm = newOLM('s1');
    expect(applyToOlm(olm, 'me', { concept_id: 'c', source: 'out_of_bot', set: { measurement_calibration: 0.3 } }).applied).toHaveLength(1);
    expect(applyToOlm(olm, 'me', { concept_id: 'c', source: 'in_bot_felt', set: { experiential_calibration: 0.4 } }).applied).toHaveLength(1);
    expect(olm.by_concept.c.measurement_calibration).toBe(0.3);
    expect(olm.by_concept.c.experiential_calibration).toBe(0.4);
  });
  it('out_of_bot CANNOT pollute the experiential adaptation field (channels never merge)', () => {
    const r = applyToOlm(newOLM('s1'), 'me', { concept_id: 'c', source: 'out_of_bot', set: { experiential_calibration: 0.4 } });
    expect(r.applied).toHaveLength(0);
    expect(r.rejected).toHaveLength(1);
  });
  it('Item 2: affect is gated to emoji_ema (never a calibration source) and is NOT calibration', () => {
    const olm = newOLM('s1');
    expect(applyToOlm(olm, 'me', { concept_id: 'c', source: 'emoji_ema', set: { affect: { emotion: 'frustration' } } }).applied).toHaveLength(1);
    expect(applyToOlm(olm, 'me', { concept_id: 'c', source: 'in_bot_felt', set: { affect: { emotion: 'x' } } }).rejected[0].reason).toMatch(/emoji_ema/);
  });
  it('unbound calibration_err/jol_trend still write with no source (back-compat)', () => {
    const olm = newOLM('s1');
    expect(applyToOlm(olm, 'me', { concept_id: 'c', set: { calibration_err: 0.5, jol_trend: 'overconfident' } }).applied).toHaveLength(2);
  });
  it('tags appended events with the diff source provenance', () => {
    const olm = newOLM('s1');
    applyToOlm(olm, 'me', { source: 'emoji_ema', events: [{ kind: 'affect' }] });
    expect(olm.events[0].source).toBe('emoji_ema');
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
