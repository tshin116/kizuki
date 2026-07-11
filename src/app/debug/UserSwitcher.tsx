"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Student } from "@/lib/db/repository";

interface Props {
  students: Student[];
  currentStudentId: string | null;
}

/**
 * 生徒用画面（/student）は「特定の一人が使う」端末を想定しており、
 * 通常の操作では複数人から選べない。開発用に、ここでのみユーザーを切り替える。
 */
export default function UserSwitcher({ students, currentStudentId }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);

  const switchUser = async (id: string) => {
    setPending(id);
    try {
      await fetch("/api/debug/current-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: id }),
      });
      router.refresh();
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-800 p-4 space-y-3">
      <h2 className="font-bold text-emerald-400">
        👤 生徒用画面（/student）のユーザー切り替え
      </h2>
      <p className="text-xs text-slate-400">
        生徒用画面は特定の一人が使う想定のため、通常は一覧から選べません。開発用にここで切り替えます。
      </p>
      <div className="flex flex-wrap gap-2">
        {students.map((s) => {
          const isCurrent = s.id === currentStudentId;
          return (
            <button
              key={s.id}
              onClick={() => switchUser(s.id)}
              disabled={pending !== null}
              className={`rounded-full px-4 py-2 text-sm border-2 transition disabled:opacity-50 ${
                isCurrent
                  ? "bg-emerald-600 border-emerald-400 text-white"
                  : "bg-slate-900 border-slate-600 text-slate-200 hover:border-emerald-400"
              }`}
            >
              {pending === s.id ? "切り替え中…" : `${s.name}${isCurrent ? "（現在）" : ""}`}
            </button>
          );
        })}
      </div>
    </div>
  );
}
