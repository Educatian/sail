/**
 * Ambient affect store — a tiny module-level signal so any surface can report the
 * learner's current affect (from the momentary-check focus/contextFit, or a phase
 * change) and the AppShell's <AmbientMood> reflects it. No context provider needed;
 * this is a single faint visual layer, not app state.
 *
 * affect → mood map (per spec):
 *   frustration | confusion        → struggle
 *   boredom                        → calm
 *   flow | positive                → flow
 *   satisfaction / session-end     → harbor
 *   default / forethought / none   → calm
 */
import { useSyncExternalStore } from 'react';
import type { Mood } from '../components/AmbientMood';

export type Affect = 'frustration' | 'confusion' | 'boredom' | 'flow' | 'positive' | 'satisfaction' | null;
export type Phase = 'forethought' | 'performance' | 'reflection';

export function affectToMood(affect: Affect, phase: Phase): Mood {
  if (affect === 'frustration' || affect === 'confusion') return 'struggle';
  if (affect === 'flow' || affect === 'positive') return 'flow';
  if (affect === 'satisfaction') return 'harbor';
  if (affect === 'boredom') return 'calm';
  // no affect signal yet → fall back to the SRL phase
  if (phase === 'reflection') return 'harbor';
  if (phase === 'performance') return 'flow';
  return 'calm';
}

/**
 * Derive an affect bucket from an in-session momentary check (focus 1-5 + context fit).
 * Low focus + poor fit reads as frustration; mid as confusion; high focus reads as flow;
 * very low focus with ok fit reads as boredom (under-challenged).
 */
export function affectFromCheck(focus: number, contextFit: 'good' | 'mixed' | 'poor'): Affect {
  if (focus <= 2 && contextFit === 'poor') return 'frustration';
  if (focus <= 2) return 'boredom';
  if (focus === 3) return 'confusion';
  return 'flow';
}

let current: Mood = 'calm';
const listeners = new Set<() => void>();

export function setAmbientMood(mood: Mood) {
  if (mood === current) return;
  current = mood;
  listeners.forEach((l) => l());
}

/** Reset to the calm baseline (e.g. when leaving a session surface). */
export function resetAmbientMood() {
  setAmbientMood('calm');
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
function snapshot() {
  return current;
}

export function useAmbientMood(): Mood {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}
