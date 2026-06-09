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
CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  studentId TEXT NOT NULL,
  json TEXT NOT NULL,
  createdAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_courses_student ON courses(studentId);
CREATE TABLE IF NOT EXISTS olm (
  learnerId TEXT PRIMARY KEY,
  json TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY,
  studentId TEXT NOT NULL,
  courseId TEXT NOT NULL,
  json TEXT NOT NULL,
  createdAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_goals_student ON goals(studentId);
