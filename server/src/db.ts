import Database from 'better-sqlite3';
import { mkdirSync, appendFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { StudySession, ChatMessage, MetricEvent, Profile } from './domain.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');
mkdirSync(DATA_DIR, { recursive: true });
mkdirSync(join(DATA_DIR, 'sessions'), { recursive: true }); // JSONL transcripts

const db = new Database(join(DATA_DIR, 'sail.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    studentId TEXT NOT NULL,
    condition TEXT NOT NULL,
    json TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    sessionId TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    label TEXT,
    hintLevel INTEGER,
    checkpoint TEXT,
    latencyMs INTEGER,
    createdAt TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(sessionId);
  CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    sessionId TEXT NOT NULL,
    studentId TEXT NOT NULL,
    type TEXT NOT NULL,
    payload TEXT NOT NULL,
    condition TEXT NOT NULL,
    createdAt TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_events_session ON events(sessionId);
  CREATE TABLE IF NOT EXISTS profiles (
    studentId TEXT PRIMARY KEY,
    json TEXT NOT NULL,
    createdAt TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS users (
    studentId TEXT PRIMARY KEY,
    salt TEXT NOT NULL,
    passHash TEXT NOT NULL,
    createdAt TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS materials (
    id TEXT PRIMARY KEY,
    studentId TEXT NOT NULL,
    subject TEXT NOT NULL,
    chunk TEXT NOT NULL,
    createdAt TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_materials_subj ON materials(studentId, subject);
`);

// ---- sessions ----
export function saveSession(s: StudySession): void {
  db.prepare(
    `INSERT INTO sessions (id, studentId, condition, json, createdAt, updatedAt)
     VALUES (@id, @studentId, @condition, @json, @createdAt, @updatedAt)
     ON CONFLICT(id) DO UPDATE SET json=@json, condition=@condition, updatedAt=@updatedAt`,
  ).run({
    id: s.id,
    studentId: s.studentId,
    condition: s.condition,
    json: JSON.stringify(s),
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  });
}

export function getSession(id: string): StudySession | undefined {
  const row = db.prepare('SELECT json FROM sessions WHERE id = ?').get(id) as { json: string } | undefined;
  return row ? (JSON.parse(row.json) as StudySession) : undefined;
}

export function listSessions(studentId: string): StudySession[] {
  const rows = db
    .prepare('SELECT json FROM sessions WHERE studentId = ? ORDER BY createdAt DESC')
    .all(studentId) as { json: string }[];
  return rows.map((r) => JSON.parse(r.json) as StudySession);
}

export function deleteSession(id: string): void {
  db.prepare('DELETE FROM messages WHERE sessionId = ?').run(id);
  db.prepare('DELETE FROM events WHERE sessionId = ?').run(id);
  db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
}

export function replaceMaterials(studentId: string, subject: string, chunks: string[], createdAt: string): void {
  db.prepare('DELETE FROM materials WHERE studentId = ? AND subject = ?').run(studentId, subject);
  const ins = db.prepare('INSERT INTO materials (id, studentId, subject, chunk, createdAt) VALUES (?,?,?,?,?)');
  for (const ch of chunks) ins.run(crypto.randomUUID(), studentId, subject, ch, createdAt);
}
export function getMaterialChunks(studentId: string, subject: string): string[] {
  return (db.prepare('SELECT chunk FROM materials WHERE studentId = ? AND subject = ?').all(studentId, subject) as { chunk: string }[]).map((r) => r.chunk);
}

// ---- messages (+ JSONL transcript for research export) ----
export function saveMessage(m: ChatMessage): void {
  db.prepare(
    `INSERT INTO messages (id, sessionId, role, content, label, hintLevel, checkpoint, latencyMs, createdAt)
     VALUES (@id, @sessionId, @role, @content, @label, @hintLevel, @checkpoint, @latencyMs, @createdAt)`,
  ).run({
    id: m.id,
    sessionId: m.sessionId,
    role: m.role,
    content: m.content,
    label: m.label ?? null,
    hintLevel: m.hintLevel ?? null,
    checkpoint: m.checkpoint ? JSON.stringify(m.checkpoint) : null,
    latencyMs: m.latencyMs ?? null,
    createdAt: m.createdAt,
  });
  appendFileSync(join(DATA_DIR, 'sessions', `${m.sessionId}.jsonl`), JSON.stringify(m) + '\n');
}

export function getMessages(sessionId: string): ChatMessage[] {
  const rows = db
    .prepare('SELECT * FROM messages WHERE sessionId = ? ORDER BY createdAt ASC')
    .all(sessionId) as any[];
  return rows.map((r) => ({
    ...r,
    checkpoint: r.checkpoint ? JSON.parse(r.checkpoint) : undefined,
    label: r.label ?? undefined,
    hintLevel: r.hintLevel ?? undefined,
    latencyMs: r.latencyMs ?? undefined,
  })) as ChatMessage[];
}

// ---- events (async metrics) ----
export function logEvent(e: MetricEvent): void {
  db.prepare(
    `INSERT INTO events (id, sessionId, studentId, type, payload, condition, createdAt)
     VALUES (@id, @sessionId, @studentId, @type, @payload, @condition, @createdAt)`,
  ).run({ ...e, payload: JSON.stringify(e.payload) });
}

export function allEvents(): MetricEvent[] {
  const rows = db.prepare('SELECT * FROM events ORDER BY createdAt ASC').all() as any[];
  return rows.map((r) => ({ ...r, payload: JSON.parse(r.payload) })) as MetricEvent[];
}

export function getProfile(studentId: string): Profile | undefined {
  const row = db.prepare('SELECT json FROM profiles WHERE studentId = ?').get(studentId) as { json: string } | undefined;
  return row ? (JSON.parse(row.json) as Profile) : undefined;
}

export function saveProfile(p: Profile): void {
  db.prepare(
    `INSERT INTO profiles (studentId, json, createdAt) VALUES (@studentId, @json, @createdAt)
     ON CONFLICT(studentId) DO UPDATE SET json=@json`,
  ).run({ studentId: p.studentId, json: JSON.stringify(p), createdAt: p.createdAt });
}

export interface UserRow { studentId: string; salt: string; passHash: string; createdAt: string }
export function getUser(studentId: string): UserRow | undefined {
  return (db.prepare('SELECT * FROM users WHERE studentId = ?').get(studentId) as UserRow | undefined) ?? undefined;
}
export function saveUser(u: UserRow): void {
  db.prepare('INSERT INTO users (studentId, salt, passHash, createdAt) VALUES (@studentId, @salt, @passHash, @createdAt)').run(u);
}
export function listUsers(): { studentId: string }[] {
  return db.prepare('SELECT studentId FROM users').all() as { studentId: string }[];
}

export default db;
