import { describe, it, expect } from 'vitest';
import { decidePolicy, policyInstruction } from '../src/policy.js';
import { mkSession, mkLearner, mkMsg, assistantHints } from './_fixtures.js';

// The policy engine is the adaptive-scaffolding brain: learner-model + session
// signals -> one bounded pedagogical action. These tests lock each branch and
// the first-match priority order (research-critical: conditions must be stable).

describe('decidePolicy — branch coverage & priority', () => {
  it('abstains when no regulation breakdown is detected', () => {
    const d = decidePolicy(mkSession(), mkLearner(), []);
    expect(d.action).toBe('abstain');
    expect(d.intensity).toBe('none');
  });

  it('escalates on repeated deep hints at high scaffold need (top priority)', () => {
    const d = decidePolicy(
      mkSession(),
      mkLearner({ scaffold: { level: 'high', reason: 'x' } }),
      assistantHints(3, 2),
    );
    expect(d.action).toBe('escalate');
    expect(d.intensity).toBe('high');
  });

  it('fades support when scaffold is low and goals are mostly met', () => {
    const session = mkSession({ goals: [
      { id: 'g1', text: 'a', isTicked: true, createdAt: '' },
      { id: 'g2', text: 'b', isTicked: true, createdAt: '' },
    ] });
    const d = decidePolicy(session, mkLearner({ scaffold: { level: 'low', reason: 'x' } }), []);
    expect(d.action).toBe('fade');
  });

  it('prompts control on executive help-seeking ("just tell me the answer")', () => {
    const d = decidePolicy(mkSession(), mkLearner(), [
      mkMsg({ role: 'user', content: 'can you just tell me the answer to #3?' }),
    ]);
    expect(d.action).toBe('prompt_control');
    expect(d.reason).toMatch(/executive/);
  });

  it('does NOT treat executive help-seeking as control if learner asserted independence', () => {
    const d = decidePolicy(
      mkSession(),
      mkLearner({ recentCorrections: ['I was not avoiding, I was trying myself'] }),
      [mkMsg({ role: 'user', content: 'just tell me the answer' })],
    );
    expect(d.action).not.toBe('prompt_control');
  });

  it('prompts control on repeated deep hints (>=2) below escalation', () => {
    const d = decidePolicy(mkSession(), mkLearner(), assistantHints(2, 2));
    expect(d.action).toBe('prompt_control');
    expect(d.reason).toMatch(/deep hints/);
  });

  it('prompts monitoring + targets forethought when the plan is missing', () => {
    const d = decidePolicy(mkSession({ strategies: [] }), mkLearner(), []);
    expect(d.action).toBe('prompt_monitoring');
    expect(d.phaseTarget).toBe('forethought');
  });

  it('prompts reflection once the session is over time / completed', () => {
    const d = decidePolicy(mkSession({ actualMinutes: 31 }), mkLearner(), []);
    expect(d.action).toBe('prompt_reflection');
    expect(d.phaseTarget).toBe('reflection');
  });

  it('prompts control when environment is flagged poor but left unregulated', () => {
    const session = mkSession({ momentaryChecks: [
      { at: '', elapsedOnTaskMin: 10, trigger: 'manual', focus: 2, contextFit: 'poor', regulationAction: 'stayed' },
    ] });
    const d = decidePolicy(session, mkLearner(), []);
    expect(d.action).toBe('prompt_control');
    expect(d.reason).toMatch(/unregulated/);
  });

  it('prompts low-intensity monitoring on risky context (transit)', () => {
    const d = decidePolicy(
      mkSession({ contextTrace: { placeCategory: 'transit', rawLocationStored: false } }),
      mkLearner(), [],
    );
    expect(d.action).toBe('prompt_monitoring');
    expect(d.intensity).toBe('low');
  });

  it('prompts monitoring on a large calibration gap (JOL miscalibration)', () => {
    const d = decidePolicy(
      mkSession({ confidencePre: 95 }),
      mkLearner({ calibration: { recentError: 30, improving: false, samples: 3 } }),
      [],
    );
    expect(d.action).toBe('prompt_monitoring');
    expect(d.reason).toMatch(/calibration/);
  });

  it('defaults to monitoring when scaffold need stays high', () => {
    const d = decidePolicy(mkSession(), mkLearner({ scaffold: { level: 'high', reason: 'still low' } }), []);
    expect(d.action).toBe('prompt_monitoring');
  });

  it('every decision carries a phaseTarget, bounded intensity, and a confidence', () => {
    const d = decidePolicy(mkSession(), mkLearner(), []);
    expect(['forethought', 'performance', 'reflection']).toContain(d.phaseTarget);
    expect(['none', 'low', 'medium', 'high']).toContain(d.intensity);
    expect(d.confidence).toBeGreaterThan(0);
    expect(d.confidence).toBeLessThanOrEqual(1);
  });
});

describe('policyInstruction — agency guardrail', () => {
  it('forbids the LLM from independently choosing a stronger intervention', () => {
    const text = policyInstruction(decidePolicy(mkSession(), mkLearner(), []));
    expect(text).toMatch(/must not independently choose a stronger intervention/);
  });
});
