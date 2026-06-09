import type { StudySession, ChatMessage } from '../src/domain.js';
import type { LearnerModel } from '../src/learner.js';

/** Minimal valid StudySession; override only the signal under test. */
export function mkSession(o: Partial<StudySession> = {}): StudySession {
  return {
    id: 's1', studentId: 'u1', subject: 'Calculus', taskKind: 'coursework',
    date: '2026-06-04', condition: 'metacog', scaffoldStyle: 'problematizing',
    scaffoldTiming: 'responsive',
    goals: [
      { id: 'g1', text: 'goal one', isTicked: true, createdAt: '' },
      { id: 'g2', text: 'goal two', isTicked: false, createdAt: '' },
    ],
    strategies: [{ id: 'st1', kind: 'retrieval_practice' }],
    plannedMinutes: 30, timerSegments: [], actualMinutes: 5,
    inProgress: true, completed: false, createdAt: '', updatedAt: '',
    ...o,
  };
}

export function mkLearner(o: Partial<LearnerModel> = {}): LearnerModel {
  return {
    sessionsCount: 3, completedCount: 2, recentReflections: [], carry: null,
    scaffold: { level: 'medium', reason: 'steady — moderate scaffolding' },
    hintTrend: { early: 1, recent: 1, decreasing: false, samples: 2 },
    strategyEfficacy: [], spacing: [],
    calibration: { recentError: null, improving: false, samples: 0 },
    baselineSRL: null, recentCorrections: [], contextPatterns: [], taskMix: [],
    ...o,
  };
}

export function mkMsg(o: Partial<ChatMessage> = {}): ChatMessage {
  return { id: 'm', sessionId: 's1', role: 'user', content: '', createdAt: '', ...o };
}

/** N assistant turns at a given hint level. */
export function assistantHints(n: number, hintLevel: number): ChatMessage[] {
  return Array.from({ length: n }, (_, i) => mkMsg({ id: `a${i}`, role: 'assistant', hintLevel }));
}
