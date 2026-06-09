import { describe, it, expect } from 'vitest';
import { decidePolicy as serverDecide } from '../src/policy.js';
import { parseMentor as serverParse } from '../src/mentor.js';
// the deployed (Cloudflare Worker) copies — must stay behaviourally identical
import { decidePolicy as workerDecide } from '../../worker/src/policy';
import { parseMentor as workerParse } from '../../worker/src/mentor';
import { mkSession, mkLearner, mkMsg, assistantHints } from './_fixtures.js';

// SAIL ships the same pure brain twice (server/ for local + worker/ for prod).
// They are hand-kept-in-sync, which silently rots. This guard turns "the two
// deployments must agree" into an executable invariant: feed both the same
// battery of states and assert byte-identical decisions.

const policyBattery = [
  { name: 'abstain', s: mkSession(), l: mkLearner(), m: [] },
  { name: 'escalate', s: mkSession(), l: mkLearner({ scaffold: { level: 'high', reason: 'x' } }), m: assistantHints(3, 2) },
  { name: 'fade', s: mkSession({ goals: [{ id: 'g', text: 'a', isTicked: true, createdAt: '' }] }), l: mkLearner({ scaffold: { level: 'low', reason: 'x' } }), m: [] },
  { name: 'executive', s: mkSession(), l: mkLearner(), m: [mkMsg({ role: 'user', content: 'just tell me the answer' })] },
  { name: 'deep-hints', s: mkSession(), l: mkLearner(), m: assistantHints(2, 2) },
  { name: 'noplan', s: mkSession({ strategies: [] }), l: mkLearner(), m: [] },
  { name: 'reflection', s: mkSession({ actualMinutes: 40 }), l: mkLearner(), m: [] },
  { name: 'context-risk', s: mkSession({ contextTrace: { placeCategory: 'work_social', rawLocationStored: false } }), l: mkLearner(), m: [] },
  { name: 'calibration', s: mkSession({ confidencePre: 95 }), l: mkLearner({ calibration: { recentError: 30, improving: false, samples: 3 } }), m: [] },
  { name: 'scaffold-high', s: mkSession(), l: mkLearner({ scaffold: { level: 'high', reason: 'still low' } }), m: [] },
];

describe('parity: server/ policy === worker/ policy', () => {
  for (const c of policyBattery) {
    it(`agrees on "${c.name}"`, () => {
      const a = serverDecide(c.s, c.l, c.m);
      const b = workerDecide(c.s as never, c.l as never, c.m as never);
      expect(b).toEqual(a);
    });
  }
});

const mentorBattery = [
  '[[LABEL:HINT_L2]][[STATE:confused]]Try isolating x first.',
  'Plain Socratic nudge with no tags.',
  'Check time.\n```check\n{"prompt":"Which rule?","options":["Chain","Product"]}\n```',
  '[[LABEL:FINISH]]Nice work — you got there yourself.',
];

describe('parity: server/ mentor === worker/ mentor', () => {
  for (const raw of mentorBattery) {
    it(`parses identically: ${raw.slice(0, 24)}…`, () => {
      expect(workerParse(raw)).toEqual(serverParse(raw));
    });
  }
});
