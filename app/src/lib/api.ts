import type { StudySession, ChatMessage, Condition, StrategyKind, Checkpoint, MentorLabel, ScaffoldStyle, ScaffoldTiming, Profile, TaskKind, MetricEventType } from '../domain';

// In the browser dev server, '' lets Vite proxy /api -> :3001.
// In a bundled mobile (Capacitor) build, set VITE_API_BASE to the hosted/LAN server, e.g. http://192.168.0.10:3001
export const API_BASE = import.meta.env.VITE_API_BASE ?? '';
export const apiUrl = (path: string) => `${API_BASE}${path}`;

const j = async (r: Response) => {
  if (!r.ok) {
    let msg = `${r.status}`;
    try { const e = await r.json(); if (e?.error) msg = e.error; } catch { /* keep status */ }
    throw new Error(msg);
  }
  return r.json();
};
const JSON_H = { 'Content-Type': 'application/json' };

// --- current student (lightweight email+passcode auth; studentId = normalized email) ---
const SKEY = 'sail-student';
export const getStudent = (): string => { try { return localStorage.getItem(SKEY) ?? ''; } catch { return ''; } };
export const setStudent = (sid: string) => { try { localStorage.setItem(SKEY, sid); } catch { /* ignore */ } };
export const clearStudent = () => { try { localStorage.removeItem(SKEY); } catch { /* ignore */ } };
export const studentQuery = () => (getStudent() ? `?studentId=${encodeURIComponent(getStudent())}` : '');
const withSid = <T extends object>(body: T) => ({ ...body, studentId: getStudent() || undefined });

export const api = {
  track(type: MetricEventType, payload: Record<string, unknown> = {}, sessionId?: string, condition?: Condition): Promise<{ ok: boolean }> {
    return fetch(apiUrl('/api/events'), {
      method: 'POST',
      headers: JSON_H,
      body: JSON.stringify(withSid({
        type,
        payload,
        sessionId,
        condition,
        route: typeof location !== 'undefined' ? location.pathname : undefined,
        clientAt: new Date().toISOString(),
      })),
      keepalive: true,
    }).then(j).catch(() => ({ ok: false }));
  },
  auth(email: string, passcode: string): Promise<{ studentId: string; returning: boolean }> {
    return fetch(apiUrl('/api/auth'), { method: 'POST', headers: JSON_H, body: JSON.stringify({ email, passcode }) }).then(j);
  },
  createSession(body: {
    subject: string;
    taskKind?: TaskKind;
    condition?: Condition;
    scaffoldStyle?: ScaffoldStyle;
    scaffoldTiming?: ScaffoldTiming;
    goals?: string[];
    strategies?: StrategyKind[];
    plannedMinutes?: number;
    confidencePre?: number;
    contextTrace?: StudySession['contextTrace'];
    spatialTrace?: StudySession['spatialTrace'];
  }): Promise<StudySession> {
    return fetch(apiUrl('/api/sessions'), { method: 'POST', headers: JSON_H, body: JSON.stringify(withSid(body)) }).then(j);
  },
  getSession: (id: string): Promise<StudySession> => fetch(apiUrl(`/api/sessions/${id}`)).then(j),
  listSessions: (): Promise<StudySession[]> => fetch(apiUrl('/api/sessions' + studentQuery())).then(j),
  patchSession: (id: string, patch: Partial<StudySession>): Promise<StudySession> =>
    fetch(apiUrl(`/api/sessions/${id}`), { method: 'PATCH', headers: JSON_H, body: JSON.stringify(withSid(patch)) }).then(j),
  deleteSession: (id: string): Promise<{ ok: boolean }> => fetch(apiUrl(`/api/sessions/${id}`), { method: 'DELETE' }).then(j),
  getMessages: (id: string): Promise<ChatMessage[]> => fetch(apiUrl(`/api/sessions/${id}/messages`)).then(j),
  getStats: (): Promise<Stats> => fetch(apiUrl('/api/stats' + studentQuery())).then(j),
  getLearner: (): Promise<LearnerModel> => fetch(apiUrl('/api/learner' + studentQuery())).then(j),
  getProfile: (): Promise<Profile | null> => fetch(apiUrl('/api/profile' + studentQuery())).then(j),
  putProfile: (items: number[]): Promise<Profile> =>
    fetch(apiUrl('/api/profile'), { method: 'PUT', headers: JSON_H, body: JSON.stringify(withSid({ items })) }).then(j),
  setReminders: (remindersOn: boolean): Promise<Profile> =>
    fetch(apiUrl('/api/profile'), { method: 'PUT', headers: JSON_H, body: JSON.stringify(withSid({ remindersOn })) }).then(j),
  testReminder: (): Promise<{ to: string; sent: boolean; preview: string }> =>
    fetch(apiUrl('/api/reminders/test'), { method: 'POST', headers: JSON_H, body: JSON.stringify(withSid({})) }).then(j),
  putMaterials: (subject: string, text: string): Promise<{ subject: string; count: number }> =>
    fetch(apiUrl('/api/materials'), { method: 'POST', headers: JSON_H, body: JSON.stringify(withSid({ subject, text })) }).then(j),
};

export interface LearnerModel {
  sessionsCount: number;
  completedCount: number;
  recentReflections: { subject: string; date: string; adjustment?: string; notes?: string; usefulStrategy?: StrategyKind; focus?: number; progress?: number; satisfaction?: number }[];
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

export interface Stats {
  gamification: { streakDays: number; longestStreak: number; xp: number; level: number };
  eventCounts: Record<string, number>;
  stateCounts: Record<string, number>;
  policyCounts: Record<string, number>;
  contextCounts: Record<string, number>;
  spatialCounts: Record<string, number>;
  helpSeekingCounts: Record<string, number>;
  fidelityCounts: Record<string, number>;
  taskCounts: Record<string, number>;
  totals: {
    sessions: number;
    completed: number;
    minutes: number;
    avgFocus: number | null;
    avgProgress: number | null;
    avgSatisfaction: number | null;
    goalsSet: number;
    goalsDone: number;
    goalCompletionRate: number;
  };
  byStrategy: Record<string, number>;
  hintLevels: Record<string, number>;
  byCondition: Record<'metacog' | 'plain', { sessions: number; minutes: number; avgProgress: number | null; avgFocus: number | null }>;
  timeline: {
    id: string;
    date: string;
    subject: string;
    taskKind: TaskKind;
    condition: 'metacog' | 'plain';
    minutes: number;
    plannedMinutes: number;
    focus: number | null;
    progress: number | null;
    satisfaction: number | null;
    goalsDone: number;
    goalsTotal: number;
    completed: boolean;
  }[];
}

export interface MentorDone {
  id: string;
  label?: MentorLabel;
  hintLevel: number;
  checkpoint?: Checkpoint;
  displayText: string;
}

/** POST a turn and stream the mentor reply (SSE over fetch). */
export async function streamChat(
  sessionId: string,
  content: string,
  onDelta: (textSoFar: string) => void,
  onDone: (d: MentorDone) => void,
  kickoff = false,
): Promise<void> {
  const res = await fetch(apiUrl(`/api/sessions/${sessionId}/chat`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, kickoff, studentId: getStudent() || undefined }),
  });
  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  let buf = '';
  let full = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const frames = buf.split('\n\n');
    buf = frames.pop() ?? '';
    for (const frame of frames) {
      const ev = /event:\s*(.*)/.exec(frame)?.[1]?.trim();
      const dataLine = /data:\s*([\s\S]*)/.exec(frame)?.[1]?.trim();
      if (!ev || dataLine == null) continue;
      if (ev === 'delta') {
        full += JSON.parse(dataLine) as string;
        onDelta(full);
      } else if (ev === 'done') {
        onDone(JSON.parse(dataLine) as MentorDone);
      } else if (ev === 'error') {
        full += `\n\n[mentor error: ${JSON.parse(dataLine)}]`;
        onDelta(full);
      }
    }
  }
}
