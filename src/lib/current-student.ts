import { cookies } from 'next/headers';
import { listStudents } from './db/repository';

/**
 * 生徒用画面は「特定の一人が使う」想定のため、複数人から選ぶ画面は持たない。
 * 現在のユーザーは Cookie で識別し、未設定時は最初の生徒をデフォルトとする。
 * Cookie の切り替えは開発用デバッグ画面からのみ行える。
 */
export const CURRENT_STUDENT_COOKIE = 'kizuki_student_id';

export async function getCurrentStudentId(): Promise<string | null> {
  const store = await cookies();
  const fromCookie = store.get(CURRENT_STUDENT_COOKIE)?.value;
  if (fromCookie) return fromCookie;
  const students = listStudents();
  return students[0]?.id ?? null;
}
