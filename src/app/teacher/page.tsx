import Link from "next/link";
import { toLocalISODate } from "@/lib/date";
import { buildTeacherDashboard } from "@/lib/teacher/view";

export const dynamic = "force-dynamic";

export default function TeacherDashboardPage() {
  const today = toLocalISODate();
  const { supportCandidates, allStudents } = buildTeacherDashboard(today);

  return (
    <main className="flex-1 w-full max-w-4xl mx-auto p-6 space-y-8 bg-white min-h-screen">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">
          先生用ダッシュボード
        </h1>
        <Link href="/" className="text-sm text-slate-500 underline">
          トップへ
        </Link>
      </header>

      <p className="text-sm text-slate-500">
        表示されるのは、生徒本人が共有を選んだ情報と、生徒本人からの相談・声かけ希望のみです。
      </p>

      {/* サポートが必要かもしれない生徒 */}
      <section>
        <h2 className="text-lg font-bold text-slate-800 mb-3">
          🔔 サポートが必要かもしれない生徒
        </h2>
        {supportCandidates.length === 0 ? (
          <p className="text-slate-500 text-sm rounded-xl bg-slate-50 p-4">
            現在、該当する生徒はいません。
          </p>
        ) : (
          <div className="space-y-3">
            {supportCandidates.map(({ student, firedRules }) => (
              <Link
                key={student.id}
                href={`/teacher/students/${student.id}`}
                className="block rounded-2xl border-2 border-rose-200 bg-rose-50 p-4 hover:border-rose-400 transition"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">
                    {student.name}{" "}
                    <span className="text-xs font-normal text-slate-500">
                      {student.grade}
                    </span>
                  </span>
                  <span className="flex flex-wrap gap-1">
                    {firedRules.map((r) => (
                      <span
                        key={r.id}
                        className="rounded-full bg-rose-200 text-rose-900 text-xs px-3 py-1"
                      >
                        {r.label}
                      </span>
                    ))}
                  </span>
                </div>
                <ul className="mt-2 text-sm text-slate-600 list-disc list-inside">
                  {firedRules.map((r) => (
                    <li key={r.id}>{r.detail}</li>
                  ))}
                </ul>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* 全生徒 */}
      <section>
        <h2 className="text-lg font-bold text-slate-800 mb-3">
          👥 クラスの生徒（直近14日の気持ち）
        </h2>
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-4 py-2">名前</th>
                <th className="text-left px-4 py-2">気持ちの記録</th>
                <th className="text-left px-4 py-2">最終記録</th>
                <th className="px-2 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {allStudents.map(
                ({ student, moodStrip, lastSharedEntryDate, firedRules }) => (
                  <tr key={student.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">
                      {firedRules.length > 0 && (
                        <span title="サポート候補" className="mr-1">
                          🔔
                        </span>
                      )}
                      {student.name}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-0.5">
                        {moodStrip.map((d) => (
                          <span
                            key={d.date}
                            title={d.date}
                            className="w-6 text-center"
                          >
                            {d.emoji ?? "・"}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {lastSharedEntryDate ?? "—"}
                    </td>
                    <td className="px-2 py-3">
                      <Link
                        href={`/teacher/students/${student.id}`}
                        className="text-sky-600 underline whitespace-nowrap"
                      >
                        詳細
                      </Link>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
