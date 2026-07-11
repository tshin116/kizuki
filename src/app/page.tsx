import Link from "next/link";
import { getConversationMode } from "@/lib/conversation";
import { isDebugEnabled } from "@/lib/debug";

export const dynamic = "force-dynamic";

export default function Home() {
  const mode = getConversationMode();
  const debug = isDebugEnabled();

  return (
    <main className="flex-1 flex flex-col items-center justify-center gap-8 p-6">
      <div className="text-center">
        <div className="text-6xl mb-3">🐻</div>
        <h1 className="text-3xl font-bold text-amber-900">kizuki</h1>
        <p className="mt-2 text-amber-800">
          まいにちの気もちを、くまくんとお話ししながら記録しよう
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-xl">
        <Link
          href="/student"
          className="flex-1 rounded-3xl bg-white border-4 border-amber-300 p-8 text-center shadow hover:shadow-lg transition"
        >
          <div className="text-5xl mb-2">😊</div>
          <div className="text-xl font-bold text-amber-900">
            きろくする（生徒用）
          </div>
        </Link>
        <Link
          href="/teacher"
          className="flex-1 rounded-3xl bg-white border-4 border-slate-300 p-8 text-center shadow hover:shadow-lg transition"
        >
          <div className="text-5xl mb-2">📋</div>
          <div className="text-xl font-bold text-slate-700">先生用</div>
        </Link>
      </div>

      <div className="text-xs text-slate-500 text-center">
        <p>
          会話モード:{" "}
          {mode === "rule" ? "ルールベース (Phase 1)" : "生成AI (Phase 2)"}
        </p>
        {debug && (
          <p className="mt-1">
            開発用モード有効 —{" "}
            <Link href="/debug" className="underline">
              デバッグ画面
            </Link>
          </p>
        )}
      </div>
    </main>
  );
}
