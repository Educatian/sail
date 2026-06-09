import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { nanoid } from 'nanoid';
import {
  saveSession,
  getSession,
  listSessions,
  deleteSession,
  saveMessage,
  getMessages,
  logEvent,
  allEvents,
  getProfile,
  saveProfile,
  getUser,
  saveUser,
  replaceMaterials,
  getMaterialChunks,
  saveCourse,
  listCourses,
  saveGoal,
  getGoal,
  listGoals,
} from './db.js';
import { randSalt, pbkdf2 } from './auth.js';
import { dueReminder, reminderEmail, sendEmail } from './reminders.js';
import { chunkText, retrieve } from './rag.js';
import { streamMentor } from './llm.js';
import { buildSystemPrompt } from './prompts.js';
import { decidePolicy, policyInstruction } from './policy.js';
import { classifyHelpSeeking, scaffoldFidelity } from './analysis.js';
import { parseMentor, hintLevelSoFar, toLlmMessages } from './mentor.js';
import { buildMarinSystem, type MarinMode, type MarinCtx } from './marin.js';
import { stretchSteering } from './meEngine.js';
import { getOLM, applyUpdate, macroSummary, type Diff } from './olm.js';
import { scheduleReviews, reviewNudge } from './reviewScheduler.js';
import { buildLearnerModel } from './learner.js';
import type { StudySession, ChatMessage, Condition, ContextTrace, MetricEvent, MetricEventType, SpatialTrace, Course, AchievementGoal, ProximalSubgoal, GoalOrientation } from './domain.js';

const now = () => new Date().toISOString();
const CLIENT_EVENTS = new Set<MetricEventType>([
  'client_app_opened',
  'client_auth_started',
  'client_auth_completed',
  'client_anonymous_started',
  'forethought_changed',
  'spatial_consent_opened',
  'spatial_consent_accepted',
  'spatial_consent_declined',
  'spatial_detection_started',
  'spatial_detection_completed',
  'spatial_detection_failed',
  'map_rendered',
  'timer_started',
  'timer_paused',
  'live_tracking_started',
  'live_tracking_stopped',
  'live_tracking_mode_changed',
  'live_tracking_sampled',
  'mentor_turn_started',
  'mentor_turn_completed',
  'voice_input_started',
  'voice_input_stopped',
  'reflection_changed',
  'research_exported',
  'client_error',
  'checkpoint_answered',
  'momentary_check_shown',
  'momentary_check_answered',
  'context_regulated',
  'metacog_experience',
]);
const REDACT_KEYS = new Set(['lat', 'lng', 'latitude', 'longitude', 'coords', 'coordinates', 'position', 'rawPosition', 'rawLocation']);

function emit(
  e: Omit<MetricEvent, 'id' | 'createdAt'>,
): void {
  logEvent({ ...e, id: nanoid(), createdAt: now() });
}

function sanitizePayload(input: unknown, depth = 0): Record<string, unknown> {
  if (!input || typeof input !== 'object' || depth > 4) return {};
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>).slice(0, 40)) {
    if (REDACT_KEYS.has(key)) {
      out[key] = '[redacted]';
    } else if (Array.isArray(value)) {
      out[key] = value.slice(0, 20).map((item) => (item && typeof item === 'object' ? sanitizePayload(item, depth + 1) : item));
    } else if (value && typeof value === 'object') {
      out[key] = sanitizePayload(value, depth + 1);
    } else if (typeof value === 'string') {
      out[key] = value.slice(0, 500);
    } else if (typeof value === 'number' || typeof value === 'boolean' || value == null) {
      out[key] = value;
    }
  }
  return out;
}

function resolveTelemetryContext(sessionId: string | undefined, studentId: string | undefined, fallbackCondition: Condition) {
  const session = sessionId ? getSession(sessionId) : undefined;
  return {
    session,
    sessionId: session?.id ?? sessionId ?? 'client',
    studentId: session?.studentId ?? studentId ?? 'demo',
    condition: session?.condition ?? fallbackCondition,
  };
}

function recomputeMinutes(s: StudySession): number {
  const ms = s.timerSegments.reduce((sum, seg) => {
    if (!seg.endTime) return sum;
    return sum + (new Date(seg.endTime).getTime() - new Date(seg.startTime).getTime());
  }, 0);
  return Math.round(ms / 60000);
}

function normalizeContextTrace(input: unknown): ContextTrace | undefined {
  if (!input || typeof input !== 'object') return undefined;
  const b = input as Partial<ContextTrace>;
  const allowed = new Set(['stable_study', 'classroom', 'home_like', 'transit', 'work_social', 'other', 'not_shared']);
  const placeCategory = allowed.has(String(b.placeCategory)) ? b.placeCategory! : 'not_shared';
  return {
    placeCategory,
    placeLabel: typeof b.placeLabel === 'string' ? b.placeLabel.slice(0, 80) : undefined,
    intentionallyChosen: typeof b.intentionallyChosen === 'boolean' ? b.intentionallyChosen : undefined,
    rawLocationStored: false,
  };
}

function normalizeSpatialTrace(input: unknown): SpatialTrace | undefined {
  if (!input || typeof input !== 'object') return undefined;
  const b = input as Partial<SpatialTrace>;
  const modes = new Set(['off', 'manual', 'auto']);
  const permissions = new Set(['prompt', 'granted', 'denied', 'unsupported', 'error']);
  const mobility = new Set(['still', 'moving', 'unknown']);
  const trackingStates = new Set(['off', 'live', 'ended']);
  const trackingModes = new Set(['study_spot', 'route']);
  const sources = Array.isArray(b.sources) ? b.sources.filter((x): x is SpatialTrace['sources'][number] => ['gps', 'device_motion', 'manual'].includes(String(x))) : [];
  const coord = (n: unknown, min: number, max: number) => (typeof n === 'number' && Number.isFinite(n) && n >= min && n <= max ? Math.round(n * 1000) / 1000 : undefined);
  const nonNeg = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : undefined);
  const whole = (n: unknown, max: number) => (typeof n === 'number' && Number.isFinite(n) && n >= 0 ? Math.min(max, Math.round(n)) : undefined);
  const routePreview = Array.isArray(b.routePreview)
    ? b.routePreview
      .slice(-40)
      .map((p) => {
        if (!p || typeof p !== 'object') return null;
        const point = p as { x?: unknown; y?: unknown };
        if (typeof point.x !== 'number' || typeof point.y !== 'number') return null;
        if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) return null;
        return { x: Math.max(0, Math.min(100, Math.round(point.x * 10) / 10)), y: Math.max(0, Math.min(100, Math.round(point.y * 10) / 10)) };
      })
      .filter((p): p is { x: number; y: number } => p !== null)
    : undefined;
  return {
    acquisitionMode: modes.has(String(b.acquisitionMode)) ? b.acquisitionMode! : 'off',
    capturedAt: typeof b.capturedAt === 'string' ? b.capturedAt : undefined,
    sources,
    permissionState: permissions.has(String(b.permissionState)) ? b.permissionState : undefined,
    coarseLatitude: coord(b.coarseLatitude, -90, 90),
    coarseLongitude: coord(b.coarseLongitude, -180, 180),
    accuracyMeters: nonNeg(b.accuracyMeters),
    speedMetersPerSecond: typeof b.speedMetersPerSecond === 'number' ? nonNeg(b.speedMetersPerSecond) ?? null : null,
    motionMagnitude: typeof b.motionMagnitude === 'number' ? nonNeg(b.motionMagnitude) ?? null : null,
    mobilityState: mobility.has(String(b.mobilityState)) ? b.mobilityState! : 'unknown',
    trackingState: trackingStates.has(String(b.trackingState)) ? b.trackingState : undefined,
    trackingMode: trackingModes.has(String(b.trackingMode)) ? b.trackingMode : undefined,
    trackingStartedAt: typeof b.trackingStartedAt === 'string' ? b.trackingStartedAt : undefined,
    trackingEndedAt: typeof b.trackingEndedAt === 'string' ? b.trackingEndedAt : undefined,
    lastSampleAt: typeof b.lastSampleAt === 'string' ? b.lastSampleAt : undefined,
    sampleCount: whole(b.sampleCount, 10000),
    distanceMeters: nonNeg(b.distanceMeters),
    dwellSeconds: whole(b.dwellSeconds, 86400),
    transitionCount: whole(b.transitionCount, 1000),
    routePreview,
    rawLocationStored: false,
  };
}

export const api = new Hono();

api.post('/events', async (c) => {
  const b = await c.req.json().catch(() => ({}));
  const type = String(b.type ?? '') as MetricEventType;
  if (!CLIENT_EVENTS.has(type)) return c.json({ error: 'unsupported event type' }, 400);
  const condition: Condition = b.condition === 'plain' ? 'plain' : 'metacog';
  const context = resolveTelemetryContext(
    typeof b.sessionId === 'string' ? b.sessionId : undefined,
    typeof b.studentId === 'string' ? b.studentId : undefined,
    condition,
  );
  emit({
    sessionId: context.sessionId,
    studentId: context.studentId,
    condition: context.condition,
    type,
    payload: {
      source: 'client',
      route: typeof b.route === 'string' ? b.route.slice(0, 120) : undefined,
      clientAt: typeof b.clientAt === 'string' ? b.clientAt : undefined,
      ...sanitizePayload(b.payload),
    },
  });
  return c.json({ ok: true });
});

// --- create session (forethought) ---
api.post('/sessions', async (c) => {
  const b = await c.req.json().catch(() => ({}));
  const ts = now();
  const condition: Condition = b.condition === 'plain' ? 'plain' : 'metacog';
  const s: StudySession = {
    id: nanoid(),
    studentId: b.studentId ?? 'demo',
    subject: b.subject ?? 'Untitled',
    taskKind: b.taskKind ?? 'coursework',
    date: ts.slice(0, 10),
    condition,
    scaffoldStyle: b.scaffoldStyle === 'structuring' ? 'structuring' : 'problematizing',
    scaffoldTiming: b.scaffoldTiming === 'proactive' ? 'proactive' : 'responsive',
    goals: (b.goals ?? []).map((t: string) => ({ id: nanoid(), text: t, isTicked: false, createdAt: ts })),
    strategies: (b.strategies ?? []).map((k: string) => ({ id: nanoid(), kind: k })),
    plannedMinutes: b.plannedMinutes ?? 25,
    confidencePre: typeof b.confidencePre === 'number' ? b.confidencePre : undefined,
    contextTrace: normalizeContextTrace(b.contextTrace),
    spatialTrace: normalizeSpatialTrace(b.spatialTrace),
    courseId: typeof b.courseId === 'string' ? b.courseId : undefined,
    subgoalId: typeof b.subgoalId === 'string' ? b.subgoalId : undefined,
    timerSegments: [],
    actualMinutes: 0,
    inProgress: false,
    completed: false,
    createdAt: ts,
    updatedAt: ts,
  };
  saveSession(s);
  emit({ sessionId: s.id, studentId: s.studentId, type: 'session_started', payload: { subject: s.subject, taskKind: s.taskKind, contextTrace: s.contextTrace, spatialTrace: s.spatialTrace }, condition });
  return c.json(s);
});

api.get('/sessions', (c) => c.json(listSessions(c.req.query('studentId') ?? 'demo')));

// --- courses + achievement goals (course-goal spine) ---
api.get('/courses', (c) => c.json(listCourses(c.req.query('studentId') ?? 'demo')));
api.post('/courses', async (c) => {
  const b = await c.req.json().catch(() => ({}));
  const ts = now();
  const course: Course = {
    id: nanoid(), studentId: b.studentId ?? 'demo', title: (b.title ?? 'Untitled course').trim(),
    externalId: typeof b.externalId === 'string' ? b.externalId : undefined,
    externalSource: b.externalSource === 'canvas' ? 'canvas' : 'manual',
    termEnd: typeof b.termEnd === 'string' ? b.termEnd : undefined, createdAt: ts,
  };
  saveCourse(course);
  emit({ sessionId: '', studentId: course.studentId, type: 'course_created', payload: { courseId: course.id, title: course.title }, condition: 'metacog' });
  return c.json(course);
});

api.get('/goals', (c) => c.json(listGoals(c.req.query('studentId') ?? 'demo')));
api.post('/goals', async (c) => {
  const b = await c.req.json().catch(() => ({}));
  const ts = now();
  const subgoals: ProximalSubgoal[] = (b.subgoals ?? []).map((t: string) => ({ id: nanoid(), text: t, done: false }));
  const goal: AchievementGoal = {
    id: nanoid(), studentId: b.studentId ?? 'demo', courseId: b.courseId ?? '',
    distal: (b.distal ?? '').trim(), orientation: (b.orientation === 'performance' ? 'performance' : 'mastery') as GoalOrientation,
    targetDate: typeof b.targetDate === 'string' ? b.targetDate : undefined, subgoals, createdAt: ts, updatedAt: ts,
  };
  saveGoal(goal);
  emit({ sessionId: '', studentId: goal.studentId, type: 'goal_set', payload: { goalId: goal.id, courseId: goal.courseId, subgoalCount: subgoals.length }, condition: 'metacog' });
  return c.json(goal);
});
api.patch('/goals/:id', async (c) => {
  const g = getGoal(c.req.param('id'));
  if (!g) return c.json({ error: 'not found' }, 404);
  const p = await c.req.json().catch(() => ({}));
  if (typeof p.distal === 'string') g.distal = p.distal.trim();
  if (typeof p.targetDate === 'string') g.targetDate = p.targetDate;
  if (Array.isArray(p.subgoals)) g.subgoals = p.subgoals;
  if (typeof p.completeSubgoalId === 'string') {
    const sg = g.subgoals.find((x) => x.id === p.completeSubgoalId);
    if (sg && !sg.done) { sg.done = true; emit({ sessionId: '', studentId: g.studentId, type: 'subgoal_completed', payload: { goalId: g.id, subgoalId: sg.id }, condition: 'metacog' }); }
  }
  g.updatedAt = now();
  saveGoal(g);
  return c.json(g);
});

api.get('/sessions/:id', (c) => {
  const s = getSession(c.req.param('id'));
  return s ? c.json(s) : c.json({ error: 'not found' }, 404);
});
api.delete('/sessions/:id', (c) => { deleteSession(c.req.param('id')); return c.json({ ok: true }); });

// --- update session (tick goals, timer, start/stop, reflection) ---
api.patch('/sessions/:id', async (c) => {
  const s = getSession(c.req.param('id'));
  if (!s) return c.json({ error: 'not found' }, 404);
  const p = await c.req.json().catch(() => ({}));
  const before = s.goals.filter((g) => g.isTicked).length;

  if (typeof p.subject === 'string' && p.subject.trim()) s.subject = p.subject.trim();
  if (typeof p.taskKind === 'string') s.taskKind = p.taskKind;
  if (Array.isArray(p.goals)) s.goals = p.goals;
  if (Array.isArray(p.strategies)) s.strategies = p.strategies;
  if (Array.isArray(p.timerSegments)) s.timerSegments = p.timerSegments;
  if (typeof p.inProgress === 'boolean') s.inProgress = p.inProgress;
  if (typeof p.plannedMinutes === 'number') s.plannedMinutes = p.plannedMinutes;
  for (const k of ['focus', 'progress', 'satisfaction'] as const) if (p[k] != null) s[k] = p[k];
  if (typeof p.notes === 'string') s.notes = p.notes;
  if (typeof p.adjustment === 'string') s.adjustment = p.adjustment;
  if (typeof p.usefulStrategy === 'string') s.usefulStrategy = p.usefulStrategy;
  if (typeof p.confidencePre === 'number') s.confidencePre = p.confidencePre;
  if (typeof p.performanceActual === 'number') s.performanceActual = p.performanceActual;
  if (p.contextTrace) s.contextTrace = normalizeContextTrace(p.contextTrace);
  if (p.spatialTrace) s.spatialTrace = normalizeSpatialTrace(p.spatialTrace);
  if (Array.isArray(p.momentaryChecks)) s.momentaryChecks = p.momentaryChecks;
  if (typeof p.courseId === 'string') s.courseId = p.courseId;
  if (typeof p.subgoalId === 'string') s.subgoalId = p.subgoalId;
  if (typeof p.contextHelpfulness === 'number') s.contextHelpfulness = p.contextHelpfulness;
  if (typeof p.contextReflection === 'string') s.contextReflection = p.contextReflection;
  if (typeof p.learnerModelCorrection === 'string') s.learnerModelCorrection = p.learnerModelCorrection;
  if (typeof p.completed === 'boolean') s.completed = p.completed;

  s.actualMinutes = recomputeMinutes(s);
  s.updatedAt = now();
  saveSession(s);

  const after = s.goals.filter((g) => g.isTicked).length;
  if (after > before) emit({ sessionId: s.id, studentId: s.studentId, type: 'goal_ticked', payload: { ticked: after }, condition: s.condition });
  if (Array.isArray(p.strategies)) emit({ sessionId: s.id, studentId: s.studentId, type: 'strategy_selected', payload: { strategies: s.strategies.map((x) => x.kind) }, condition: s.condition });
  if (p.completed === true) {
    emit({ sessionId: s.id, studentId: s.studentId, type: 'reflection_submitted', payload: { focus: s.focus, progress: s.progress, satisfaction: s.satisfaction, contextHelpfulness: s.contextHelpfulness }, condition: s.condition });
    if (s.learnerModelCorrection || s.contextReflection) emit({ sessionId: s.id, studentId: s.studentId, type: 'context_corrected', payload: { learnerModelCorrection: s.learnerModelCorrection, contextReflection: s.contextReflection, contextTrace: s.contextTrace, spatialTrace: s.spatialTrace }, condition: s.condition });
    emit({ sessionId: s.id, studentId: s.studentId, type: 'session_completed', payload: { actualMinutes: s.actualMinutes }, condition: s.condition });
  }
  return c.json(s);
});

api.get('/sessions/:id/messages', (c) => c.json(getMessages(c.req.param('id'))));

// --- RAG: course materials per subject ---
api.post('/materials', async (c) => {
  const b = await c.req.json().catch(() => ({}));
  const sid = b.studentId ?? 'demo';
  const subject = String(b.subject ?? '').trim();
  if (!subject) return c.json({ error: 'subject required' }, 400);
  const chunks = chunkText(String(b.text ?? ''));
  replaceMaterials(sid, subject, chunks, now());
  return c.json({ subject, count: chunks.length });
});
api.get('/materials', (c) => c.json({ count: getMaterialChunks(c.req.query('studentId') ?? 'demo', c.req.query('subject') ?? '').length }));

// --- learner model (carry-forward, fading, spacing, growth, calibration) ---
api.get('/learner', (c) => c.json(buildLearnerModel(c.req.query('studentId') ?? 'demo')));

// --- auth: email + passcode (new = register, existing = login) ---
api.post('/auth', async (c) => {
  const { email, passcode, mode } = await c.req.json().catch(() => ({}));
  const sid = String(email ?? '').trim().toLowerCase();
  if (!sid || !passcode || String(passcode).length < 4) return c.json({ error: 'Email and a 4+ character passcode are required.' }, 400);
  const existing = getUser(sid);
  if (mode === 'login') {
    if (!existing) return c.json({ error: 'No account for this email — sign up first.' }, 404);
    if ((await pbkdf2(String(passcode), existing.salt)) !== existing.passHash) return c.json({ error: 'Wrong passcode.' }, 401);
    return c.json({ studentId: sid, returning: true });
  }
  if (existing) {
    if (mode === 'signup') return c.json({ error: 'An account with this email already exists — sign in instead.' }, 409);
    if ((await pbkdf2(String(passcode), existing.salt)) !== existing.passHash) return c.json({ error: 'Wrong passcode for this email.' }, 401);
    return c.json({ studentId: sid, returning: true });
  }
  const salt = randSalt();
  saveUser({ studentId: sid, salt, passHash: await pbkdf2(String(passcode), salt), createdAt: now() });
  return c.json({ studentId: sid, returning: false });
});

// --- profile (baseline SRL intake, RQ12) ---
api.get('/profile', (c) => c.json(getProfile(c.req.query('studentId') ?? 'demo') ?? null));

// --- shared Open Learner Model (both apps read/write; arbiter enforces single-writer + field ownership) ---
api.get('/olm', (c) => c.json(getOLM(c.req.query('learnerId') ?? c.req.query('studentId') ?? 'demo')));
api.post('/olm', async (c) => {
  const body = await c.req.json().catch(() => ({})) as { learnerId?: string; studentId?: string; writer?: string; diff?: Diff };
  const id = String(body.learnerId ?? body.studentId ?? 'demo').slice(0, 128);
  if (!id.trim() || !/^[\w@.:-]{1,128}$/.test(id)) return c.json({ ok: false, error: 'invalid learnerId' }, 400);   // input integrity
  const writer = body.writer === 'sail' ? 'sail' : 'me';
  const diff = (body.diff && typeof body.diff === 'object') ? body.diff : {};
  const r = applyUpdate(id, writer, diff);   // arbiter enforces field ownership + blocks unsafe keys
  return c.json({ ok: true, rev: r.olm._rev, applied: r.applied, rejected: r.rejected });
});
// adaptive review schedule: the planner reads the latent ME beliefs + forgetting drift → what to review next
api.get('/review', (c) => {
  const id = c.req.query('learnerId') ?? c.req.query('studentId') ?? 'demo';
  const olm = getOLM(id) as { by_concept?: Record<string, unknown> };
  return c.json({ queue: scheduleReviews(olm.by_concept ?? {}, { now: Date.now() }) });
});
api.put('/profile', async (c) => {
  const b = await c.req.json().catch(() => ({}));
  const sid = b.studentId ?? 'demo';
  const existing = getProfile(sid);
  const items: number[] = Array.isArray(b.items) ? b.items.map(Number) : (existing?.items ?? []);
  const baselineSRL = items.length ? Math.round((items.reduce((a, x) => a + x, 0) / items.length) * 10) / 10 : (existing?.baselineSRL ?? 0);
  const profile = {
    studentId: sid, baselineSRL, items, createdAt: existing?.createdAt ?? now(),
    remindersOn: typeof b.remindersOn === 'boolean' ? b.remindersOn : (existing?.remindersOn ?? true),
    lastRemindedAt: existing?.lastRemindedAt,
  };
  saveProfile(profile);
  return c.json(profile);
});

// --- email reminder scaffolding: send a test now ---
api.post('/reminders/test', async (c) => {
  const b = await c.req.json().catch(() => ({}));
  const sid = b.studentId ?? c.req.query('studentId') ?? 'demo';
  const sessions = listSessions(sid);
  const due = dueReminder(sessions) ?? { subject: sessions[0]?.subject ?? 'your studies', days: 0, adjustment: sessions.find((s) => s.adjustment)?.adjustment };
  const mail = reminderEmail(due);
  const sent = await sendEmail(sid, mail.subject, mail.html, mail.text);
  return c.json({ to: sid, sent, preview: mail.text });
});

// --- aggregate stats for the Progress Dashboard ---
api.get('/stats', (c) => {
  const studentId = c.req.query('studentId') ?? 'demo';
  const sessions = listSessions(studentId); // newest first
  const events = allEvents().filter((e) => e.studentId === studentId);
  const completed = sessions.filter((s) => s.completed);
  const nums = (arr: (number | undefined)[]) => arr.filter((x): x is number => typeof x === 'number');
  const avg = (arr: number[]) => (arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 100) / 100 : null);

  const byStrategy: Record<string, number> = {};
  for (const s of sessions) for (const st of s.strategies) byStrategy[st.kind] = (byStrategy[st.kind] ?? 0) + 1;

  const hintLevels: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
  for (const e of events) if (e.type === 'hint_requested') {
    const lv = Number((e.payload as { level?: number }).level);
    if (lv >= 1 && lv <= 3) hintLevels[lv]++;
  }

  const condStats = (cnd: 'metacog' | 'plain') => {
    const ss = completed.filter((s) => s.condition === cnd);
    return {
      sessions: ss.length,
      minutes: ss.reduce((a, s) => a + s.actualMinutes, 0),
      avgProgress: avg(nums(ss.map((s) => s.progress))),
      avgFocus: avg(nums(ss.map((s) => s.focus))),
    };
  };

  const stateCounts: Record<string, number> = {};
  const eventCounts: Record<string, number> = {};
  for (const e of events) eventCounts[e.type] = (eventCounts[e.type] ?? 0) + 1;
  for (const e of events) if (e.type === 'state_detected') { const st = String((e.payload as { state?: string }).state || ''); if (st) stateCounts[st] = (stateCounts[st] ?? 0) + 1; }
  const policyCounts: Record<string, number> = {};
  for (const e of events) if (e.type === 'policy_decided') { const action = String((e.payload as { action?: string }).action || ''); if (action) policyCounts[action] = (policyCounts[action] ?? 0) + 1; }
  const helpSeekingCounts: Record<string, number> = {};
  for (const e of events) if (e.type === 'help_seeking_classified') { const quality = String((e.payload as { quality?: string }).quality || ''); if (quality) helpSeekingCounts[quality] = (helpSeekingCounts[quality] ?? 0) + 1; }
  const fidelityCounts: Record<string, number> = {};
  for (const e of events) if (e.type === 'scaffold_fidelity') { const fidelity = String((e.payload as { fidelity?: string }).fidelity || ''); if (fidelity) fidelityCounts[fidelity] = (fidelityCounts[fidelity] ?? 0) + 1; }
  const contextCounts: Record<string, number> = {};
  for (const s of sessions) { const place = s.contextTrace?.placeCategory ?? 'not_shared'; contextCounts[place] = (contextCounts[place] ?? 0) + 1; }
  const spatialCounts: Record<string, number> = {};
  for (const s of sessions) { const mode = s.spatialTrace?.acquisitionMode ?? 'off'; spatialCounts[mode] = (spatialCounts[mode] ?? 0) + 1; }
  const taskCounts: Record<string, number> = {};
  for (const s of sessions) { const task = s.taskKind ?? 'coursework'; taskCounts[task] = (taskCounts[task] ?? 0) + 1; }
  const goalsSet = sessions.reduce((a, s) => a + s.goals.length, 0);
  const goalsDone = sessions.reduce((a, s) => a + s.goals.filter((g) => g.isTicked).length, 0);

  const days = [...new Set(completed.map((s) => s.date))].sort();
  const today = new Date().toISOString().slice(0, 10);
  const yest = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  let longest = 0, run = 0; let prev: string | null = null;
  for (const d of days) { run = prev && new Date(d).getTime() - new Date(prev).getTime() === 86400000 ? run + 1 : 1; longest = Math.max(longest, run); prev = d; }
  let streakDays = 0;
  if (days.length && (days[days.length - 1] === today || days[days.length - 1] === yest)) {
    streakDays = 1;
    for (let i = days.length - 2; i >= 0; i--) { if (new Date(days[i + 1]).getTime() - new Date(days[i]).getTime() === 86400000) streakDays++; else break; }
  }
  let xp = 0;
  for (const s of completed) xp += 10 + s.goals.filter((g) => g.isTicked).length * 2 + (s.adjustment ? 5 : 0) + (typeof s.confidencePre === 'number' && typeof s.performanceActual === 'number' && Math.abs(s.confidencePre - s.performanceActual) <= 15 ? 5 : 0);
  // gamification rewards the SRL LOGGING behaviors (process, not performance) to reinforce self-monitoring
  const loggingXp = (eventCounts['momentary_check_answered'] ?? 0) * 3 + (eventCounts['subgoal_completed'] ?? 0) * 8 + (eventCounts['context_regulated'] ?? 0) * 5 + (eventCounts['goal_set'] ?? 0) * 10 + (eventCounts['course_created'] ?? 0) * 5;
  xp += loggingXp;
  const reflections = completed.filter((s) => s.adjustment).length;
  const badges = [
    { id: 'self_monitor', label: 'Self-monitor', hint: 'Logged 5 momentary check-ins', earned: (eventCounts['momentary_check_answered'] ?? 0) >= 5 },
    { id: 'course_charted', label: 'Course charted', hint: 'Set a course goal', earned: (eventCounts['goal_set'] ?? 0) >= 1 },
    { id: 'adapter', label: 'Adapter', hint: 'Regulated your environment 3 times', earned: (eventCounts['context_regulated'] ?? 0) >= 3 },
    { id: 'reflector', label: 'Reflector', hint: 'Reflected on 5 sessions', earned: reflections >= 5 },
    { id: 'consistent', label: 'Consistent', hint: '3-day study streak', earned: longest >= 3 },
  ];
  const gamification = { streakDays, longestStreak: longest, xp, level: 1 + Math.floor(xp / 100), loggingXp, badges };

  return c.json({
    gamification,
    eventCounts,
    stateCounts,
    policyCounts,
    contextCounts,
    spatialCounts,
    helpSeekingCounts,
    fidelityCounts,
    taskCounts,
    totals: {
      sessions: sessions.length,
      completed: completed.length,
      minutes: sessions.reduce((a, s) => a + s.actualMinutes, 0),
      avgFocus: avg(nums(completed.map((s) => s.focus))),
      avgProgress: avg(nums(completed.map((s) => s.progress))),
      avgSatisfaction: avg(nums(completed.map((s) => s.satisfaction))),
      goalsSet,
      goalsDone,
      goalCompletionRate: goalsSet ? Math.round((goalsDone / goalsSet) * 100) : 0,
    },
    byStrategy,
    hintLevels,
    byCondition: { metacog: condStats('metacog'), plain: condStats('plain') },
    timeline: sessions
      .slice()
      .reverse()
      .map((s) => ({
        id: s.id,
        date: s.date,
        subject: s.subject,
        taskKind: s.taskKind ?? 'coursework',
        condition: s.condition,
        minutes: s.actualMinutes,
        plannedMinutes: s.plannedMinutes,
        focus: s.focus ?? null,
        progress: s.progress ?? null,
        satisfaction: s.satisfaction ?? null,
        goalsDone: s.goals.filter((g) => g.isTicked).length,
        goalsTotal: s.goals.length,
        completed: s.completed,
      })),
  });
});

// --- mentor chat turn (SSE stream) ---
api.post('/sessions/:id/chat', async (c) => {
  const id = c.req.param('id');
  const s = getSession(id);
  if (!s) return c.json({ error: 'not found' }, 404);
  const body = await c.req.json().catch(() => ({}));
  const kickoff = body.kickoff === true; // proactive opener (RQ9)
  const content = String(body.content ?? '');
  if (!kickoff) {
    saveMessage({ id: nanoid(), sessionId: id, role: 'user', content, createdAt: now() });
    const helpSeeking = classifyHelpSeeking(content);
    emit({ sessionId: id, studentId: s.studentId, type: 'help_seeking_classified', payload: { quality: helpSeeking, source: 'rule_proxy' }, condition: s.condition });
  }

  const prior = getMessages(id);
  const hint = hintLevelSoFar(prior);
  const learner = buildLearnerModel(s.studentId);
  const policy = decidePolicy(s, learner, prior);
  s.lastPolicy = policy;
  s.updatedAt = now();
  saveSession(s);
  emit({ sessionId: s.id, studentId: s.studentId, type: 'policy_decided', payload: { ...policy }, condition: s.condition });
  let system = buildSystemPrompt(s, s.condition, hint, learner) + policyInstruction(policy);
  const grounded = retrieve(content, getMaterialChunks(s.studentId, s.subject), 4);
  if (grounded.length) system += `\n\n## Course materials (ground your guidance in these; if the answer isn't here, say it's outside the provided materials and don't guess)\n${grounded.map((g, i) => `[${i + 1}] ${g}`).join('\n\n')}`;
  const llmMessages = kickoff
    ? [{ role: 'user' as const, content: '[Session start. The learner has not spoken yet. Proactively open: greet in one short line and ask ONE planning question to kick off forethought.]' }]
    : toLlmMessages(prior);

  return streamSSE(c, async (stream) => {
    let full = '';
    const t0 = Date.now();
    try {
      for await (const chunk of streamMentor({ system, messages: llmMessages })) {
        full += chunk;
        await stream.writeSSE({ event: 'delta', data: JSON.stringify(chunk) });
      }
    } catch (err) {
      await stream.writeSSE({ event: 'error', data: JSON.stringify(String(err)) });
    }
    const parsed = parseMentor(full);
    const asst: ChatMessage = {
      id: nanoid(),
      sessionId: id,
      role: 'assistant',
      content: full,
      label: parsed.label,
      hintLevel: parsed.hintLevel,
      checkpoint: parsed.checkpoint,
      latencyMs: Date.now() - t0,
      createdAt: now(),
    };
    saveMessage(asst);
    if (parsed.hintLevel > 0) emit({ sessionId: id, studentId: s.studentId, type: 'hint_requested', payload: { level: parsed.hintLevel }, condition: s.condition });
    if (parsed.state) emit({ sessionId: id, studentId: s.studentId, type: 'state_detected', payload: { state: parsed.state }, condition: s.condition });
    emit({ sessionId: id, studentId: s.studentId, type: 'scaffold_fidelity', payload: { fidelity: scaffoldFidelity(policy.action, parsed.label), policyAction: policy.action, label: parsed.label ?? null }, condition: s.condition });
    await stream.writeSSE({
      event: 'done',
      data: JSON.stringify({ id: asst.id, label: parsed.label, state: parsed.state, hintLevel: parsed.hintLevel, checkpoint: parsed.checkpoint, displayText: parsed.displayText }),
    });
  });
});

// --- session-independent Marin conversation (ask / goal_setup / reflection / onboarding) ---
function marinContext(studentId: string, mode: MarinMode, sessionId?: string): MarinCtx {
  const courses = listCourses(studentId);
  const goals = listGoals(studentId);
  const sessions = listSessions(studentId);
  const ctx: MarinCtx = {
    courses: courses.slice(0, 6).map((c) => {
      const g = goals.find((x) => x.courseId === c.id);
      return { title: c.title, distal: g?.distal, openSubgoals: g ? g.subgoals.filter((s) => !s.done).length : 0 };
    }),
    recentSubjects: [...new Set(sessions.map((s) => s.subject))].slice(0, 5),
    completedCount: sessions.filter((s) => s.completed).length,
  };
  if (mode === 'reflection' && sessionId) {
    const s = getSession(sessionId);
    if (s) ctx.sessionSummary = `"${s.subject}" (${s.taskKind}), ${s.actualMinutes}m, goals ${s.goals.filter((g) => g.isTicked).length}/${s.goals.length}, confidence ${s.confidencePre ?? '?'} vs actual ${s.performanceActual ?? '?'}, focus ${s.focus ?? '?'}/5.`;
  }
  return ctx;
}

api.post('/marin/chat', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const studentId = String(body.studentId ?? 'demo');
  const mode: MarinMode = ['ask', 'goal_setup', 'reflection', 'onboarding', 'stretch', 'plan'].includes(body.mode) ? body.mode : 'ask';
  const history: { role: 'user' | 'assistant'; content: string }[] = Array.isArray(body.messages)
    ? body.messages.filter((m: { role?: string; content?: string }) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string').slice(-12)
    : [];
  const ctx = marinContext(studentId, mode, body.sessionId);
  let system = buildMarinSystem(mode, ctx);
  const olmNote = macroSummary(studentId);   // micro→macro synergy: read what the ME chatbot wrote
  if (olmNote) system += `\n\n## From their problem practice (shared learner model)\n${olmNote}`;
  // adaptive planning: when helping plan/reflect, surface what the latent OLM says to review next
  if (mode === 'plan' || mode === 'reflection' || mode === 'goal_setup') {
    const olm = getOLM(studentId) as { by_concept?: Record<string, unknown> };
    const nudge = reviewNudge(olm.by_concept ?? {}, { now: Date.now() });
    if (nudge) system += `\n\n## Adaptive review (from the latent learner model)\n${nudge} Weave this into the plan naturally if it fits.`;
  }
  // Stretch mode: deterministic policy picks ONE move (LLM = renderer only). See worker meEngine.ts.
  let steer: ReturnType<typeof stretchSteering> | null = null;
  if (mode === 'stretch') {
    steer = stretchSteering(history);
    system += `\n\n## Move steering (deterministic — obey exactly)\nA policy engine has selected the next move. Render ONLY this move; do not run the full loop yourself.\n${steer.directive}`;
  }
  const llmMessages = history.length ? history : [{ role: 'user' as const, content: '[Open the conversation. Greet briefly and ask one helpful opening question for this mode.]' }];
  emit({ sessionId: body.sessionId ?? '', studentId, type: 'marin_chat', payload: { mode, turn: history.length, ...(steer ? { move: steer.decision.move, V: steer.decision.V, abstain: steer.decision.move === 'ABSTAIN' } : {}) }, condition: 'metacog' });
  return streamSSE(c, async (stream) => {
    let full = '';
    try {
      for await (const chunk of streamMentor({ system, messages: llmMessages })) {
        full += chunk;
        await stream.writeSSE({ event: 'delta', data: JSON.stringify(chunk) });
      }
    } catch (err) { await stream.writeSSE({ event: 'error', data: JSON.stringify(String(err)) }); }
    await stream.writeSSE({ event: 'done', data: JSON.stringify({ ok: true }) });
  });
});

// --- research export ---
api.get('/export', (c) => {
  const studentId = c.req.query('studentId') ?? 'demo';
  const sessions = listSessions(studentId);
  emit({ sessionId: 'export', studentId, type: 'research_exported', payload: { format: 'json', sessionCount: sessions.length }, condition: 'metacog' });
  return c.json({
    exportedAt: now(),
    studentId,
    sessions: sessions.map((s) => ({ session: s, messages: getMessages(s.id) })),
    events: allEvents().filter((e) => e.studentId === studentId),
  });
});

api.get('/export.csv', (c) => {
  const rows = [['createdAt', 'sessionId', 'studentId', 'condition', 'type', 'payload']];
  for (const e of allEvents()) rows.push([e.createdAt, e.sessionId, e.studentId, e.condition, e.type, JSON.stringify(e.payload)]);
  const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  return c.body(csv, 200, { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename=sail-events.csv' });
});
