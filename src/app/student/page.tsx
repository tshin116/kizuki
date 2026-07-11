import Image from "next/image";
import Link from "next/link";
import { MOODS } from "@/lib/conversation/constants";
import type { Mood } from "@/lib/conversation/types";
import { getCurrentStudentId } from "@/lib/current-student";
import { getStudent } from "@/lib/db/repository";

export const dynamic = "force-dynamic";

/**
 * 生徒用画面は「特定の一人が使う」端末を想定しており、複数人から選ぶ画面は持たない。
 * どの生徒として使うかは Cookie（開発用モードでは /debug から切り替え可能）で決まる。
 */
export default async function MoodSelectPage() {
  const studentId = await getCurrentStudentId();
  const student = studentId ? getStudent(studentId) : null;

  if (!student) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-slate-600">
          生徒が登録されていません。<code>npm run seed</code>{" "}
          でデモデータを投入してください。
        </p>
        <Link href="/" className="text-sm text-slate-500 underline">
          もどる
        </Link>
      </main>
    );
  }

  const moodKeys = Object.keys(MOODS) as Mood[];

  return (
    <main className="flex-1 flex flex-col items-center justify-center gap-8 p-6">
      <div className="text-center">
        <div className="text-5xl mb-2">🐻</div>
        <h1 className="text-2xl font-bold text-amber-900">
          {student.name}さん、こんにちは！
        </h1>
        <p className="mt-2 text-lg text-amber-800">今日の気もちは、どれかな？</p>
      </div>

      <div className="grid grid-cols-2 gap-4 w-full max-w-md">
        {moodKeys.map((key) => (
          <Link
            key={key}
            href={`/student/chat?mood=${key}`}
            className="rounded-3xl bg-white border-4 border-amber-200 p-6 text-center shadow hover:border-amber-400 hover:shadow-lg transition"
          >
            <Image
              src={MOODS[key].image}
              alt={MOODS[key].label}
              width={96}
              height={96}
              className="mx-auto mb-2 h-24 w-24 object-contain"
            />
            <div className="text-lg font-bold text-amber-900">
              {MOODS[key].label}
            </div>
          </Link>
        ))}
      </div>

      <Link href="/" className="text-sm text-slate-500 underline">
        もどる
      </Link>
    </main>
  );
}
