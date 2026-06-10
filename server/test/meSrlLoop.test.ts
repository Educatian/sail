import { describe, it, expect } from 'vitest';
import { newOLM, applyToOlm, meSignalsFrom, srlContextFrom } from '../src/olmCore.js';
import { meControlRule, buildMePlanningContext, type MeSignal } from '../src/marin.js';

// Bidirectional ME<->SRL loop (research/ME_SRL_LOOP_EVIDENCE.md). These assertions pin the central
// novelty: (B) ME calibration/confusion -> deterministic SRL planning control rule, and (A) SRL
// goal/plan/phase -> ME contextual render. Mirrors run in worker/ via the parity byte-identical guard.

describe('SRL-owned OLM fields (loop substrate)', () => {
  it('SAIL may write active_goal / active_plan / phase', () => {
    const olm = newOLM('s1');
    const r = applyToOlm(olm, 'sail', { set: { 'global.active_goal': { distal: 'master backdoor' }, 'global.active_plan': { subject: 'causal inference' }, 'global.phase': 'performance' } });
    expect(r.applied).toEqual(expect.arrayContaining(['global.active_goal', 'global.active_plan', 'global.phase']));
    expect((olm.global.active_plan as { subject: string }).subject).toBe('causal inference');
  });
  it('ME may NOT write SRL-owned phase (single-writer guard holds)', () => {
    const r = applyToOlm(newOLM('s1'), 'me', { set: { 'global.phase': 'forethought' } });
    expect(r.applied).toHaveLength(0);
    expect(r.rejected).toHaveLength(1);
  });
});

describe('Direction B: meSignalsFrom + meControlRule (ES-LLMs deterministic rule)', () => {
  const olmWith = () => {
    const olm = newOLM('s1');
    applyToOlm(olm, 'me', { concept_id: 'confounder', set: { calibration_err: 0.42, jol_trend: 'overconfident' } });
    applyToOlm(olm, 'me', { concept_id: 'collider', set: { calibration_err: 0.31, jol_trend: 'unknown', confusion_label: 'impasse' } });
    applyToOlm(olm, 'me', { concept_id: 'backdoor', set: { calibration_err: 0.1, jol_trend: 'calibrated', voi: { comp: { a: 1, b: 6 }, t: Date.now() - 10 * 86_400_000 } } });
    return olm;
  };

  it('extracts over_confident / confusion / low+stale competence signals', () => {
    const sigs = meSignalsFrom(olmWith());
    const conf = sigs.find((s) => s.concept_id === 'confounder')!;
    const coll = sigs.find((s) => s.concept_id === 'collider')!;
    const back = sigs.find((s) => s.concept_id === 'backdoor')!;
    expect(conf.over_confident).toBe(true);
    expect(coll.confusion).toBe(true);
    expect(back.competence).toBeLessThan(0.5);
    expect(back.staleDays).toBeGreaterThanOrEqual(3);
  });

  it('CONTROL RULE: over_confident(c) ⇒ self-check on c in the plan', () => {
    const items = meControlRule(meSignalsFrom(olmWith()));
    const conf = items.find((i) => i.concept_id === 'confounder');
    expect(conf).toBeDefined();
    expect(conf!.action).toBe('self_check');
  });

  it('CONTROL RULE: confusion(c) high ⇒ review block before new material', () => {
    const items = meControlRule(meSignalsFrom(olmWith()));
    const coll = items.find((i) => i.concept_id === 'collider');
    expect(coll!.action).toBe('review_block');
  });

  it('CONTROL RULE: low competence + stale ⇒ surface in plan', () => {
    const items = meControlRule(meSignalsFrom(olmWith()));
    const back = items.find((i) => i.concept_id === 'backdoor');
    expect(back!.action).toBe('surface');
  });

  it('prioritizes self_check/review_block above surface and caps the list', () => {
    const items = meControlRule(meSignalsFrom(olmWith()), { limit: 2 });
    expect(items).toHaveLength(2);
    expect(items.map((i) => i.action)).not.toContain('surface'); // bumped out by higher-priority actions
  });

  it('is empty when nothing is flagged (no signal → no injection)', () => {
    expect(meControlRule(meSignalsFrom(newOLM('s1')))).toEqual([]);
  });

  it('rendered planning context is warm + jargon-free (no metric words leak to the student)', () => {
    const sigs: MeSignal[] = meSignalsFrom(olmWith());
    const ctx = buildMePlanningContext(meControlRule(sigs));
    expect(ctx).toContain('self-check');
    expect(ctx).toMatch(/PLAIN, CARING language/);
    // the instruction itself forbids the words; the per-item reasons must not contain them
    const reasonLines = ctx.split('\n').filter((l) => l.startsWith('- '));
    for (const l of reasonLines) {
      expect(l.toLowerCase()).not.toMatch(/calibration|overconfident|confusion score|competence/);
    }
  });
});

describe('Direction A: srlContextFrom (SRL state -> ME render context)', () => {
  it('returns null when no SRL state present (feature-detect → P0 behavior)', () => {
    expect(srlContextFrom(newOLM('s1'))).toBeNull();
    expect(srlContextFrom(undefined)).toBeNull();
  });
  it('builds goal/subject/phase context once SAIL has written a plan', () => {
    const olm = newOLM('s1');
    applyToOlm(olm, 'sail', { set: { 'global.active_goal': { distal: 'ace the midterm' }, 'global.active_plan': { subject: 'causal inference', strategy: 'retrieval_practice', minutes: 25, concepts: ['confounder'] }, 'global.phase': 'performance' } });
    const ctx = srlContextFrom(olm)!;
    expect(ctx.goal).toBe('ace the midterm');
    expect(ctx.subject).toBe('causal inference');
    expect(ctx.phase).toBe('performance');
    expect(ctx.focusConcepts).toContain('confounder');
  });
});
