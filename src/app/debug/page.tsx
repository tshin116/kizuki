import Link from "next/link";
import { CATEGORY_LABELS, MOODS, SHARE_SCOPE_LABELS } from "@/lib/conversation/constants";
import { isDebugEnabled } from "@/lib/debug";
import {
  getEntryMessages,
  getStudent,
  listAllEntries,
} from "@/lib/db/repository";
import { toTeacherEntryView } from "@/lib/teacher/view";

export const dynamic = "force-dynamic";

/**
 * 開発用モード専用のデバッグ画面。
 * 各記録について、内部的な判定（キーワード・カテゴリー・分岐・非共有情報）と、
 * 先生画面に実際に表示される内容を比較できる。
 */
export default function DebugPage() {
  if (!isDebugEnabled()) {
    return (
      <main className="flex-1 flex items-center justify-center p-6">
        <p className="text-slate-600">
          デバッグ画面は開発用モードでのみ利用できます（DEBUG_MODE=true）。
        </p>
      </main>
    );
  }

  const entries = listAllEntries();

  return (
    <main className="flex-1 w-full max-w-5xl mx-auto p-6 space-y-6 bg-slate-900 text-slate-100 min-h-screen">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">🔧 開発用デバッグ画面</h1>
        <Link href="/" className="text-sm text-slate-400 underline">
          トップへ
        </Link>
      </header>
      <p className="text-sm text-slate-400">
        全記録の内部情報（非共有を含む）と、先生側に実際に表示される内容の比較。
        この画面は通常の生徒画面・先生画面には存在しません。
      </p>

      {entries.map((entry) => {
        const teacherView = toTeacherEntryView(entry);
        const messages = getEntryMessages(entry.id);
        const student = getStudent(entry.studentId);
        return (
          <article
            key={entry.id}
            className="rounded-2xl border border-slate-700 bg-slate-800 p-4 space-y-3 text-sm"
          >
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-bold">{student?.name}</span>
              <span>{entry.date}</span>
              <span>
                {MOODS[entry.mood].emoji} {MOODS[entry.mood].label}
              </span>
              <span className="rounded-full bg-slate-700 px-3 py-0.5 text-xs">
                共有範囲: {SHARE_SCOPE_LABELS[entry.shareScope]}
              </span>
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              {/* 内部情報 */}
              <div className="rounded-xl bg-slate-900 p-3 space-y-2">
                <h3 className="font-bold text-amber-400">内部情報（全て）</h3>
                <p>
                  <span className="text-slate-400">質問の通過順: </span>
                  {entry.debugInfo.questionPath?.join(" → ") || "—"}
                </p>
                <p>
                  <span className="text-slate-400">相談への遷移理由: </span>
                  {entry.debugInfo.consultationTrigger ?? "—"}
                </p>
                {entry.debugInfo.turns?.length > 0 && (
                  <div>
                    <span className="text-slate-400">通った分岐: </span>
                    {entry.debugInfo.turns.map((t) => t.branch).join(", ")}
                  </div>
                )}
                <p>
                  <span className="text-slate-400">検出カテゴリー: </span>
                  {entry.categories.length > 0
                    ? entry.categories
                        .map((c) => `${c}（${CATEGORY_LABELS[c]}）`)
                        .join(", ")
                    : "—"}
                </p>
                <p>
                  <span className="text-slate-400">検出キーワード: </span>
                  {entry.detectedKeywords.length > 0
                    ? entry.detectedKeywords
                        .map((k) => `「${k.keyword}」→${k.category}`)
                        .join(", ")
                    : "—"}
                </p>
                <p>
                  <span className="text-slate-400">要約（内部保存値）: </span>
                  {entry.summary}
                </p>
                <p>
                  <span className="text-slate-400">相談希望: </span>
                  {entry.wantsConsultation
                    ? `あり（${entry.consultationTarget}）`
                    : "なし"}
                  {" / 声かけ希望: "}
                  {entry.wantsTeacherVoice ? "あり" : "なし"}
                </p>
                <details>
                  <summary className="cursor-pointer text-slate-400">
                    会話全文
                  </summary>
                  <div className="mt-1 space-y-0.5">
                    {messages.map((m, i) => (
                      <p key={i}>
                        {m.role === "character" ? "🐻" : "🧒"} {m.content}
                        {m.questionType && (
                          <span className="text-slate-500">
                            {" "}
                            [{m.questionType}
                            {m.viaChoice ? "/choice" : ""}]
                          </span>
                        )}
                      </p>
                    ))}
                  </div>
                </details>
              </div>

              {/* 先生に見える情報 */}
              <div className="rounded-xl bg-slate-900 p-3 space-y-2">
                <h3 className="font-bold text-sky-400">
                  先生画面に表示される内容
                </h3>
                {teacherView === null ? (
                  <p className="text-slate-500">
                    （何も表示されません — 非共有）
                  </p>
                ) : (
                  <>
                    <p>
                      <span className="text-slate-400">気持ち: </span>
                      {teacherView.mood
                        ? `${teacherView.mood.emoji} ${teacherView.mood.label}`
                        : "表示されない"}
                    </p>
                    <p>
                      <span className="text-slate-400">要約: </span>
                      {teacherView.summary ?? "表示されない"}
                    </p>
                    <p>
                      <span className="text-slate-400">カテゴリー: </span>
                      {teacherView.categoryLabels
                        ? teacherView.categoryLabels.join(", ") || "（なし）"
                        : "表示されない"}
                    </p>
                    <p>
                      <span className="text-slate-400">会話全文: </span>
                      {teacherView.messages ? "表示される" : "表示されない"}
                    </p>
                    {(teacherView.wantsConsultationToStaff ||
                      teacherView.wantsTeacherVoice) && (
                      <p className="text-amber-300">
                        {teacherView.wantsConsultationToStaff &&
                          `相談希望（${teacherView.consultationTarget}）が表示される `}
                        {teacherView.wantsTeacherVoice &&
                          "声かけ希望が表示される"}
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          </article>
        );
      })}
    </main>
  );
}
