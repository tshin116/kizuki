import Link from "next/link";
import { notFound } from "next/navigation";
import { MOODS } from "@/lib/conversation/constants";
import type { Mood } from "@/lib/conversation/types";
import { getStudent } from "@/lib/db/repository";

export const dynamic = "force-dynamic";

export default async function MoodSelectPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;
  const student = getStudent(studentId);
  if (!student) notFound();

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
            href={`/student/${student.id}/chat?mood=${key}`}
            className="rounded-3xl bg-white border-4 border-amber-200 p-6 text-center shadow hover:border-amber-400 hover:shadow-lg transition"
          >
            <div className="text-6xl mb-2">{MOODS[key].emoji}</div>
            <div className="text-lg font-bold text-amber-900">
              {MOODS[key].label}
            </div>
          </Link>
        ))}
      </div>

      <Link href="/student" className="text-sm text-slate-500 underline">
        もどる
      </Link>
    </main>
  );
}
