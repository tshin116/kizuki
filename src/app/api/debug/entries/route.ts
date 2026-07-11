import { NextResponse } from 'next/server';
import { isDebugEnabled } from '@/lib/debug';
import {
  getEntryMessages,
  getStudent,
  listAllEntries,
} from '@/lib/db/repository';
import { toTeacherEntryView } from '@/lib/teacher/view';

/**
 * 開発用モード専用：全記録の内部情報（非共有情報を含む）と、
 * 先生に実際に表示される内容の比較を返す。
 */
export async function GET() {
  if (!isDebugEnabled()) {
    return NextResponse.json({ error: 'debug_disabled' }, { status: 403 });
  }

  const entries = listAllEntries().map((entry) => ({
    ...entry,
    studentName: getStudent(entry.studentId)?.name ?? entry.studentId,
    messages: getEntryMessages(entry.id),
    /** 先生画面に実際に表示される内容（null = 何も表示されない） */
    teacherView: toTeacherEntryView(entry),
  }));

  return NextResponse.json({ entries });
}
