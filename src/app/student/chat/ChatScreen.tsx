"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  CHARACTER_IMAGES,
  CHARACTER_NAME,
  MOODS,
  SCHOOL_STAFF_TARGETS,
  SHARE_SCOPE_LABELS,
} from "@/lib/conversation/constants";
import type {
  ConversationDebugInfo,
  ConversationMessage,
  ConversationResponse,
  Mood,
  ShareScope,
} from "@/lib/conversation/types";

const ERROR_MESSAGE = `${CHARACTER_NAME}が少し考え中みたい。もう一度ためしてみよう。`;
const INPUT_MAX_LENGTH = 200;

const SHARE_SCOPE_DESCRIPTIONS: Record<ShareScope, string> = {
  none: "今日のお話は、先生にはつたえないよ",
  mood_only: "今日の気もち（かお）だけ、先生につたわるよ",
  summary: "気もちと、お話のかんたんなまとめが先生につたわるよ",
  full: `気もちと、${CHARACTER_NAME}とのお話がぜんぶ先生につたわるよ`,
};

interface Props {
  studentId: string;
  studentName: string;
  mood: Mood;
}

type Phase = "chat" | "share" | "done";

export default function ChatScreen({ studentId, studentName, mood }: Props) {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [current, setCurrent] = useState<ConversationResponse | null>(null);
  const [textInput, setTextInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("chat");
  const [turnDebug, setTurnDebug] = useState<ConversationDebugInfo[]>([]);
  const [shareScope, setShareScope] = useState<ShareScope | null>(null);
  const [wantsTeacherVoice, setWantsTeacherVoice] = useState(false);
  const [saving, setSaving] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);

  const advance = useCallback(
    async (nextMessages: ConversationMessage[]) => {
      setLoading(true);
      setErrorText(null);
      try {
        const res = await fetch("/api/conversation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mood, messages: nextMessages }),
        });
        if (!res.ok) throw new Error("api_error");
        const data: ConversationResponse = await res.json();
        setMessages([
          ...nextMessages,
          {
            role: "character",
            content: data.reply,
            questionType: data.questionType,
          },
        ]);
        setCurrent(data);
        if (data.debug) setTurnDebug((prev) => [...prev, data.debug!]);
        if (data.isEnd) {
          setTimeout(() => setPhase("share"), 800);
        }
      } catch {
        setMessages(nextMessages);
        setErrorText(ERROR_MESSAGE);
      } finally {
        setLoading(false);
      }
    },
    [mood],
  );

  // 最初の質問を取得（気持ち選択をメッセージとして記録してから）
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    advance([
      {
        role: "student",
        content: MOODS[mood].label,
        questionType: "mood_select",
        viaChoice: true,
      },
    ]);
  }, [advance, mood]);

  const answer = (content: string, viaChoice: boolean) => {
    if (loading || !current || current.isEnd) return;
    const trimmed = content.trim();
    if (!trimmed) return;
    setTextInput("");
    advance([
      ...messages,
      {
        role: "student",
        content: trimmed.slice(0, INPUT_MAX_LENGTH),
        questionType: current.questionType,
        viaChoice,
      },
    ]);
  };

  const retry = () => {
    advance(messages);
  };

  const save = async () => {
    if (!shareScope || saving) return;
    setSaving(true);
    setErrorText(null);
    try {
      const res = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          mood,
          messages,
          shareScope,
          wantsTeacherVoice,
          turnDebug,
        }),
      });
      if (!res.ok) throw new Error("api_error");
      setPhase("done");
    } catch {
      setErrorText("うまくほぞんできなかったみたい。もう一度ためしてみよう。");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, phase, errorText]);

  const consultationTarget = [...messages]
    .reverse()
    .find(
      (m) => m.role === "student" && m.questionType === "consultation",
    )?.content;
  const targetIsStaff =
    consultationTarget !== undefined &&
    SCHOOL_STAFF_TARGETS.includes(consultationTarget);

  // 生徒が選んだ気持ちに合わせて、きづきんの表情を切り替える
  const characterImage = CHARACTER_IMAGES[mood];

  return (
    <main className="flex-1 flex flex-col max-w-2xl w-full mx-auto p-4">
      <header className="flex items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <Image
            src={characterImage}
            alt={CHARACTER_NAME}
            width={40}
            height={40}
            className="h-10 w-10 object-contain"
          />
          <span className="font-bold text-amber-900">{CHARACTER_NAME}</span>
        </div>
        <div className="flex items-center gap-1 text-sm text-slate-600">
          {studentName}さん
          <Image
            src={MOODS[mood].image}
            alt={MOODS[mood].label}
            width={28}
            height={28}
            className="h-7 w-7 object-contain"
          />
        </div>
      </header>

      {/* 会話ログ */}
      <div className="flex-1 overflow-y-auto space-y-3 py-2">
        {messages
          .filter((m) => m.questionType !== "mood_select")
          .map((m, i) =>
            m.role === "character" ? (
              <div key={i} className="flex items-start gap-2">
                <Image
                  src={characterImage}
                  alt={CHARACTER_NAME}
                  width={32}
                  height={32}
                  className="h-8 w-8 shrink-0 object-contain"
                />
                <div className="rounded-2xl rounded-tl-none bg-white border-2 border-amber-200 px-4 py-3 shadow-sm max-w-[80%]">
                  {m.content}
                </div>
              </div>
            ) : (
              <div key={i} className="flex justify-end">
                <div className="rounded-2xl rounded-tr-none bg-sky-100 border-2 border-sky-200 px-4 py-3 shadow-sm max-w-[80%]">
                  {m.content}
                </div>
              </div>
            ),
          )}

        {loading && (
          <div className="flex items-start gap-2">
            <Image
              src={characterImage}
              alt={CHARACTER_NAME}
              width={32}
              height={32}
              className="h-8 w-8 shrink-0 object-contain"
            />
            <div className="rounded-2xl bg-white border-2 border-amber-100 px-4 py-3 text-slate-400">
              …
            </div>
          </div>
        )}

        {errorText && (
          <div className="text-center space-y-2">
            <p className="text-amber-800">{errorText}</p>
            <button
              onClick={phase === "chat" ? retry : save}
              className="rounded-full bg-amber-400 px-6 py-2 font-bold text-white hover:bg-amber-500"
            >
              もう一度ためす
            </button>
          </div>
        )}

        {/* 相談をすすめる表示 */}
        {current?.suggestConsultation && phase === "chat" && (
          <p className="text-center text-xs text-slate-500">
            むりに答えなくても大丈夫だよ
          </p>
        )}

        <div ref={bottomRef} />
      </div>

      {/* 入力エリア */}
      {phase === "chat" && current && !current.isEnd && !loading && !errorText && (
        <div className="space-y-3 pt-2">
          {current.choices.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-center">
              {current.choices.map((c) => (
                <button
                  key={c}
                  onClick={() => answer(c, true)}
                  className="rounded-full bg-white border-2 border-amber-300 px-4 py-2 text-amber-900 hover:bg-amber-100 transition"
                >
                  {c}
                </button>
              ))}
            </div>
          )}
          {current.allowText && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                answer(textInput, false);
              }}
              className="flex gap-2"
            >
              <input
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                maxLength={INPUT_MAX_LENGTH}
                placeholder="じゆうに書いてもいいよ"
                className="flex-1 rounded-full border-2 border-amber-300 bg-white px-4 py-2 focus:outline-none focus:border-amber-500"
              />
              <button
                type="submit"
                disabled={!textInput.trim() || loading}
                className="rounded-full bg-amber-400 px-5 py-2 font-bold text-white disabled:opacity-40 hover:bg-amber-500"
              >
                おくる
              </button>
            </form>
          )}
        </div>
      )}

      {/* 共有範囲の選択 */}
      {phase === "share" && (
        <div className="rounded-3xl bg-white border-4 border-amber-200 p-5 space-y-4 shadow-lg">
          <h2 className="text-lg font-bold text-amber-900 text-center">
            今日のお話、先生にどこまでつたえる？
          </h2>
          <div className="space-y-2">
            {(Object.keys(SHARE_SCOPE_DESCRIPTIONS) as ShareScope[]).map(
              (scope) => (
                <button
                  key={scope}
                  onClick={() => setShareScope(scope)}
                  className={`w-full text-left rounded-2xl border-2 px-4 py-3 transition ${
                    shareScope === scope
                      ? "border-amber-500 bg-amber-100"
                      : "border-slate-200 bg-white hover:border-amber-300"
                  }`}
                >
                  <div className="font-bold text-slate-800">
                    {SHARE_SCOPE_LABELS[scope]}
                  </div>
                  <div className="text-sm text-slate-500">
                    {SHARE_SCOPE_DESCRIPTIONS[scope]}
                  </div>
                </button>
              ),
            )}
          </div>

          <label className="flex items-center gap-2 text-slate-700">
            <input
              type="checkbox"
              checked={wantsTeacherVoice}
              onChange={(e) => setWantsTeacherVoice(e.target.checked)}
              className="w-5 h-5"
            />
            先生から、こえをかけてほしい
          </label>

          {(targetIsStaff || wantsTeacherVoice) && (
            <p className="text-sm text-amber-800 bg-amber-50 rounded-xl p-3">
              {targetIsStaff &&
                `「${consultationTarget}に話したい」という気もちは、お話をつたえない場合でも先生につたわるよ。`}
              {wantsTeacherVoice &&
                "「こえをかけてほしい」という気もちも先生につたわるよ。"}
            </p>
          )}

          <button
            onClick={save}
            disabled={!shareScope || saving}
            className="w-full rounded-full bg-amber-400 py-3 font-bold text-white text-lg disabled:opacity-40 hover:bg-amber-500"
          >
            {saving ? "ほぞんしています…" : "これでほぞんする"}
          </button>
        </div>
      )}

      {/* 完了 */}
      {phase === "done" && (
        <div className="rounded-3xl bg-white border-4 border-amber-200 p-8 text-center space-y-4 shadow-lg">
          <Image
            src={CHARACTER_IMAGES.ureshii}
            alt={CHARACTER_NAME}
            width={100}
            height={100}
            className="mx-auto h-24 w-24 object-contain"
          />
          <p className="text-xl font-bold text-amber-900">きろくできたよ！</p>
          <p className="text-slate-600">また明日も、気もちをきかせてね。</p>
          <Link
            href="/student"
            className="inline-block rounded-full bg-amber-400 px-8 py-3 font-bold text-white hover:bg-amber-500"
          >
            おわる
          </Link>
        </div>
      )}

      {/* 開発用デバッグ表示（サーバーが debug を返す場合のみ描画される） */}
      {turnDebug.length > 0 && (
        <details className="mt-4 rounded-xl bg-slate-800 text-slate-100 text-xs p-3">
          <summary className="cursor-pointer font-mono">
            🔧 開発用デバッグ（分岐・検出カテゴリー）
          </summary>
          <ol className="mt-2 space-y-1 font-mono">
            {turnDebug.map((d, i) => (
              <li key={i}>
                [{i + 1}] branch={d.branch} / answered=
                {d.answeredQuestion ?? "-"} / cats=
                {d.categoriesThisTurn.join(",") || "-"} / total=
                {d.categoriesTotal.join(",") || "-"}
                {d.consultationTrigger &&
                  ` / consult=${d.consultationTrigger}`}
              </li>
            ))}
          </ol>
        </details>
      )}
    </main>
  );
}
