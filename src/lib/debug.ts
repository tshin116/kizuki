/**
 * 開発用デバッグモードの判定。
 * 有効な場合のみ、内部的なキーワード判定・分岐・非共有情報の確認画面を提供する。
 * 通常の生徒画面・先生画面には内部情報を表示しない。
 */
export function isDebugEnabled(): boolean {
  return (
    process.env.DEBUG_MODE === 'true' ||
    process.env.NODE_ENV === 'development'
  );
}
