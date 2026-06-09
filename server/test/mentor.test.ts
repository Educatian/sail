import { describe, it, expect } from 'vitest';
import { parseMentor, hintLevelSoFar, toLlmMessages } from '../src/mentor.js';
import { mkMsg } from './_fixtures.js';

describe('parseMentor — control-tag protocol', () => {
  it('extracts label, hint level, learner state, and strips them from display text', () => {
    const raw = '[[LABEL:HINT_L2]][[STATE:confused]]Try isolating x first. What cancels?';
    const p = parseMentor(raw);
    expect(p.label).toBe('HINT_L2');
    expect(p.hintLevel).toBe(2);
    expect(p.state).toBe('confused');
    expect(p.displayText).toBe('Try isolating x first. What cancels?');
    expect(p.displayText).not.toMatch(/\[\[/);
  });

  it('parses a fenced check block into a checkpoint and removes it from display', () => {
    const raw = 'Quick check.\n```check\n{"prompt":"Which rule applies?","options":["Chain","Product"]}\n```';
    const p = parseMentor(raw);
    expect(p.checkpoint?.prompt).toBe('Which rule applies?');
    expect(p.checkpoint?.options.map((o) => o.text)).toEqual(['Chain', 'Product']);
    expect(p.checkpoint?.options[0].id).toBe('o0');
    expect(p.displayText).not.toMatch(/```/);
  });

  it('ignores a malformed/streaming check block without throwing', () => {
    const p = parseMentor('thinking…\n```check\n{"prompt": "half');
    expect(p.checkpoint).toBeUndefined();
  });

  it('plain text yields no label and hint level 0', () => {
    const p = parseMentor('What have you tried so far?');
    expect(p.label).toBeUndefined();
    expect(p.hintLevel).toBe(0);
    expect(p.displayText).toBe('What have you tried so far?');
  });
});

describe('hintLevelSoFar', () => {
  it('returns the deepest hint reached this session', () => {
    expect(hintLevelSoFar([
      mkMsg({ role: 'assistant', hintLevel: 1 }),
      mkMsg({ role: 'assistant', hintLevel: 3 }),
      mkMsg({ role: 'assistant', hintLevel: 2 }),
    ])).toBe(3);
  });
  it('is 0 when no hints were given', () => {
    expect(hintLevelSoFar([mkMsg({ role: 'user', content: 'hi' })])).toBe(0);
  });
});

describe('toLlmMessages', () => {
  it('drops system turns and strips control tags from assistant turns', () => {
    const out = toLlmMessages([
      mkMsg({ role: 'system', content: 'policy' }),
      mkMsg({ role: 'user', content: 'help' }),
      mkMsg({ role: 'assistant', content: '[[LABEL:SOCRATIC]]What is the goal?' }),
    ]);
    expect(out).toHaveLength(2);
    expect(out.find((m) => m.role === 'assistant')?.content).toBe('What is the goal?');
    expect(out.some((m) => (m as { role: string }).role === 'system')).toBe(false);
  });
});
