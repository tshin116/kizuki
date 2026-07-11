import Link from "next/link";
import { notFound } from "next/navigation";
import { SHARE_SCOPE_LABELS } from "@/lib/conversation/constants";
import { toLocalISODate } from "@/lib/date";
import { getStudent, listEntriesByStudent } from "@/lib/db/repository";
import {
  buildTeacherStudentSummary,
  toTeacherEntryView,
} from "@/lib/teacher/view";

export const dynamic = "force-dynamic";

export default async function TeacherStudentDetailPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;
  const student = getStudent(studentId);
  if (!student) notFound();

  const today = toLocalISODate();
  const { firedRules } = buildTeacherStudentSummary(student, today);

  // 共有範囲に基づき、先生に見せてよい形へ変換（none は除外される）
  const entryViews = listEntriesByStudent(studentId)
    .map(toTeacherEntryView)
    .filter((v) => v !== null)
    .reverse();

  return (
    <main className="flex-1 w-full max-w-3xl mx-auto p-6 space-y-6 bg-white min-h-screen">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">
          {student.name}{" "}
          <span className="text-sm font-normal text-slate-500">
            {student.grade}
          </span>
        </h1>
        <Link href="/teacher" className="text-sm text-slate-500 underline">
          ダッシュボードへ
        </Link>
      </header>

      {firedRules.length > 0 && (
        <section className="rounded-2xl border-2 border-rose-200 bg-rose-50 p-4">
          <h2 className="font-bold text-rose-900 mb-2">気になるサイン</h2>
          <ul className="text-sm text-slate-700 list-disc list-inside space-y-1">
            {firedRules.map((r) => (
              <li key={r.id}>{r.detail}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-4">
        <h2 className="text-lg font-bold text-slate-800">共有された記録</h2>
        {entryViews.length === 0 && (
          <p className="text-sm text-slate-500 rounded-xl bg-slate-50 p-4">
            共有された記録はありません。
          </p>
        )}
        {entryViews.map((v) => (
          <article
            key={v.id}
            className="rounded-2xl border border-slate-200 p-4 space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="font-medium text-slate-800">
                {v.date}{" "}
                {v.mood ? (
                  <span className="text-xl">{v.mood.emoji}</span>
                ) : null}
                {v.mood && (
                  <span className="text-sm text-slate-500 ml-1">
                    {v.mood.label}
                  </span>
                )}
              </div>
              <span className="text-xs rounded-full bg-slate-100 text-slate-500 px-3 py-1">
                {SHARE_SCOPE_LABELS[v.shareScope]}
              </span>
            </div>

            {(v.wantsConsultationToStaff || v.wantsTeacherVoice) && (
              <div className="text-sm rounded-xl bg-amber-50 border border-amber-200 p-3 text-amber-900">
                {v.wantsConsultationToStaff && (
                  <p>
                    🙋 本人が「{v.consultationTarget}」への相談を希望しています
                  </p>
                )}
                {v.wantsTeacherVoice && (
                  <p>💬 本人が先生からの声かけを希望しています</p>
                )}
              </div>
            )}

            {v.summary && (
              <p className="text-sm text-slate-700 bg-slate-50 rounded-xl p-3">
                {v.summary}
              </p>
            )}

            {v.categoryLabels && v.categoryLabels.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {v.categoryLabels.map((c) => (
                  <span
                    key={c}
                    className="text-xs rounded-full bg-sky-100 text-sky-800 px-3 py-1"
                  >
                    参考: {c}
                  </span>
                ))}
              </div>
            )}

            {v.messages && (
              <details className="text-sm">
                <summary className="cursor-pointer text-slate-500">
                  会話の全文を見る（本人が共有を選択）
                </summary>
                <div className="mt-2 space-y-1">
                  {v.messages
                    .filter((m) => m.questionType !== "mood_select")
                    .map((m, i) => (
                      <p key={i} className="text-slate-700">
                        <span className="font-medium">
                          {m.role === "character" ? "🐻" : "🧒"}
                        </span>{" "}
                        {m.content}
                      </p>
                    ))}
                </div>
              </details>
            )}
          </article>
        ))}
      </section>

      <p className="text-xs text-slate-400">
        ※ 生徒が共有を選んでいない記録は、この画面には表示されません。
      </p>
    </main>
  );
}
