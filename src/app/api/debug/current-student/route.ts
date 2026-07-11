import { NextResponse } from 'next/server';
import { isDebugEnabled } from '@/lib/debug';
import { CURRENT_STUDENT_COOKIE } from '@/lib/current-student';
import { getStudent } from '@/lib/db/repository';

/**
 * 開発用モード専用：生徒用画面の「現在のユーザー」を切り替える。
 * 通常のアプリ操作からは呼び出されない（本番では isDebugEnabled() で無効化）。
 */
export async function POST(req: Request) {
  if (!isDebugEnabled()) {
    return NextResponse.json({ error: 'debug_disabled' }, { status: 403 });
  }

  let body: { studentId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!body.studentId || !getStudent(body.studentId)) {
    return NextResponse.json({ error: 'unknown_student' }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(CURRENT_STUDENT_COOKIE, body.studentId, {
    path: '/',
    sameSite: 'lax',
  });
  return res;
}
