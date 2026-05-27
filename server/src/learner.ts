import { listSessions, getMessages, getProfile } from './db.js';
import type { StrategyKind } from './domain.js';

// The Learner Model powers the closed/fading/adaptive SRL cycle:
//  - carry-forward (close the loop): last adjustment, unmet goals, strategy that worked
//  - scaffolding fading: scaffold level from competence signals
//  - learner memory: recent reflections injected into the mentor
//  - spacing: per-subject review nudges
//  - growth: hint-depth trend (independence)

export interface ReflectionSnap {
  subject: string;
  date: string;
  adjustment?: string;
  notes?: string;
  usefulStrategy?: StrategyKind;
  focus?: number;
  progress?: number;
  satisfaction?: number;
}

export interface LearnerModel {
  sessionsCount: number;
  completedCount: number;
  recentReflections: ReflectionSnap[];
  carry: { lastSubject?: string; lastAdjustment?: string; unmetGoals: string[]; suggestedStrategies: StrategyKind[] } | null;
  scaffold: { level: 'high' | 'medium' | 'low'; reason: string };
  hintTrend: { early: number; recent: number; decreasing: boolean; samples: number };
  strategyEfficacy: { kind: StrategyKind; avgProgress: number; n: number }[];
  spacing: { subject: string; daysSince: number }[];
  calibration: { recentError: number | null; improving: boolean; samples: number };
  baselineSRL: number | null;
  recentCorrections: string[];
  contextPatterns: { placeCategory: string; avgProgress: number; n: number }[];
  taskMix: { taskKind: string; n: number }[];
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

function sessionHintAvg(id: string): number {
  const hs = getMessages(id).filter((m) => m.role === 'assistant').map((m) => m.hintLevel ?? 0);
  return avg(hs);
}

export function buildLearnerModel(studentId: string): LearnerModel {
  const sessions = listSessions(studentId); // newest first
  const completed = sessions.filter((s) => s.completed);

  const recentReflections: ReflectionSnap[] = completed.slice(0, 3).map((s) => ({
    subject: s.subject, date: s.date, adjustment: s.adjustment, notes: s.notes,
    usefulStrategy: s.usefulStrategy, focus: s.focus, progress: s.progress, satisfaction: s.satisfaction,
  }));

  const lastAny = sessions[0];
  const unmetGoals = lastAny ? lastAny.goals.filter((g) => !g.isTicked).map((g) => g.text) : [];
  const lastCompleted = completed[0];
  const carry = lastCompleted
    ? {
        lastSubject: lastCompleted.subject,
        lastAdjustment: lastCompleted.adjustment,
        unmetGoals,
        suggestedStrategies: (lastCompleted.usefulStrategy ? [lastCompleted.usefulStrategy] : lastCompleted.strategies.map((x) => x.kind)).slice(0, 3),
      }
    : null;

  // hint-depth trend over time (independence): split completed sessions chronologically
  const chrono = completed.slice().reverse(); // oldest first
  const half = Math.max(1, Math.floor(chrono.length / 2));
  const earlyAvg = round1(avg(chrono.slice(0, half).map((s) => sessionHintAvg(s.id))));
  const recentAvg = round1(avg(chrono.slice(half).map((s) => sessionHintAvg(s.id))));
  const hintTrend = { early: earlyAvg, recent: recentAvg, decreasing: chrono.length >= 2 && recentAvg < earlyAvg, samples: chrono.length };

  // strategy efficacy: avg session progress grouped by chosen strategy
  const byStrat: Record<string, number[]> = {};
  for (const s of completed) for (const st of s.strategies) if (typeof s.progress === 'number') (byStrat[st.kind] ??= []).push(s.progress);
  const strategyEfficacy = Object.entries(byStrat)
    .map(([kind, arr]) => ({ kind: kind as StrategyKind, avgProgress: round1(avg(arr)), n: arr.length }))
    .sort((a, b) => b.avgProgress - a.avgProgress);

  // scaffolding fading: derive scaffold level from competence signals
  const recentProg = avg(completed.slice(0, 3).map((s) => s.progress ?? 0));
  let level: 'high' | 'medium' | 'low' = 'medium';
  let reason = 'building a baseline';
  if (completed.length < 2 || recentProg < 3) { level = 'high'; reason = 'early sessions / progress still low — scaffold actively'; }
  else if (completed.length >= 4 && hintTrend.decreasing && recentProg >= 4) { level = 'low'; reason = 'independence rising (hints down, progress high) — fade scaffolding'; }
  else { level = 'medium'; reason = 'steady — moderate scaffolding'; }

  // spacing: newest completed session per subject, suggest review if >= 2 days
  const seen = new Set<string>();
  const spacing: { subject: string; daysSince: number }[] = [];
  for (const s of completed) {
    if (seen.has(s.subject)) continue;
    seen.add(s.subject);
    const days = Math.floor((Date.now() - new Date(s.updatedAt).getTime()) / 86400000);
    if (days >= 2) spacing.push({ subject: s.subject, daysSince: days });
  }

  // calibration: |confidencePre - performanceActual| (JOL accuracy), newest first
  const calErr = (s: { confidencePre?: number; performanceActual?: number }) => Math.abs((s.confidencePre as number) - (s.performanceActual as number));
  const cal = completed.filter((s) => typeof s.confidencePre === 'number' && typeof s.performanceActual === 'number');
  const calHalf = Math.max(1, Math.floor(cal.length / 2));
  const recentError = cal.length ? round1(avg(cal.slice(0, calHalf).map(calErr))) : null;
  const olderError = cal.length > 1 ? avg(cal.slice(calHalf).map(calErr)) : null;
  const improving = recentError != null && olderError != null && recentError < olderError;
  const profile = getProfile(studentId);
  const recentCorrections = completed.map((s) => s.learnerModelCorrection).filter((x): x is string => !!x?.trim()).slice(0, 3);
  const byPlace: Record<string, number[]> = {};
  for (const s of completed) {
    const place = s.contextTrace?.placeCategory;
    if (place && place !== 'not_shared' && typeof s.progress === 'number') (byPlace[place] ??= []).push(s.progress);
  }
  const contextPatterns = Object.entries(byPlace)
    .map(([placeCategory, arr]) => ({ placeCategory, avgProgress: round1(avg(arr)), n: arr.length }))
    .sort((a, b) => b.avgProgress - a.avgProgress);
  const taskMap: Record<string, number> = {};
  for (const s of sessions) taskMap[s.taskKind ?? 'coursework'] = (taskMap[s.taskKind ?? 'coursework'] ?? 0) + 1;
  const taskMix = Object.entries(taskMap).map(([taskKind, n]) => ({ taskKind, n })).sort((a, b) => b.n - a.n);

  return {
    sessionsCount: sessions.length,
    completedCount: completed.length,
    recentReflections,
    carry,
    scaffold: { level, reason },
    hintTrend,
    strategyEfficacy,
    spacing: spacing.slice(0, 3),
    calibration: { recentError, improving, samples: cal.length },
    baselineSRL: profile?.baselineSRL ?? null,
    recentCorrections,
    contextPatterns,
    taskMix,
  };
}
