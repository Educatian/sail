import { describe, it, expect } from 'vitest';
import { traceMessage, selectMove, stretchSteering } from '../src/meEngine.js';

// Mirrors the canonical engine assertions from sail-me/test.mjs so the TS port
// cannot silently diverge from the reference engine's behaviour.

describe('meEngine tracer', () => {
  it('classifies executive help-seeking', () => {
    const t = traceMessage('just tell me the answer');
    expect(t.help_seeking).toBe('executive');
  });
  it('classifies instrumental help-seeking without inflating confusion', () => {
    const t = traceMessage('why does the backdoor path matter?');
    expect(t.help_seeking).toBe('instrumental');
    expect(t.confusion).toBeLessThan(0.5); // playtest finding: "why does" is curiosity, not confusion
  });
  it('detects high confusion', () => {
    expect(traceMessage('I am stuck, this makes no sense').confusion).toBeGreaterThanOrEqual(0.7);
  });
  it('detects overconfidence', () => {
    expect(traceMessage('obviously this one is easy').confidence_signal).toBe('over');
  });
  it('detects calibrated specificity', () => {
    expect(traceMessage('I understand the setup but I am stuck on the collider part').confidence_signal).toBe('calibrated');
  });
  it('detects explicit help requests', () => {
    expect(traceMessage('can you walk me through it?').help_request).toBe(true);
  });
});

describe('meEngine policy (dialogue phase)', () => {
  it('executive help-seeking → OFFER_HINT (honest scaffold, never the answer)', () => {
    expect(selectMove(traceMessage('just tell me the answer'), { phase: 'dialogue' }).move).toBe('OFFER_HINT');
  });
  it('explicit help request → OFFER_HINT', () => {
    expect(selectMove(traceMessage('please explain, I dont get it'), { phase: 'dialogue' }).move).toBe('OFFER_HINT');
  });
  it('high confusion → PROBE_CONFUSION', () => {
    expect(selectMove({ confusion: 0.8, help_seeking: 'none' }, { phase: 'dialogue' }).move).toBe('PROBE_CONFUSION');
  });
  it('overconfidence → ELICIT_FOC', () => {
    expect(selectMove({ confusion: 0.15, help_seeking: 'none', confidence_signal: 'over' }, { phase: 'dialogue' }).move).toBe('ELICIT_FOC');
  });
  it('well-regulated learner → ABSTAIN (first-class, MetaCLASS correction)', () => {
    const d = selectMove({ confusion: 0.15, help_seeking: 'instrumental', confidence_signal: 'calibrated' }, { phase: 'dialogue' });
    expect(d.move).toBe('ABSTAIN');
  });
  it('neutral message → ELICIT_FOK floor (never silently ignore a learner who spoke)', () => {
    expect(selectMove(traceMessage('ok'), { phase: 'dialogue' }).move).toBe('ELICIT_FOK');
  });
  it('abstains when V < lambda', () => {
    const d = selectMove(traceMessage('ok'), { phase: 'dialogue' }, 0.99);
    expect(d.move).toBe('ABSTAIN');
    expect(d.V).toBeLessThan(0.99);
  });
});

describe('meEngine policy (post_answer phase)', () => {
  it('correct + confident → ELICIT_FOS', () => {
    expect(selectMove({}, { phase: 'post_answer', correct: 1, confidence: 85 }).move).toBe('ELICIT_FOS');
  });
  it('wrong + confident → PROBE_CONFUSION (calibration moment)', () => {
    expect(selectMove({}, { phase: 'post_answer', correct: 0, confidence: 85 }).move).toBe('PROBE_CONFUSION');
  });
  it('correct + unsure → ELICIT_FOK', () => {
    expect(selectMove({}, { phase: 'post_answer', correct: 1, confidence: 40 }).move).toBe('ELICIT_FOK');
  });
});

describe('stretchSteering', () => {
  it('opens with a pre-probe ELICIT_FOK when there is no learner message yet', () => {
    const s = stretchSteering([]);
    expect(s.decision.move).toBe('ELICIT_FOK');
    expect(s.directive).toContain('phase="pre"');
    expect(s.tracer).toBeNull();
  });
  it('steers from the LAST user message', () => {
    const s = stretchSteering([
      { role: 'user', content: 'obviously easy' },
      { role: 'assistant', content: 'How confident are you?' },
      { role: 'user', content: 'just tell me the answer' },
    ]);
    expect(s.decision.move).toBe('OFFER_HINT');
  });
  it('every non-abstain directive constrains the LLM to one move', () => {
    const s = stretchSteering([{ role: 'user', content: 'I am stuck, no idea' }]);
    expect(s.directive).toContain('CHOSEN MOVE');
  });
});
