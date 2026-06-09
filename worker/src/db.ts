import type { StudySession, ChatMessage, MetricEvent, Profile, Course, AchievementGoal } from './domain';

// D1-backed store (async). Each fn takes the D1 binding from the Worker env.

export async function saveSession(db: D1Database, s: StudySession): Promise<void> {
  await db.prepare(
    `INSERT INTO sessions (id, studentId, condition, json, createdAt, updatedAt)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6)
     ON CONFLICT(id) DO UPDATE SET json=?4, condition=?3, updatedAt=?6`,
  ).bind(s.id, s.studentId, s.condition, JSON.stringify(s), s.createdAt, s.updatedAt).run();
}

export async function getSession(db: D1Database, id: string): Promise<StudySession | undefined> {
  const row = await db.prepare('SELECT json FROM sessions WHERE id = ?').bind(id).first<{ json: string }>();
  return row ? (JSON.parse(row.json) as StudySession) : undefined;
}

export async function listSessions(db: D1Database, studentId: string): Promise<StudySession[]> {
  const { results } = await db.prepare('SELECT json FROM sessions WHERE studentId = ? ORDER BY createdAt DESC').bind(studentId).all<{ json: string }>();
  return (results ?? []).map((r) => JSON.parse(r.json) as StudySession);
}

export async function deleteSession(db: D1Database, id: string): Promise<void> {
  await db.batch([
    db.prepare('DELETE FROM messages WHERE sessionId = ?').bind(id),
    db.prepare('DELETE FROM events WHERE sessionId = ?').bind(id),
    db.prepare('DELETE FROM sessions WHERE id = ?').bind(id),
  ]);
}

export async function replaceMaterials(db: D1Database, studentId: string, subject: string, chunks: string[], createdAt: string): Promise<void> {
  const stmts = [db.prepare('DELETE FROM materials WHERE studentId = ? AND subject = ?').bind(studentId, subject)];
  for (const ch of chunks) stmts.push(db.prepare('INSERT INTO materials (id, studentId, subject, chunk, createdAt) VALUES (?1,?2,?3,?4,?5)').bind(crypto.randomUUID(), studentId, subject, ch, createdAt));
  await db.batch(stmts);
}
export async function getMaterialChunks(db: D1Database, studentId: string, subject: string): Promise<string[]> {
  const { results } = await db.prepare('SELECT chunk FROM materials WHERE studentId = ? AND subject = ?').bind(studentId, subject).all<{ chunk: string }>();
  return (results ?? []).map((r) => r.chunk);
}

export async function saveMessage(db: D1Database, m: ChatMessage): Promise<void> {
  await db.prepare(
    `INSERT INTO messages (id, sessionId, role, content, label, hintLevel, checkpoint, latencyMs, createdAt)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`,
  ).bind(
    m.id, m.sessionId, m.role, m.content,
    m.label ?? null, m.hintLevel ?? null, m.checkpoint ? JSON.stringify(m.checkpoint) : null, m.latencyMs ?? null, m.createdAt,
  ).run();
}

export async function getMessages(db: D1Database, sessionId: string): Promise<ChatMessage[]> {
  const { results } = await db.prepare('SELECT * FROM messages WHERE sessionId = ? ORDER BY createdAt ASC').bind(sessionId).all<any>();
  return (results ?? []).map((r) => ({
    ...r,
    checkpoint: r.checkpoint ? JSON.parse(r.checkpoint) : undefined,
    label: r.label ?? undefined,
    hintLevel: r.hintLevel ?? undefined,
    latencyMs: r.latencyMs ?? undefined,
  })) as ChatMessage[];
}

export async function logEvent(db: D1Database, e: MetricEvent): Promise<void> {
  await db.prepare(
    `INSERT INTO events (id, sessionId, studentId, type, payload, condition, createdAt)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
  ).bind(e.id, e.sessionId, e.studentId, e.type, JSON.stringify(e.payload), e.condition, e.createdAt).run();
}

export async function allEvents(db: D1Database): Promise<MetricEvent[]> {
  const { results } = await db.prepare('SELECT * FROM events ORDER BY createdAt ASC').all<any>();
  return (results ?? []).map((r) => ({ ...r, payload: JSON.parse(r.payload) })) as MetricEvent[];
}

export async function getProfile(db: D1Database, studentId: string): Promise<Profile | undefined> {
  const row = await db.prepare('SELECT json FROM profiles WHERE studentId = ?').bind(studentId).first<{ json: string }>();
  return row ? (JSON.parse(row.json) as Profile) : undefined;
}

export async function saveProfile(db: D1Database, p: Profile): Promise<void> {
  await db.prepare(
    `INSERT INTO profiles (studentId, json, createdAt) VALUES (?1, ?2, ?3)
     ON CONFLICT(studentId) DO UPDATE SET json=?2`,
  ).bind(p.studentId, JSON.stringify(p), p.createdAt).run();
}

export interface UserRow { studentId: string; salt: string; passHash: string; createdAt: string }
export async function getUser(db: D1Database, studentId: string): Promise<UserRow | undefined> {
  return (await db.prepare('SELECT * FROM users WHERE studentId = ?').bind(studentId).first<UserRow>()) ?? undefined;
}
export async function saveUser(db: D1Database, u: UserRow): Promise<void> {
  await db.prepare('INSERT INTO users (studentId, salt, passHash, createdAt) VALUES (?1, ?2, ?3, ?4)').bind(u.studentId, u.salt, u.passHash, u.createdAt).run();
}
export async function listUsers(db: D1Database): Promise<{ studentId: string }[]> {
  const { results } = await db.prepare('SELECT studentId FROM users').all<{ studentId: string }>();
  return results ?? [];
}

// ---- courses + achievement goals (course-goal spine) ----
export async function saveCourse(db: D1Database, ctx: Course): Promise<void> {
  await db.prepare('INSERT INTO courses (id, studentId, json, createdAt) VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET json=excluded.json')
    .bind(ctx.id, ctx.studentId, JSON.stringify(ctx), ctx.createdAt).run();
}
export async function listCourses(db: D1Database, studentId: string): Promise<Course[]> {
  const { results } = await db.prepare('SELECT json FROM courses WHERE studentId = ? ORDER BY createdAt DESC').bind(studentId).all<{ json: string }>();
  return (results ?? []).map((r) => JSON.parse(r.json) as Course);
}
export async function saveGoal(db: D1Database, g: AchievementGoal): Promise<void> {
  await db.prepare('INSERT INTO goals (id, studentId, courseId, json, createdAt) VALUES (?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET json=excluded.json')
    .bind(g.id, g.studentId, g.courseId, JSON.stringify(g), g.createdAt).run();
}
export async function getGoal(db: D1Database, id: string): Promise<AchievementGoal | undefined> {
  const row = await db.prepare('SELECT json FROM goals WHERE id = ?').bind(id).first<{ json: string }>();
  return row ? (JSON.parse(row.json) as AchievementGoal) : undefined;
}
export async function listGoals(db: D1Database, studentId: string): Promise<AchievementGoal[]> {
  const { results } = await db.prepare('SELECT json FROM goals WHERE studentId = ? ORDER BY createdAt DESC').bind(studentId).all<{ json: string }>();
  return (results ?? []).map((r) => JSON.parse(r.json) as AchievementGoal);
}
