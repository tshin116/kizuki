import { randomUUID } from 'node:crypto';
import { getDb } from './index';
import type {
  Category,
  ConversationDebugInfo,
  ConversationMessage,
  DetectedKeyword,
  Mood,
  QuestionType,
  ShareScope,
  SummaryFacts,
} from '../conversation/types';

export interface Student {
  id: string;
  name: string;
  grade: string;
}

export interface EntryDebugInfo {
  /** 会話中に通った分岐（各ターンのデバッグ情報） */
  turns: ConversationDebugInfo[];
  /** 質問の通過順 */
  questionPath: QuestionType[];
  /** 相談質問へ遷移した理由 */
  consultationTrigger: string | null;
  /** 要約に使用した事実 */
  facts: SummaryFacts | null;
}

export interface Entry {
  id: string;
  studentId: string;
  date: string;
  mood: Mood;
  shareScope: ShareScope;
  wantsConsultation: boolean;
  consultationTarget: string | null;
  wantsTeacherVoice: boolean;
  summary: string;
  categories: Category[];
  detectedKeywords: DetectedKeyword[];
  debugInfo: EntryDebugInfo;
  createdAt: string;
  messages?: ConversationMessage[];
}

interface EntryRow {
  id: string;
  student_id: string;
  date: string;
  mood: string;
  share_scope: string;
  wants_consultation: number;
  consultation_target: string | null;
  wants_teacher_voice: number;
  summary: string;
  categories: string;
  detected_keywords: string;
  debug_info: string;
  created_at: string;
}

interface MessageRow {
  role: string;
  content: string;
  question_type: string | null;
  via_choice: number;
}

function rowToEntry(row: EntryRow): Entry {
  return {
    id: row.id,
    studentId: row.student_id,
    date: row.date,
    mood: row.mood as Mood,
    shareScope: row.share_scope as ShareScope,
    wantsConsultation: row.wants_consultation === 1,
    consultationTarget: row.consultation_target,
    wantsTeacherVoice: row.wants_teacher_voice === 1,
    summary: row.summary,
    categories: JSON.parse(row.categories),
    detectedKeywords: JSON.parse(row.detected_keywords),
    debugInfo: JSON.parse(row.debug_info),
    createdAt: row.created_at,
  };
}

export function listStudents(): Student[] {
  return getDb()
    .prepare('SELECT id, name, grade FROM students ORDER BY name')
    .all() as Student[];
}

export function getStudent(id: string): Student | null {
  const row = getDb()
    .prepare('SELECT id, name, grade FROM students WHERE id = ?')
    .get(id) as Student | undefined;
  return row ?? null;
}

export function insertStudent(student: Student): void {
  getDb()
    .prepare('INSERT OR REPLACE INTO students (id, name, grade) VALUES (?, ?, ?)')
    .run(student.id, student.name, student.grade);
}

export interface NewEntry {
  studentId: string;
  date: string;
  mood: Mood;
  shareScope: ShareScope;
  wantsConsultation: boolean;
  consultationTarget: string | null;
  wantsTeacherVoice: boolean;
  summary: string;
  categories: Category[];
  detectedKeywords: DetectedKeyword[];
  debugInfo: EntryDebugInfo;
  messages: ConversationMessage[];
  createdAt?: string;
}

export function insertEntry(entry: NewEntry): string {
  const db = getDb();
  const id = randomUUID();
  const createdAt = entry.createdAt ?? new Date().toISOString();

  const insert = db.transaction(() => {
    db.prepare(
      `INSERT INTO entries
        (id, student_id, date, mood, share_scope, wants_consultation,
         consultation_target, wants_teacher_voice, summary, categories,
         detected_keywords, debug_info, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      entry.studentId,
      entry.date,
      entry.mood,
      entry.shareScope,
      entry.wantsConsultation ? 1 : 0,
      entry.consultationTarget,
      entry.wantsTeacherVoice ? 1 : 0,
      entry.summary,
      JSON.stringify(entry.categories),
      JSON.stringify(entry.detectedKeywords),
      JSON.stringify(entry.debugInfo),
      createdAt,
    );

    const stmt = db.prepare(
      `INSERT INTO messages (entry_id, seq, role, content, question_type, via_choice)
       VALUES (?, ?, ?, ?, ?, ?)`,
    );
    entry.messages.forEach((m, i) => {
      stmt.run(id, i, m.role, m.content, m.questionType ?? null, m.viaChoice ? 1 : 0);
    });
  });
  insert();
  return id;
}

export function getEntryMessages(entryId: string): ConversationMessage[] {
  const rows = getDb()
    .prepare(
      'SELECT role, content, question_type, via_choice FROM messages WHERE entry_id = ? ORDER BY seq',
    )
    .all(entryId) as MessageRow[];
  return rows.map((r) => ({
    role: r.role as 'character' | 'student',
    content: r.content,
    questionType: (r.question_type ?? undefined) as QuestionType | undefined,
    viaChoice: r.via_choice === 1,
  }));
}

export function listEntriesByStudent(studentId: string): Entry[] {
  const rows = getDb()
    .prepare(
      'SELECT * FROM entries WHERE student_id = ? ORDER BY date ASC, created_at ASC',
    )
    .all(studentId) as EntryRow[];
  return rows.map(rowToEntry);
}

export function listAllEntries(): Entry[] {
  const rows = getDb()
    .prepare('SELECT * FROM entries ORDER BY date DESC, created_at DESC')
    .all() as EntryRow[];
  return rows.map(rowToEntry);
}

export function clearAll(): void {
  const db = getDb();
  db.exec('DELETE FROM messages; DELETE FROM entries; DELETE FROM students;');
}
