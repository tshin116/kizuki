import Link from "next/link";
import { listStudents } from "@/lib/db/repository";

export const dynamic = "force-dynamic";

export default function StudentSelectPage() {
  const students = listStudents();

  return (
    <main className="flex-1 flex flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-2xl font-bold text-amber-900">
        じぶんの名まえをえらんでね
      </h1>
      {students.length === 0 && (
        <p className="text-slate-600">
          生徒が登録されていません。<code>npm run seed</code>{" "}
          でデモデータを投入してください。
        </p>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 w-full max-w-2xl">
        {students.map((s) => (
          <Link
            key={s.id}
            href={`/student/${s.id}`}
            className="rounded-3xl bg-white border-4 border-amber-200 p-6 text-center shadow hover:border-amber-400 transition"
          >
            <div className="text-4xl mb-1">🧒</div>
            <div className="text-lg font-bold text-amber-900">{s.name}</div>
            <div className="text-xs text-slate-500">{s.grade}</div>
          </Link>
        ))}
      </div>
      <Link href="/" className="text-sm text-slate-500 underline">
        もどる
      </Link>
    </main>
  );
}
