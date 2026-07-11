# kizuki

小学生が毎日の気持ちをキャラクター「くまくん🐻」との会話で記録し、
本人が選んだ範囲だけを先生に共有できるアプリのプロトタイプです。

**Phase 1（ルールベース）実装済み / Phase 2（生成AI）追加準備済み** の段階です。
Phase 1 では外部の生成AI APIを一切使用しません。

## セットアップ

```bash
npm install
npm run seed     # デモ用の生徒・記録データを投入
npm run dev      # http://localhost:3000
```

その他のコマンド:

```bash
npm run build    # 本番ビルド
npm run start    # 本番サーバー
npm test         # ユニットテスト (vitest)
npm run lint     # ESLint
```

## 画面

| URL | 内容 |
| --- | --- |
| `/` | トップ（生徒用 / 先生用の選択） |
| `/student` | 4種類の気持ち選択 😊😥😐😡（「現在のユーザー」1人分。生徒を選ぶ画面はない） |
| `/student/chat` | くまくんとの会話 → 共有範囲の選択 → 保存 |
| `/teacher` | 先生用ダッシュボード（サポート候補 + 全生徒の気持ち一覧） |
| `/teacher/students/[id]` | 生徒詳細（共有された記録のみ表示） |
| `/debug` | 開発用モード専用：ユーザー切り替え、内部判定と先生表示の比較 |

### 生徒用画面は「特定の一人が使う」前提

`/student` は端末（またはブラウザ）ごとに特定の生徒が使うことを想定しており、
複数人から自分を選ぶ画面は持ちません。「今のユーザーが誰か」は Cookie
（`kizuki_student_id`）で識別し、未設定時はデモの先頭の生徒がデフォルトになります。

開発中にユーザーを切り替えたい場合は `/debug` 画面の「ユーザー切り替え」から
生徒を選ぶと、以降 `/student` はその生徒として動作します（本番では
`DEBUG_MODE=false` にしてこの切り替え自体を無効化してください）。

## ルールベース版と生成AI版の切り替え（Phase 2 準備）

`.env.local` の `CONVERSATION_MODE` で切り替えます。

```env
CONVERSATION_MODE=rule   # Phase 1: ルールベース（既定）
CONVERSATION_MODE=ai     # Phase 2: 生成AI（現在はモック。ルールベースへ委譲）
```

両モードは共通インターフェース `ConversationService`
（`src/lib/conversation/types.ts`）を実装しており、UI・APIルートは
モードに依存しません。

```
getNextResponse(context)      # 次の返答・質問・選択肢
createSummary(messages)       # 会話の要約
analyzeConversation(messages) # キーワード検出・参考カテゴリー・要約
```

- `src/lib/conversation/rule-based-service.ts` — Phase 1 実装
- `src/lib/conversation/ai-service.ts` — Phase 2 実装（モック。API キー未設定時・エラー時はルールベースへフォールバック）
- `src/lib/conversation/index.ts` — 環境変数によるファクトリ
- `src/lib/conversation/prompts/child-support-system-prompt.ts` — システムプロンプト（UI から分離）
- `src/lib/conversation/ai-schema.ts` — AI 出力の JSON スキーマ検証・禁止表現チェック・安全な固定メッセージ

### 環境変数

```env
CONVERSATION_MODE=rule  # rule / ai
AI_API_KEY=             # Phase 2 で設定（サーバー側のみで使用。ブラウザへ公開しない）
AI_MODEL=               # Phase 2 で使用するモデル名
DEBUG_MODE=true         # 開発用デバッグ表示（本番では false にする）
# KIZUKI_DB_PATH=       # SQLite の保存先（省略時 ./data/kizuki.db）
```

APIキーはサーバー側のAPIルート（`src/app/api/*`）内でのみ参照します。
`NEXT_PUBLIC_` プレフィックスを付けないため、ブラウザには公開されません。

## アーキテクチャ

```
src/
  lib/
    conversation/   # 会話エンジン（ルールベース / AI 切り替え）
      constants.ts    # 質問文・選択肢・カテゴリー定義
      keywords.ts     # キーワード検出（部分一致・表記揺れ対応）
      analyzer.ts     # テンプレート要約 + 参考カテゴリー抽出
      rule-based-service.ts
      ai-service.ts   # Phase 2 モック
      ai-schema.ts    # Phase 2 出力検証
      prompts/
    support/        # サポート候補判定（SUPPORT_RULES で条件を一元管理）
    teacher/        # 共有範囲に基づく先生向け表示のフィルタリング
    db/             # SQLite（better-sqlite3）
    current-student.ts  # 「現在のユーザー」の Cookie 解決
  app/
    api/conversation      # 会話を1往復進める
    api/entries           # 記録の保存（要約・検出はサーバー側で実行）
    api/debug/entries      # 開発用モード専用
    api/debug/current-student # 開発用モード専用：ユーザー切り替え
    student/ teacher/ debug/
```

### 共有範囲（生徒本人が選択）

| 範囲 | 先生に表示される内容 |
| --- | --- |
| 先生には伝えない | 何も表示されない（記録の存在も非表示） |
| 気持ちだけ伝える | 気持ちの絵文字のみ |
| 気持ちとまとめを伝える | 気持ち + テンプレート要約 + 参考カテゴリー |
| お話をぜんぶ伝える | 上記 + 会話の全文 |

例外として、生徒本人が「先生に相談したい」「声をかけてほしい」を選んだ場合、
その希望自体は共有範囲によらず先生に伝わります（生徒の画面にも明示されます）。

サポート候補の判定にも「先生に共有された情報」のみを使用します。
非共有の記録は判定に使われません（開発用デバッグ画面でのみ差分を確認できます）。

### サポート候補の判定ルール

`src/lib/support/rules.ts` の `SUPPORT_RULES` で数値を一元管理しています。

- 😥😡が3日以上連続
- 過去7日間で😥😡が4日以上
- 生徒本人が先生への相談を希望
- 生徒本人が先生からの声かけを希望
- 共有された会話から気になるカテゴリーを検出
- 継続していた記録が3日以上途切れた

## 開発用デバッグ

`DEBUG_MODE=true`（または開発サーバー）のとき:

- `/debug` — 「生徒用画面のユーザー切り替え」+ 全記録の内部情報（質問の通過順・分岐・検出キーワード・カテゴリー・相談遷移理由・非共有情報）と、先生画面に実際に表示される内容の比較
- 生徒チャット画面下部 — 各ターンの分岐・検出カテゴリー
- `/api/conversation` のレスポンスに `debug` フィールドが付与

通常の生徒画面・先生画面には内部的な判定・スコアは表示されません。

## Phase 2 で行うこと

1. `AIConversationService` に生成AI API呼び出しを実装
   （タイムアウト・再試行・ルールベースへのフォールバック・
   `validateAiOutput` によるスキーマ/禁止表現検証）
2. `.env.local` に `AI_API_KEY` / `AI_MODEL` を設定し `CONVERSATION_MODE=ai` へ
3. 最大会話回数・終了条件・共有範囲・アクセス制御・ログ保存は
   引き続きアプリ側（APIルート + `teacher/view.ts`）が管理し、AIに委ねない
