import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  grade TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS entries (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id),
  date TEXT NOT NULL,
  mood TEXT NOT NULL,
  share_scope TEXT NOT NULL DEFAULT 'none',
  wants_consultation INTEGER NOT NULL DEFAULT 0,
  consultation_target TEXT,
  wants_teacher_voice INTEGER NOT NULL DEFAULT 0,
  summary TEXT NOT NULL DEFAULT '',
  categories TEXT NOT NULL DEFAULT '[]',
  detected_keywords TEXT NOT NULL DEFAULT '[]',
  debug_info TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_entries_student_date
  ON entries(student_id, date);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entry_id TEXT NOT NULL REFERENCES entries(id),
  seq INTEGER NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  question_type TEXT,
  via_choice INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_messages_entry ON messages(entry_id, seq);
`;

function createDb(): Database.Database {
  const dbPath =
    process.env.KIZUKI_DB_PATH ??
    path.join(process.cwd(), 'data', 'kizuki.db');
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.exec(SCHEMA);
  return db;
}

// Next.js の開発サーバーはモジュールを再読み込みするため、
// グローバルにキャッシュして接続を1つに保つ
const globalForDb = globalThis as unknown as {
  __kizukiDb?: Database.Database;
};

export function getDb(): Database.Database {
  if (!globalForDb.__kizukiDb) {
    globalForDb.__kizukiDb = createDb();
  }
  return globalForDb.__kizukiDb;
}
